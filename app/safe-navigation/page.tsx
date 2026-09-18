"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";

const SafeNavigationMap = dynamic(
  () => import("@/components/navigation/SafeNavigationMap"),
  { ssr: false }
);

type LatLng = [number, number];
type WakeLockSentinelLike = {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (
    type: "release",
    listener: () => void
  ) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (
      type: "screen"
    ) => Promise<WakeLockSentinelLike>;
  };
};

type RouteOption = {
  index?: number;
  label?: string | null;
  provider?: string | null;
  distanceMeters?: number;
  duration?: string | null;
  durationSeconds?: number;
  trafficDelaySeconds?: number;
  safetyScore?: number;
  riskScore?: number;
  matchedRiskSegmentCount?: number;
  routePoints?: LatLng[];
};

type NavigationSearchResult = {
  id: string | null;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  resultType: string | null;
  categories: string[];
};

type NavigationInstruction = {
  sectionIndex?: number;
  instructionIndex?: number;
  text?: string | null;
  action?: string | null;
  direction?: string | null;
  length?: number;
  duration?: number;
  offset?: number;
  routeOffsetMeters?: number;
};

type NavigationAction = {
  sectionIndex?: number;
  actionIndex?: number;
  action?: string | null;
  direction?: string | null;
  severity?: string | null;
  instruction?: string | null;
  length?: number;
  duration?: number;
  offset?: number;
  routeOffsetMeters?: number;
  exitSign?: unknown;
};

type GuidedRoute = RouteOption & {
  navigationInstructions?:
    NavigationInstruction[];
  navigationActions?:
    NavigationAction[];
};

function instructionsForRoute(
  route: RouteOption | null | undefined
): NavigationInstruction[] {
  if (!route) {
    return [];
  }

  const guidedRoute =
    route as GuidedRoute;

  if (
    Array.isArray(
      guidedRoute.navigationInstructions
    ) &&
    guidedRoute.navigationInstructions.length > 0
  ) {
    return guidedRoute.navigationInstructions;
  }

  if (
    Array.isArray(
      guidedRoute.navigationActions
    )
  ) {
    return guidedRoute.navigationActions.map(
      (action) => ({
        text:
          action.instruction ??
          null,
        action:
          action.action ??
          null,
        direction:
          action.direction ??
          null,
        length:
          Number(
            action.length || 0
          ),
        duration:
          Number(
            action.duration || 0
          ),
        offset:
          Number(
            action.offset || 0
          ),
        routeOffsetMeters:
          Number(
            action.routeOffsetMeters ??
              action.offset ??
              0
          ),
      })
    );
  }

  return [];
}
type RerouteResponse = {
  success?: boolean;
  routingProfile?: string;
  routes?: RouteOption[];
  recommendedRoute?: RouteOption | null;
  recommendation?: string | null;
  error?: string;
};

type PositionState = {
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
};

function validCoordinate(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function durationLabel(route: RouteOption | null) {
  if (!route) return "--";

  if (route.durationSeconds != null) {
    return `${Math.max(1, Math.round(route.durationSeconds / 60))} min`;
  }

  if (route.duration) {
    const seconds = Number(route.duration.replace("s", ""));

    if (Number.isFinite(seconds)) {
      return `${Math.max(1, Math.round(seconds / 60))} min`;
    }

    return route.duration;
  }

  return "--";
}

function distanceLabel(route: RouteOption | null) {
  if (!route?.distanceMeters) return "--";

  return `${(route.distanceMeters / 1000).toFixed(1)} km`;
}

const VOICE_APPROACH_METERS = 500;
const VOICE_NEAR_METERS = 150;

function voiceDistancePhrase(
  distanceMeters: number
): string {
  const safeDistance =
    Math.max(
      0,
      Number(distanceMeters) || 0
    );

  if (safeDistance < 100) {
    const rounded =
      Math.max(
        10,
        Math.round(
          safeDistance / 10
        ) * 10
      );

    return `${rounded} meters`;
  }

  const rounded =
    Math.max(
      50,
      Math.round(
        safeDistance / 50
      ) * 50
    );

  return `${rounded} meters`;
}

function navigationVoiceText(
  instruction:
    NavigationInstruction | null
): string {
  if (!instruction) {
    return "";
  }

  const raw =
    instruction.text?.trim() ||
    [
      instruction.action,
      instruction.direction,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const AUTO_REROUTE_OFF_ROUTE_THRESHOLD = 45;
const AUTO_REROUTE_ACCURACY_MULTIPLIER = 1.5;
const AUTO_REROUTE_SUSTAINED_MS = 4000;
const AUTO_REROUTE_COOLDOWN_MS = 15000;
type RouteProgressState = {
  progressMeters: number;
  distanceFromRouteMeters: number;
};

function navigationDistanceMeters(
  first: LatLng,
  second: LatLng
): number {
  const radius = 6371000;
  const lat1 = (first[0] * Math.PI) / 180;
  const lat2 = (second[0] * Math.PI) / 180;
  const dLat =
    ((second[0] - first[0]) * Math.PI) / 180;
  const dLng =
    ((second[1] - first[1]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return (
    radius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function calculateRouteProgress(
  position: LatLng,
  points: LatLng[]
): RouteProgressState | null {
  if (points.length < 2) {
    return null;
  }

  const radius = 6371000;
  const referenceLat =
    (position[0] * Math.PI) / 180;

  let accumulatedMeters = 0;
  let bestDistanceMeters =
    Number.POSITIVE_INFINITY;
  let bestProgressMeters = 0;

  const localPoint =
    (point: LatLng): [number, number] => [
      radius *
        (((point[1] - position[1]) *
          Math.PI) /
          180) *
        Math.cos(referenceLat),
      radius *
        (((point[0] - position[0]) *
          Math.PI) /
          180),
    ];

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const start = points[index];
    const end = points[index + 1];

    const [startX, startY] =
      localPoint(start);

    const [endX, endY] =
      localPoint(end);

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const lengthSquared =
      deltaX * deltaX +
      deltaY * deltaY;

    const projection =
      lengthSquared > 0
        ? Math.max(
            0,
            Math.min(
              1,
              -(
                startX * deltaX +
                startY * deltaY
              ) / lengthSquared
            )
          )
        : 0;

    const nearestX =
      startX + projection * deltaX;

    const nearestY =
      startY + projection * deltaY;

    const perpendicularDistance =
      Math.sqrt(
        nearestX * nearestX +
          nearestY * nearestY
      );

    const segmentMeters =
      navigationDistanceMeters(
        start,
        end
      );

    if (
      perpendicularDistance <
      bestDistanceMeters
    ) {
      bestDistanceMeters =
        perpendicularDistance;

      bestProgressMeters =
        accumulatedMeters +
        segmentMeters * projection;
    }

    accumulatedMeters +=
      segmentMeters;
  }

  return {
    progressMeters: bestProgressMeters,
    distanceFromRouteMeters:
      bestDistanceMeters,
  };
}

export default function SafeNavigationPage() {
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef =
    useRef<WakeLockSentinelLike | null>(null);

  const wakeLockRequestIdRef =
    useRef(0);

  const offRouteStartedAtRef =
    useRef<number | null>(null);

  const lastAutoRerouteAtRef =
    useRef(0);

  const autoRerouteInFlightRef =
    useRef(false);

  const offRouteTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestNavigationPositionRef =
    useRef<PositionState | null>(null);

  const latestNavigationRoutePointsRef =
    useRef<LatLng[]>([]);

  const [autoRerouteActive, setAutoRerouteActive] =
    useState(false);

  const [autoRerouteMessage, setAutoRerouteMessage] =
    useState("");
  const lastSpokenAnnouncementRef =
    useRef<Set<string>>(new Set());

  const [voiceEnabled, setVoiceEnabled] =
    useState(false);

  const [
    voiceStatusMessage,
    setVoiceStatusMessage,
  ] =
    useState("Voice guidance off");
  const simulatorTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const simulatorPointsRef =
    useRef<LatLng[]>([]);

  const simulatorIndexRef =
    useRef(0);

  const [simulatorRunning, setSimulatorRunning] =
    useState(false);

  const [simulatorMessage, setSimulatorMessage] =
    useState("Simulator ready");

  const simulatorEnabled =
    process.env.NODE_ENV === "development";

  const [position, setPosition] =
    useState<PositionState | null>(null);

  const [gpsActive, setGpsActive] = useState(false);
  const [gpsMessage, setGpsMessage] =
    useState("GPS is off");

  const [destinationLat, setDestinationLat] = useState("");
  const [destinationLng, setDestinationLng] = useState("");
  const [destinationName, setDestinationName] =
    useState("Destination");

  const [
    destinationResults,
    setDestinationResults,
  ] =
    useState<NavigationSearchResult[]>([]);

  const [
    destinationSearching,
    setDestinationSearching,
  ] =
    useState(false);

  const [
    selectedDestination,
    setSelectedDestination,
  ] =
    useState<NavigationSearchResult | null>(
      null
    );

  const [
    navigationInstructions,
    setNavigationInstructions,
  ] =
    useState<NavigationInstruction[]>([]);
  const [routingProfile, setRoutingProfile] =
    useState("safest");

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] =
    useState(0);
  const [recommendation, setRecommendation] =
    useState<string | null>(null);
  const [routingMessage, setRoutingMessage] =
    useState("Start GPS and enter a destination.");
  const [routing, setRouting] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (simulatorTimerRef.current !== null) {
        clearInterval(simulatorTimerRef.current);
        simulatorTimerRef.current = null;
      }
    };
  }, []);

  const destination = useMemo<LatLng | null>(() => {
    if (
      !validCoordinate(destinationLat) ||
      !validCoordinate(destinationLng)
    ) {
      return null;
    }

    return [
      Number(destinationLat),
      Number(destinationLng),
    ];
  }, [destinationLat, destinationLng]);

  const selectedRoute =
    routes[selectedRouteIndex] ?? routes[0] ?? null;

  const routePoints = useMemo<LatLng[]>(() => {
    if (!selectedRoute?.routePoints) return [];

    return selectedRoute.routePoints.filter(
      (point): point is LatLng =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    );
  }, [selectedRoute]);

  function stopGps() {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsActive(false);
    setGpsMessage("GPS stopped");
  }

  function startGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsMessage("Geolocation is unavailable on this device.");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setGpsMessage("Requesting precise GPS...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (gps) => {
        const speedMs =
          gps.coords.speed != null &&
          Number.isFinite(gps.coords.speed)
            ? gps.coords.speed
            : 0;

        const heading =
          gps.coords.heading != null &&
          Number.isFinite(gps.coords.heading)
            ? gps.coords.heading
            : 0;

        setPosition({
          lat: gps.coords.latitude,
          lng: gps.coords.longitude,
          speedKmh: Math.max(0, speedMs * 3.6),
          heading,
          accuracy: gps.coords.accuracy,
        });

        setGpsActive(true);
        setGpsMessage(
          `GPS live - accuracy ${Math.round(gps.coords.accuracy)} m`
        );
      },
      (error) => {
        setGpsActive(false);
        setGpsMessage(`GPS error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );
  }

  const clearOffRouteTimer =
    useCallback(() => {
      if (
        offRouteTimerRef.current !==
        null
      ) {
        clearTimeout(
          offRouteTimerRef.current
        );

        offRouteTimerRef.current =
          null;
      }
    }, []);

  useEffect(() => {
    return () => {
      clearOffRouteTimer();
    };
  }, [clearOffRouteTimer]);
  const speakNavigationInstruction =
    useCallback(
      (
        announcementKey: string,
        message: string
      ): boolean => {
        const spokenMessage =
          message.trim();

        if (
          !voiceEnabled ||
          !spokenMessage ||
          typeof window === "undefined" ||
          !("speechSynthesis" in window) ||
          typeof SpeechSynthesisUtterance ===
            "undefined"
        ) {
          return false;
        }

        if (
          lastSpokenAnnouncementRef.current.has(
            announcementKey
          )
        ) {
          return false;
        }

        const speechEngine =
          window.speechSynthesis;

        /*
         * GPS progress updates frequently.
         * Never interrupt an active or queued instruction
         * just because the navigation effect ran again.
         */
        if (
          speechEngine.speaking ||
          speechEngine.pending
        ) {
          return false;
        }

        try {
          const utterance =
            new SpeechSynthesisUtterance(
              spokenMessage
            );

          utterance.lang =
            "en-ZA";

          utterance.rate =
            0.95;

          utterance.pitch =
            1;

          utterance.onstart =
            () => {
              setVoiceStatusMessage(
                "Voice guidance speaking"
              );
            };

          utterance.onend =
            () => {
              setVoiceStatusMessage(
                "Voice guidance on"
              );
            };

          utterance.onerror =
            (event) => {
              if (
                event.error === "canceled" ||
                event.error === "interrupted"
              ) {
                return;
              }

              lastSpokenAnnouncementRef.current.delete(
                announcementKey
              );

              setVoiceStatusMessage(
                `Voice guidance error: ${
                  event.error || "unknown"
                }`
              );
            };

          lastSpokenAnnouncementRef.current.add(
            announcementKey
          );

          speechEngine.speak(
            utterance
          );

          return true;
        } catch {
          /*
           * Keep this path React-state free.
           * This helper can be invoked from an effect.
           */
          lastSpokenAnnouncementRef.current.delete(
            announcementKey
          );

          return false;
        }
      },
      [voiceEnabled]
    );
  function toggleVoiceGuidance() {
    if (voiceEnabled) {
      setVoiceEnabled(false);

      lastSpokenAnnouncementRef.current.clear();

      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }

      setVoiceStatusMessage(
        "Voice guidance off"
      );

      return;
    }

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance ===
        "undefined"
    ) {
      setVoiceStatusMessage(
        "Voice guidance is unavailable in this browser."
      );

      return;
    }

    lastSpokenAnnouncementRef.current.clear();

    window.speechSynthesis.cancel();

    setVoiceEnabled(true);

    setVoiceStatusMessage(
      "Voice guidance on"
    );
  }

  useEffect(() => {
    lastSpokenAnnouncementRef.current.clear();

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  }, [
    selectedRoute,
    navigationInstructions,
  ]);

  useEffect(() => {
    if (voiceEnabled) {
      return;
    }

    lastSpokenAnnouncementRef.current.clear();

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);
  function clearSimulatorTimer() {
    if (simulatorTimerRef.current !== null) {
      clearInterval(simulatorTimerRef.current);
      simulatorTimerRef.current = null;
    }
  }

  function simulatorBearing(
    from: LatLng,
    to: LatLng
  ): number {
    const fromLat =
      (from[0] * Math.PI) / 180;

    const toLat =
      (to[0] * Math.PI) / 180;

    const deltaLng =
      ((to[1] - from[1]) * Math.PI) / 180;

    const y =
      Math.sin(deltaLng) * Math.cos(toLat);

    const x =
      Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) *
        Math.cos(toLat) *
        Math.cos(deltaLng);

    const bearing =
      (Math.atan2(y, x) * 180) / Math.PI;

    return (bearing + 360) % 360;
  }

  function buildSimulatorPlaybackPoints() {
    if (routePoints.length < 2) {
      return [] as LatLng[];
    }

    const maximumPlaybackPoints = 300;

    const stride = Math.max(
      1,
      Math.floor(
        routePoints.length /
          maximumPlaybackPoints
      )
    );

    const points =
      routePoints.filter(
        (_, index) =>
          index % stride === 0
      );

    const finalPoint =
      routePoints[routePoints.length - 1];

    const lastPoint =
      points[points.length - 1];

    if (
      !lastPoint ||
      lastPoint[0] !== finalPoint[0] ||
      lastPoint[1] !== finalPoint[1]
    ) {
      points.push(finalPoint);
    }

    return points;
  }

  function applySimulatorPoint(
    points: LatLng[],
    index: number
  ) {
    const point = points[index];

    if (!point) {
      return;
    }

    const nextPoint =
      points[
        Math.min(
          index + 1,
          points.length - 1
        )
      ] ?? point;

    const heading =
      simulatorBearing(
        point,
        nextPoint
      );

    setPosition({
      lat: point[0],
      lng: point[1],
      speedKmh:
        index >= points.length - 1
          ? 0
          : 20,
      heading,
      accuracy: 5,
    });

    setGpsActive(true);

    setGpsMessage(
      `DEV simulator ${index + 1}/${points.length}`
    );

    setSimulatorMessage(
      `Playback ${index + 1} of ${points.length}`
    );
  }

  function forceSimulatorOffRoute() {
    if (!simulatorEnabled) {
      return;
    }

    clearSimulatorTimer();
    setSimulatorRunning(false);

    const points =
      simulatorPointsRef.current.length >= 2
        ? simulatorPointsRef.current
        : buildSimulatorPlaybackPoints();

    if (points.length < 2) {
      setSimulatorMessage(
        "Calculate and reset a route before forcing off-route."
      );

      return;
    }

    simulatorPointsRef.current =
      points;

    const currentIndex =
      Math.min(
        Math.max(
          simulatorIndexRef.current,
          0
        ),
        points.length - 2
      );

    const current =
      points[currentIndex];

    const next =
      points[currentIndex + 1];

    const segmentLat =
      next[0] -
      current[0];

    const segmentLng =
      next[1] -
      current[1];

    const segmentLength =
      Math.sqrt(
        segmentLat *
          segmentLat +
        segmentLng *
          segmentLng
      );

    if (
      !Number.isFinite(
        segmentLength
      ) ||
      segmentLength <= 0
    ) {
      setSimulatorMessage(
        "Could not calculate off-route test vector."
      );

      return;
    }

    const perpendicularLat =
      -segmentLng /
      segmentLength;

    const perpendicularLng =
      segmentLat /
      segmentLength;

    const offsetMeters =
      220;

    const metersPerLatitudeDegree =
      111320;

    const latitudeRadians =
      (current[0] *
        Math.PI) /
      180;

    const metersPerLongitudeDegree =
      Math.max(
        1,
        111320 *
          Math.cos(
            latitudeRadians
          )
      );

    const forcedLat =
      current[0] +
      (perpendicularLat *
        offsetMeters) /
        metersPerLatitudeDegree;

    const forcedLng =
      current[1] +
      (perpendicularLng *
        offsetMeters) /
        metersPerLongitudeDegree;

    const heading =
      simulatorBearing(
        current,
        next
      );

    clearOffRouteTimer();

    offRouteStartedAtRef.current =
      null;

    setPosition({
      lat: forcedLat,
      lng: forcedLng,
      speedKmh: 25,
      heading,
      accuracy: 5,
    });

    setGpsActive(true);
    setFollowVehicle(true);

    setGpsMessage(
      "DEV simulator forced off route"
    );

    setSimulatorMessage(
      `Forced approximately ${offsetMeters} m off route. Hold position to test automatic rerouting.`
    );

    setAutoRerouteMessage("");
  }
  function pauseSyntheticDrive() {
    clearSimulatorTimer();
    setSimulatorRunning(false);
    setSimulatorMessage("Simulator paused");
  }

  function resetSyntheticDrive() {
    if (!simulatorEnabled) {
      return;
    }

    clearSimulatorTimer();
    setSimulatorRunning(false);

    const points =
      buildSimulatorPlaybackPoints();

    simulatorPointsRef.current = points;
    simulatorIndexRef.current = 0;

    if (points.length < 2) {
      setSimulatorMessage(
        "Calculate a route before using the simulator."
      );
      return;
    }

    applySimulatorPoint(points, 0);
    setFollowVehicle(true);
    setSimulatorMessage("Simulator reset to route start");
  }

  function startSyntheticDrive() {
    if (!simulatorEnabled) {
      return;
    }

    if (routePoints.length < 2) {
      setSimulatorMessage(
        "Calculate a route before starting playback."
      );
      return;
    }

    stopGps();
    clearSimulatorTimer();

    let points =
      simulatorPointsRef.current;

    if (points.length < 2) {
      points = buildSimulatorPlaybackPoints();
      simulatorPointsRef.current = points;
      simulatorIndexRef.current = 0;
    }

    if (points.length < 2) {
      setSimulatorMessage("Route playback unavailable.");
      return;
    }

    setFollowVehicle(true);
    setSimulatorRunning(true);
    setSimulatorMessage("Simulator running");

    applySimulatorPoint(
      points,
      simulatorIndexRef.current
    );

    simulatorTimerRef.current =
      setInterval(() => {
        const nextIndex =
          simulatorIndexRef.current + 1;

        if (nextIndex >= points.length) {
          clearSimulatorTimer();
          simulatorIndexRef.current =
            points.length - 1;

          applySimulatorPoint(
            points,
            points.length - 1
          );

          setSimulatorRunning(false);
          setSimulatorMessage(
            "Simulator reached route destination"
          );

          return;
        }

        simulatorIndexRef.current =
          nextIndex;

        applySimulatorPoint(
          points,
          nextIndex
        );
      }, 1000);
  }

  async function searchDestination() {
    const query =
      destinationName.trim();

    if (query.length < 2) {
      setDestinationResults([]);
      setRoutingMessage(
        "Enter at least two characters to search."
      );
      return;
    }

    setDestinationSearching(true);
    setRoutingMessage(
      "Searching for destination..."
    );

    try {
      const params =
        new URLSearchParams({
          q: query,
        });

      if (position) {
        params.set(
          "lat",
          String(position.lat)
        );

        params.set(
          "lng",
          String(position.lng)
        );
      }

      const response =
        await fetchWithAuth(
          `/api/navigation/search?${params.toString()}`
        );

      const result =
        (await response.json()) as {
          results?: NavigationSearchResult[];
          error?: string;
        };

      if (!response.ok) {
        setDestinationResults([]);
        setRoutingMessage(
          result.error ??
          "Destination search failed."
        );
        return;
      }

      const nextResults =
        Array.isArray(result.results)
          ? result.results
          : [];

      setDestinationResults(
        nextResults
      );

      if (nextResults.length === 0) {
        setRoutingMessage(
          "No matching destinations found."
        );
      } else {
        setRoutingMessage(
          `${nextResults.length} destination option${
            nextResults.length === 1
              ? ""
              : "s"
          } found.`
        );
      }
    } catch {
      setDestinationResults([]);
      setRoutingMessage(
        "Destination search failed."
      );
    } finally {
      setDestinationSearching(false);
    }
  }
  const autoRerouteFromCurrentPosition =
    useCallback(
      async (
        reroutePosition: PositionState
      ) => {
        if (
          !destination ||
          routing ||
          autoRerouteInFlightRef.current
        ) {
          return;
        }

        const now =
          Date.now();

        if (
          now -
            lastAutoRerouteAtRef.current <
          AUTO_REROUTE_COOLDOWN_MS
        ) {
          return;
        }

        autoRerouteInFlightRef.current =
          true;

        lastAutoRerouteAtRef.current =
          now;

        setAutoRerouteActive(true);

        setAutoRerouteMessage(
          "Off route detected - recalculating..."
        );

        setRoutingMessage(
          "Off route detected. Calculating a new safe route..."
        );

        try {
          const response =
            await fetchWithAuth(
              "/api/route-safety/reroute",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                  origin: {
                    lat:
                      reroutePosition.lat,
                    lng:
                      reroutePosition.lng,
                  },
                  destination: {
                    lat: destination[0],
                    lng: destination[1],
                  },
                  routingProfile,
                }),
              }
            );

          const result =
            (await response.json()) as RerouteResponse;

          if (!response.ok) {
            const message =
              result.error ??
              "Automatic reroute failed.";

            setAutoRerouteMessage(
              message
            );

            setRoutingMessage(
              message
            );

            return;
          }

          const nextRoutes =
            result.routes ?? [];

          if (
            nextRoutes.length === 0
          ) {
            setAutoRerouteMessage(
              "No replacement route was returned."
            );

            setRoutingMessage(
              "No replacement route was returned."
            );

            return;
          }

          const nextRoute =
            nextRoutes[0] ??
            result.recommendedRoute ??
            null;

          setRoutes(
            nextRoutes
          );

          setSelectedRouteIndex(
            0
          );

          setNavigationInstructions(
            instructionsForRoute(
              nextRoute
            )
          );

          setRecommendation(
            result.recommendation ??
              null
          );

          setFollowVehicle(
            true
          );

          offRouteStartedAtRef.current =
            null;

          setAutoRerouteMessage(
            "Route updated from current position."
          );

          setRoutingMessage(
            `${nextRoutes.length} updated HarborGuard route option${
              nextRoutes.length === 1
                ? ""
                : "s"
            } ready.`
          );
        } catch {
          setAutoRerouteMessage(
            "Automatic reroute failed."
          );

          setRoutingMessage(
            "Automatic reroute failed."
          );
        } finally {
          autoRerouteInFlightRef.current =
            false;

          setAutoRerouteActive(
            false
          );
        }
      },
      [
        destination,
        routing,
        routingProfile,
      ]
    );
  async function calculateRoute() {
    if (!position) {
      setRoutingMessage("Start GPS before calculating a route.");
      return;
    }

    if (!destination) {
      setRoutingMessage("Enter valid destination coordinates.");
      return;
    }

    setRouting(true);
    setRoutingMessage("Calculating HarborGuard route...");

    try {
      const response = await fetchWithAuth(
        "/api/route-safety/reroute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            origin: {
              lat: position.lat,
              lng: position.lng,
            },
            destination: {
              lat: destination[0],
              lng: destination[1],
            },
            routingProfile,
          }),
        }
      );

      const result =
        (await response.json()) as RerouteResponse;

      if (!response.ok) {
        setRoutes([]);
        setNavigationInstructions([]);
        setRoutingMessage(
          result.error ?? "Could not calculate route."
        );
        return;
      }

      const nextRoutes = result.routes ?? [];

      setNavigationInstructions(
        instructionsForRoute(
          nextRoutes[0] ??
          result.recommendedRoute ??
          null
        )
      );

      setRoutes(nextRoutes);
      setSelectedRouteIndex(0);
      setRecommendation(result.recommendation ?? null);
      setFollowVehicle(true);

      if (nextRoutes.length === 0) {
        setRoutingMessage("No route was returned.");
      } else {
        setRoutingMessage(
          `${nextRoutes.length} HarborGuard route option${
            nextRoutes.length === 1 ? "" : "s"
          } ready.`
        );
      }
    } catch {
      setRoutes([]);
      setNavigationInstructions([]);
      setRoutingMessage("Route calculation failed.");
    } finally {
      setRouting(false);
    }
  }

  const currentLatitude =
    position?.lat ?? null;

  const currentLongitude =
    position?.lng ?? null;

  const currentPosition = useMemo<LatLng | null>(
    () =>
      currentLatitude != null &&
      currentLongitude != null
        ? [currentLatitude, currentLongitude]
        : null,
    [currentLatitude, currentLongitude]
  );

  const routeProgress =
    currentPosition && routePoints.length >= 2
      ? calculateRouteProgress(
          currentPosition,
          routePoints
        )
      : null;

  let activeInstructionIndex =
    navigationInstructions.length > 0
      ? 0
      : -1;

  if (routeProgress) {
    for (
      let index = 0;
      index < navigationInstructions.length;
      index += 1
    ) {
      const instructionOffset =
        Math.max(
          0,
          Number(
            navigationInstructions[index]
              ?.routeOffsetMeters ??
              navigationInstructions[index]
                ?.offset ??
              0
          )
        );

      if (
        routeProgress.progressMeters + 20 >=
        instructionOffset
      ) {
        activeInstructionIndex = index;
      } else {
        break;
      }
    }
  }

  const activeInstruction =
    activeInstructionIndex >= 0
      ? navigationInstructions[
          activeInstructionIndex
        ] ?? null
      : null;

  const nextInstruction =
    activeInstructionIndex >= 0
      ? navigationInstructions[
          activeInstructionIndex + 1
        ] ?? null
      : null;

  const distanceToNextManeuver =
    routeProgress && nextInstruction
      ? Math.max(
          0,
          Number(
            nextInstruction.routeOffsetMeters ??
              nextInstruction.offset ??
              0
          ) -
            routeProgress.progressMeters
        )
      : activeInstruction
        ? Math.max(
            0,
            Number(
              activeInstruction.length || 0
            )
          )
        : null;

  const destinationDistanceMeters =
    currentPosition && destination
      ? navigationDistanceMeters(
          currentPosition,
          destination
        )
      : null;

  const arrivalThresholdMeters =
    Math.max(
      35,
      Math.min(
        100,
        Number(position?.accuracy || 35)
      )
    );

  const hasReachedDestination =
    navigationInstructions.length > 0 &&
    activeInstructionIndex >=
      Math.max(
        0,
        navigationInstructions.length - 2
      ) &&
    destinationDistanceMeters != null &&
    destinationDistanceMeters <=
      arrivalThresholdMeters;

  const releaseWakeLock =
    useCallback(async () => {
      /*
       * Invalidates any in-flight request so a stale
       * request cannot re-enable the wake lock after
       * navigation has already stopped.
       */
      wakeLockRequestIdRef.current += 1;

      const sentinel =
        wakeLockRef.current;

      wakeLockRef.current =
        null;

      if (!sentinel) {
        return;
      }

      try {
        await sentinel.release();
      } catch {
        /*
         * Release failures are non-fatal. Browsers may
         * already have released the sentinel automatically.
         */
      }
    }, []);

  const requestWakeLock =
    useCallback(async () => {
      if (
        typeof navigator === "undefined" ||
        typeof document === "undefined" ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const wakeLock =
        (navigator as WakeLockNavigator)
          .wakeLock;

      if (
        !wakeLock ||
        wakeLockRef.current
      ) {
        return;
      }

      const requestId =
        wakeLockRequestIdRef.current + 1;

      wakeLockRequestIdRef.current =
        requestId;

      try {
        const sentinel =
          await wakeLock.request("screen");

        if (
          requestId !==
            wakeLockRequestIdRef.current ||
          document.visibilityState !== "visible"
        ) {
          try {
            await sentinel.release();
          } catch {
            // Stale wake-lock cleanup is best effort.
          }

          return;
        }

        wakeLockRef.current =
          sentinel;

        sentinel.addEventListener?.(
          "release",
          () => {
            if (
              wakeLockRef.current ===
              sentinel
            ) {
              wakeLockRef.current =
                null;
            }
          }
        );
      } catch {
        /*
         * Wake Lock API is optional and may be denied by
         * the browser, OS, battery policy, or permissions.
         * Navigation must continue normally without it.
         */
      }
    }, []);

  useEffect(() => {
    /*
     * Simulator activity can set gpsActive, but only a real
     * geolocation watch receives a wake lock.
     */
    const hasRealGpsWatch =
      watchIdRef.current !== null;

    const shouldHoldWakeLock =
      gpsActive &&
      hasRealGpsWatch &&
      selectedRoute != null &&
      !hasReachedDestination;

    if (!shouldHoldWakeLock) {
      void releaseWakeLock();
      return;
    }

    void requestWakeLock();

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void requestWakeLock();
        } else {
          void releaseWakeLock();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      void releaseWakeLock();
    };
  }, [
    gpsActive,
    selectedRoute,
    hasReachedDestination,
    requestWakeLock,
    releaseWakeLock,
  ]);
  useEffect(() => {
    if (
      !voiceEnabled ||
      routing ||
      autoRerouteActive ||
      !selectedRoute
    ) {
      return;
    }

    if (hasReachedDestination) {
      const arrivalKey =
        `arrival:${
          destination?.[0] ?? ""
        }:${
          destination?.[1] ?? ""
        }`;

      const arrivalMessage =
        destinationName &&
        destinationName !==
          "Destination"
          ? `You have arrived at ${destinationName}.`
          : "You have arrived at your destination.";

      speakNavigationInstruction(
        arrivalKey,
        arrivalMessage
      );

      return;
    }

    if (
      !nextInstruction ||
      distanceToNextManeuver == null ||
      activeInstructionIndex < 0
    ) {
      return;
    }

    const spokenInstruction =
      navigationVoiceText(
        nextInstruction
      );

    if (!spokenInstruction) {
      return;
    }

    const nextInstructionIndex =
      activeInstructionIndex + 1;

    const routeOffset =
      Number(
        nextInstruction.routeOffsetMeters ??
          nextInstruction.offset ??
          0
      );

    const instructionIdentity =
      `${nextInstructionIndex}:${routeOffset}:${spokenInstruction}`;

    const approachKey =
      `approach:${instructionIdentity}`;

    const nearKey =
      `near:${instructionIdentity}`;

    if (
      distanceToNextManeuver <=
      VOICE_NEAR_METERS
    ) {
      const didSpeak =
        speakNavigationInstruction(
          nearKey,
          `In ${voiceDistancePhrase(
            distanceToNextManeuver
          )}, ${spokenInstruction}`
        );

      if (didSpeak) {
        lastSpokenAnnouncementRef.current.add(
          approachKey
        );
      }

      return;
    }

    if (
      distanceToNextManeuver <=
      VOICE_APPROACH_METERS
    ) {
      speakNavigationInstruction(
        approachKey,
        `In ${voiceDistancePhrase(
          distanceToNextManeuver
        )}, ${spokenInstruction}`
      );
    }
  }, [
    voiceEnabled,
    routing,
    autoRerouteActive,
    selectedRoute,
    hasReachedDestination,
    destination,
    destinationName,
    nextInstruction,
    distanceToNextManeuver,
    activeInstructionIndex,
    speakNavigationInstruction,
  ]);
  const offRouteThresholdMeters =
    position
      ? Math.max(
          AUTO_REROUTE_OFF_ROUTE_THRESHOLD,
          Math.max(
            0,
            Number(
              position.accuracy
            ) || 0
          ) *
            AUTO_REROUTE_ACCURACY_MULTIPLIER
        )
      : AUTO_REROUTE_OFF_ROUTE_THRESHOLD;

  useEffect(() => {
    latestNavigationPositionRef.current =
      position;

    latestNavigationRoutePointsRef.current =
      routePoints;

    if (
      !position ||
      !routeProgress ||
      !selectedRoute ||
      !destination ||
      hasReachedDestination ||
      routing ||
      autoRerouteInFlightRef.current
    ) {
      clearOffRouteTimer();

      offRouteStartedAtRef.current =
        null;

      return;
    }

    const distanceFromRoute =
      routeProgress.distanceFromRouteMeters;

    if (
      !Number.isFinite(
        distanceFromRoute
      ) ||
      distanceFromRoute <=
        offRouteThresholdMeters
    ) {
      clearOffRouteTimer();

      offRouteStartedAtRef.current =
        null;

      return;
    }

    if (
      offRouteTimerRef.current !==
      null
    ) {
      return;
    }

    offRouteStartedAtRef.current =
      Date.now();

    setAutoRerouteMessage(
      `Possible off-route movement detected (${Math.round(
        distanceFromRoute
      )} m from route).`
    );

    offRouteTimerRef.current =
      setTimeout(() => {
        offRouteTimerRef.current =
          null;

        const latestPosition =
          latestNavigationPositionRef.current;

        const latestRoutePoints =
          latestNavigationRoutePointsRef.current;

        if (
          !latestPosition ||
          latestRoutePoints.length < 2
        ) {
          offRouteStartedAtRef.current =
            null;

          return;
        }

        const latestProgress =
          calculateRouteProgress(
            [
              latestPosition.lat,
              latestPosition.lng,
            ],
            latestRoutePoints
          );

        if (!latestProgress) {
          offRouteStartedAtRef.current =
            null;

          return;
        }

        const latestThresholdMeters =
          Math.max(
            AUTO_REROUTE_OFF_ROUTE_THRESHOLD,
            Math.max(
              0,
              Number(
                latestPosition.accuracy
              ) || 0
            ) *
              AUTO_REROUTE_ACCURACY_MULTIPLIER
          );

        if (
          !Number.isFinite(
            latestProgress.distanceFromRouteMeters
          ) ||
          latestProgress.distanceFromRouteMeters <=
            latestThresholdMeters
        ) {
          offRouteStartedAtRef.current =
            null;

          setAutoRerouteMessage(
            "Vehicle returned to the active route."
          );

          return;
        }

        const now =
          Date.now();

        if (
          now -
            lastAutoRerouteAtRef.current <
          AUTO_REROUTE_COOLDOWN_MS
        ) {
          offRouteStartedAtRef.current =
            null;

          return;
        }

        offRouteStartedAtRef.current =
          null;

        void autoRerouteFromCurrentPosition(
          latestPosition
        );
      }, AUTO_REROUTE_SUSTAINED_MS);

    return () => {
      clearOffRouteTimer();
    };
  }, [
    position,
    routeProgress,
    routePoints,
    selectedRoute,
    destination,
    hasReachedDestination,
    routing,
    offRouteThresholdMeters,
    autoRerouteFromCurrentPosition,
    clearOffRouteTimer,
  ]);
  const navigationHeadline =
    autoRerouteActive
      ? "Rerouting..."
      : hasReachedDestination
        ? "You have arrived"
      : activeInstruction?.text ||
        (selectedRoute
          ? `Continue toward ${
              destinationName ||
              "destination"
            }`
          : "Choose a destination");

  const navigationDetail =
    autoRerouteActive
      ? "Finding a new HarborGuard safe route from your current position."
      : hasReachedDestination
      ? destinationName
        ? `Arrived at ${destinationName}.`
        : "Destination reached."
      : activeInstruction
        ? `${
            distanceToNextManeuver != null
              ? `${Math.round(
                  distanceToNextManeuver
                )} m`
              : "Continue"
          } - Step ${
            activeInstructionIndex + 1
          } of ${
            navigationInstructions.length
          }`
        : "Search a destination and calculate a HarborGuard guided route.";

  return (
    <main
      className="hg-safe-navigation-page"
      style={{
        minHeight: "100dvh",
        background: "#020617",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >

        <style jsx global>{`
          /*
           * HARBORGUARD RESPONSIVE NAVIGATION
           *
           * Desktop:
           *   persistent navigation panel + map
           *
           * Tablet:
           *   compact panel + map
           *
           * Phone:
           *   full-screen map + scrollable bottom control sheet
           *
           * Landscape phone:
           *   compact side control sheet + full navigation map
           */

          .hg-safe-navigation-page {
            min-height: 100dvh !important;
            height: 100dvh;
            overflow: hidden;
          }

          .hg-navigation-layout {
            min-height: 100dvh !important;
            height: 100dvh;
          }

          .hg-navigation-sidebar {
            min-height: 100dvh;
            padding-top:
              max(22px, env(safe-area-inset-top)) !important;
            padding-bottom:
              max(22px, env(safe-area-inset-bottom)) !important;
          }

          .hg-navigation-map-shell {
            min-height: 100dvh !important;
            height: 100dvh;
            touch-action: none;
          }

          .hg-navigation-map-shell .leaflet-container {
            width: 100%;
            height: 100%;
            touch-action: none;
          }

          .hg-navigation-turn-card-wrap {
            top:
              max(18px, env(safe-area-inset-top)) !important;
            left:
              max(18px, env(safe-area-inset-left)) !important;
            right:
              max(18px, env(safe-area-inset-right)) !important;
          }

          .hg-navigation-follow-button {
            right:
              max(20px, env(safe-area-inset-right)) !important;
            min-width: 48px;
            min-height: 48px;
          }

          .hg-navigation-metrics-wrap {
            bottom:
              max(18px, env(safe-area-inset-bottom)) !important;
            left:
              max(18px, env(safe-area-inset-left)) !important;
            right:
              max(18px, env(safe-area-inset-right)) !important;
          }

          .hg-navigation-metrics {
            grid-template-columns:
              repeat(5, minmax(0, 1fr)) !important;
          }

          @media (max-width: 1023px) {
            .hg-navigation-layout {
              grid-template-columns:
                minmax(260px, 300px) minmax(0, 1fr) !important;
            }

            .hg-navigation-sidebar {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }

            .hg-navigation-metrics {
              width: min(650px, 100%) !important;
            }
          }

          @media (max-width: 767px) {
            .hg-safe-navigation-page {
              position: relative;
              width: 100%;
              min-height: 100dvh !important;
              height: 100dvh;
            }

            .hg-navigation-layout {
              display: block !important;
              position: relative;
              width: 100%;
              height: 100dvh;
              min-height: 100dvh !important;
            }

            .hg-navigation-map-shell {
              position: absolute !important;
              inset: 0;
              width: 100%;
              height: 100dvh !important;
              min-height: 100dvh !important;
            }

            .hg-navigation-sidebar {
              position: absolute;
              z-index: 900;
              left:
                max(8px, env(safe-area-inset-left));
              right:
                max(8px, env(safe-area-inset-right));
              bottom:
                max(8px, env(safe-area-inset-bottom));
              width: auto;
              min-height: 0;
              max-height: 38dvh;
              overflow-y: auto;
              overscroll-behavior: contain;
              padding: 14px !important;
              border: 1px solid rgba(71, 85, 105, 0.92);
              border-radius: 22px;
              background: rgba(7, 17, 31, 0.95) !important;
              box-shadow:
                0 -12px 40px rgba(0, 0, 0, 0.48);
              backdrop-filter: blur(18px);
              -webkit-backdrop-filter: blur(18px);
            }

            .hg-navigation-turn-card-wrap {
              top:
                max(8px, env(safe-area-inset-top)) !important;
              left:
                max(8px, env(safe-area-inset-left)) !important;
              right:
                max(8px, env(safe-area-inset-right)) !important;
            }

            .hg-navigation-turn-card-wrap > div {
              padding: 12px 14px !important;
              border-radius: 18px !important;
            }

            .hg-navigation-metrics-wrap {
              left:
                max(8px, env(safe-area-inset-left)) !important;
              right:
                max(8px, env(safe-area-inset-right)) !important;
              bottom:
                calc(
                  38dvh +
                  max(18px, env(safe-area-inset-bottom))
                ) !important;
            }

            .hg-navigation-metrics {
              width: 100% !important;
              grid-template-columns:
                repeat(3, minmax(0, 1fr)) !important;
              border-radius: 18px !important;
            }

            .hg-navigation-metrics > div {
              padding: 9px 5px !important;
            }

            .hg-navigation-follow-button {
              right:
                max(12px, env(safe-area-inset-right)) !important;
              bottom:
                calc(
                  38dvh +
                  112px +
                  max(12px, env(safe-area-inset-bottom))
                ) !important;
              width: 50px !important;
              height: 50px !important;
            }

            .hg-navigation-recommendation {
              display: none;
            }
          }

          @media (max-width: 430px) {
            .hg-navigation-sidebar {
              max-height: 34dvh;
            }

            .hg-navigation-metrics-wrap {
              bottom:
                calc(
                  34dvh +
                  max(18px, env(safe-area-inset-bottom))
                ) !important;
            }

            .hg-navigation-metrics {
              grid-template-columns:
                repeat(3, minmax(0, 1fr)) !important;
            }

            .hg-navigation-follow-button {
              bottom:
                calc(
                  34dvh +
                  112px +
                  max(12px, env(safe-area-inset-bottom))
                ) !important;
            }
          }

          @media
            (orientation: landscape)
            and (max-height: 600px)
            and (max-width: 1000px) {

            .hg-navigation-sidebar {
              top:
                max(8px, env(safe-area-inset-top));
              left:
                max(8px, env(safe-area-inset-left));
              right: auto;
              bottom:
                max(8px, env(safe-area-inset-bottom));
              width: min(320px, 42vw);
              max-height: none;
            }

            .hg-navigation-turn-card-wrap {
              left:
                calc(
                  min(320px, 42vw) +
                  max(24px, env(safe-area-inset-left))
                ) !important;
            }

            .hg-navigation-metrics-wrap {
              left:
                calc(
                  min(320px, 42vw) +
                  max(24px, env(safe-area-inset-left))
                ) !important;
              bottom:
                max(8px, env(safe-area-inset-bottom)) !important;
            }

            .hg-navigation-metrics {
              grid-template-columns:
                repeat(5, minmax(0, 1fr)) !important;
            }

            .hg-navigation-follow-button {
              bottom:
                max(86px, env(safe-area-inset-bottom)) !important;
            }
          }
        `}</style>

      <div
        className="hg-navigation-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(290px, 360px) minmax(0, 1fr)",
          minHeight: "100dvh",
        }}
      >
        <aside
          className="hg-navigation-sidebar"
          style={{
            padding: 22,
            background: "#07111f",
            borderRight: "1px solid #1e293b",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 1.8,
              fontWeight: 900,
              color: "#22d3ee",
              marginBottom: 8,
            }}
          >
            HARBORGUARD
          </div>

          <h1 style={{ margin: 0, fontSize: "clamp(24px, 4vw, 30px)" }}>
            Safe Navigation
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            Live driver navigation with HarborGuard route-risk intelligence.
          </p>

          <section
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#0f172a",
              border: "1px solid #1e293b",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Live GPS
            </div>

            <div
              style={{
                color: gpsActive ? "#5eead4" : "#94a3b8",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {gpsMessage}
            </div>

            <button
              type="button"
              onClick={gpsActive ? stopGps : startGps}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 12,
                padding: "12px 14px",
                background: gpsActive ? "#334155" : "#0891b2",
                color: "#ffffff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {gpsActive ? "Stop GPS" : "Start GPS"}
            </button>
            <button
              type="button"
              onClick={toggleVoiceGuidance}
              aria-pressed={voiceEnabled}
              style={{
                width: "100%",
                marginTop: 10,
                border:
                  voiceEnabled
                    ? "1px solid #22d3ee"
                    : "1px solid #475569",
                borderRadius: 12,
                padding: "11px 14px",
                background:
                  voiceEnabled
                    ? "#083344"
                    : "#020617",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {voiceEnabled
                ? "Voice Guidance: On"
                : "Voice Guidance: Off"}
            </button>

            <div
              style={{
                marginTop: 7,
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {voiceStatusMessage}
            </div>
          </section>

          <section
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#0f172a",
              border: "1px solid #1e293b",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Destination
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  fontWeight: 800,
                }}
              >
                Where to?
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) auto",
                  gap: 8,
                }}
              >
                <input
                  value={destinationName}
                  onChange={(event) => {
                    setDestinationName(
                      event.target.value
                    );

                    setSelectedDestination(
                      null
                    );

                    setDestinationLat("");
                    setDestinationLng("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchDestination();
                    }
                  }}
                  placeholder="Search a place, address or landmark"
                  autoComplete="off"
                  style={inputStyle}
                />

                <button
                  type="button"
                  onClick={() => {
                    void searchDestination();
                  }}
                  disabled={destinationSearching}
                  style={{
                    border: 0,
                    borderRadius: 12,
                    padding: "0 14px",
                    background: "#0891b2",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor:
                      destinationSearching
                        ? "wait"
                        : "pointer",
                    opacity:
                      destinationSearching
                        ? 0.7
                        : 1,
                  }}
                >
                  {destinationSearching
                    ? "..."
                    : "Search"}
                </button>
              </div>

              {destinationResults.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {destinationResults.map(
                    (result) => (
                      <button
                        key={
                          result.id ??
                          `${result.lat}-${result.lng}`
                        }
                        type="button"
                        onClick={() => {
                          setSelectedDestination(
                            result
                          );

                          setDestinationName(
                            result.title
                          );

                          setDestinationLat(
                            String(result.lat)
                          );

                          setDestinationLng(
                            String(result.lng)
                          );

                          setDestinationResults(
                            []
                          );

                          setRoutingMessage(
                            `Destination selected: ${result.title}`
                          );
                        }}
                        style={{
                          textAlign: "left",
                          border:
                            "1px solid #334155",
                          borderRadius: 10,
                          background:
                            "#020617",
                          color:
                            "#e2e8f0",
                          padding: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                          }}
                        >
                          {result.title}
                        </div>

                        {result.address ? (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              color:
                                "#94a3b8",
                              lineHeight: 1.35,
                            }}
                          >
                            {result.address}
                          </div>
                        ) : null}

                        {result.categories.length > 0 ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              color:
                                "#67e8f9",
                            }}
                          >
                            {result.categories
                              .slice(0, 3)
                              .join(" \u2022 ")}
                          </div>
                        ) : null}
                      </button>
                    )
                  )}
                </div>
              ) : null}

              {selectedDestination ? (
                <div
                  style={{
                    borderRadius: 10,
                    padding: 9,
                    background:
                      "rgba(13,148,136,0.12)",
                    border:
                      "1px solid rgba(45,212,191,0.35)",
                    color: "#5eead4",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Destination selected:
                  {" "}
                  {selectedDestination.title}
                </div>
              ) : null}
            </div>

            <select
              value={routingProfile}
              onChange={(event) =>
                setRoutingProfile(event.target.value)
              }
              style={inputStyle}
            >
              <option value="safest">Safest</option>
              <option value="balanced">Balanced</option>
              <option value="fastest">Fastest</option>
            </select>

            <button
              type="button"
              disabled={routing}
              onClick={calculateRoute}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 12,
                padding: "13px 14px",
                background: "#0f766e",
                color: "#ffffff",
                fontWeight: 900,
                cursor: routing ? "wait" : "pointer",
                opacity: routing ? 0.7 : 1,
              }}
            >
              {routing ? "Calculating..." : "Calculate Safe Route"}
            </button>

            <div
              style={{
                color: "#94a3b8",
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {routingMessage}
            </div>
            {navigationInstructions.length > 0 ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  Turn-by-turn directions
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  {navigationInstructions.map(
                    (
                      instruction,
                      index
                    ) => (
                      <div
                        key={`${index}-${instruction.offset ?? 0}`}
                        style={{
                          border:
                            "1px solid #243244",
                          borderRadius: 12,
                          padding: 10,
                          background:
                            "#0b1324",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#5eead4",
                            fontWeight: 900,
                            fontSize: 11,
                            letterSpacing:
                              "0.05em",
                          }}
                        >
                          STEP {index + 1}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            color:
                              "#f8fafc",
                            fontWeight: 700,
                            lineHeight: 1.35,
                          }}
                        >
                          {instruction.text ||
                            `${instruction.action ?? "Continue"} ${
                              instruction.direction ?? ""
                            }`}
                        </div>

                        {Number(
                          instruction.length
                        ) > 0 ? (
                          <div
                            style={{
                              marginTop: 4,
                              color:
                                "#94a3b8",
                              fontSize: 12,
                            }}
                          >
                            {Math.round(
                              Number(
                                instruction.length
                              )
                            )} m
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {routes.length > 1 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                Route options
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {routes.slice(0, 4).map((route, index) => (
                  <button
                    key={`${route.index ?? index}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedRouteIndex(index);
                      setNavigationInstructions(
                        instructionsForRoute(route)
                      );
                      setFollowVehicle(true);
                    }}
                    style={{
                      textAlign: "left",
                      borderRadius: 12,
                      padding: 11,
                      border:
                        selectedRouteIndex === index
                          ? "1px solid #22d3ee"
                          : "1px solid #334155",
                      background:
                        selectedRouteIndex === index
                          ? "#083344"
                          : "#0f172a",
                      color: "#e2e8f0",
                      cursor: "pointer",
                    }}
                  >
                    <strong>
                      {route.label ?? `Route ${index + 1}`}
                    </strong>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {distanceLabel(route)} - {durationLabel(route)}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>

        <section
          className="hg-navigation-map-shell"
          style={{
            position: "relative",
            minHeight: "100dvh",
            overflow: "hidden",
          }}
        >
          <SafeNavigationMap
            position={currentPosition}
            heading={position?.heading ?? 0}
            routePoints={routePoints}
            destination={destination}
            followVehicle={followVehicle}
            onFollowChange={setFollowVehicle}
          />

          {simulatorEnabled && (
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                zIndex: 900,
                width: "min(300px, calc(100vw - 36px))",
                padding: 12,
                borderRadius: 14,
                border: "1px solid #334155",
                background: "rgba(2, 6, 23, 0.94)",
                boxShadow: "0 14px 40px rgba(0,0,0,.4)",
                color: "#e2e8f0",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: ".08em",
                  color: "#22d3ee",
                }}
              >
                DEV GPS SIMULATOR
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                {simulatorMessage}
                {autoRerouteMessage
                  ? ` | ${autoRerouteMessage}`
                  : ""}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={startSyntheticDrive}
                  disabled={simulatorRunning}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #0891b2",
                    background: simulatorRunning
                      ? "#164e63"
                      : "#0891b2",
                    color: "#ffffff",
                    cursor: simulatorRunning
                      ? "default"
                      : "pointer",
                    fontWeight: 800,
                  }}
                >
                  {simulatorRunning ? "Running" : "Start / Resume"}
                </button>

                <button
                  type="button"
                  onClick={pauseSyntheticDrive}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Pause
                </button>

                <button
                  type="button"
                  onClick={forceSimulatorOffRoute}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #f59e0b",
                    background: "#78350f",
                    color: "#fef3c7",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Force Off Route
                </button>
                <button
                  type="button"
                  onClick={resetSyntheticDrive}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #475569",
                    background: "#020617",
                    color: "#e2e8f0",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Reset to Route Start
                </button>
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                Development only. No telemetry or database writes.
              </div>
            </div>
          )}

          <div
            className="hg-navigation-turn-card-wrap"
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              top: 18,
              zIndex: 700,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                maxWidth: 650,
                margin: "0 auto",
                padding: "16px 20px",
                borderRadius: 22,
                background: "rgba(4, 47, 46, 0.94)",
                border: "1px solid rgba(94,234,212,.32)",
                boxShadow: "0 18px 45px rgba(0,0,0,.38)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  color: "#99f6e4",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                }}
              >
                HARBORGUARD NAVIGATION
              </div>

              <div
                style={{
                  fontSize: "clamp(18px, 4.5vw, 25px)",
                  fontWeight: 900,
                  marginTop: 5,
                }}
              >
                {navigationHeadline}
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: "#ccfbf1",
                  fontSize: 14,
                }}
              >
                {navigationDetail}
              </div>
            </div>
          </div>

          <button
            className="hg-navigation-follow-button"
            type="button"
            onClick={() => setFollowVehicle(true)}
            style={{
              position: "absolute",
              right: 20,
              bottom: 150,
              zIndex: 750,
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "1px solid #334155",
              background: followVehicle ? "#0891b2" : "#020617",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 10px 28px rgba(0,0,0,.35)",
            }}
            aria-label="Follow vehicle"
          >
            {"\u2316"}
          </button>

          <div
            className="hg-navigation-metrics-wrap"
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 18,
              zIndex: 700,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              className="hg-navigation-metrics"
              style={{
                width: "min(760px, 100%)",
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, minmax(0, 1fr))",
                gap: 1,
                borderRadius: 24,
                overflow: "hidden",
                background: "#334155",
                boxShadow: "0 18px 48px rgba(0,0,0,.48)",
              }}
            >
              <Metric
                label="ETA"
                value={durationLabel(selectedRoute)}
              />
              <Metric
                label="Distance"
                value={distanceLabel(selectedRoute)}
              />
              <Metric
                label="Speed"
                value={`${Math.round(position?.speedKmh ?? 0)} km/h`}
              />
              <Metric
                label="Safety"
                value={
                  selectedRoute?.safetyScore != null
                    ? `${Math.round(selectedRoute.safetyScore)}`
                    : "--"
                }
              />
              <Metric
                label="Risk"
                value={
                  selectedRoute?.riskScore != null
                    ? `${Math.round(selectedRoute.riskScore)}`
                    : "--"
                }
              />
            </div>
          </div>

          {recommendation && (
            <div
              className="hg-navigation-recommendation"
              style={{
                position: "absolute",
                left: 18,
                bottom: 122,
                zIndex: 700,
                maxWidth: 520,
                padding: "10px 14px",
                borderRadius: 14,
                background: "rgba(2, 6, 23, .9)",
                color: "#cbd5e1",
                border: "1px solid #334155",
                fontSize: 13,
              }}
            >
              {recommendation}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "rgba(2,6,23,.96)",
        padding: "14px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.1,
          fontWeight: 900,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 18,
          fontWeight: 900,
          color: "#f8fafc",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginBottom: 9,
  padding: "11px 12px",
  borderRadius: 11,
  border: "1px solid #334155",
  background: "#020617",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14,
};
