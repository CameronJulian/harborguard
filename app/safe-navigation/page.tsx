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
  speedLimitSegments?: {
    startOffsetMeters: number;
    endOffsetMeters: number;
    speedLimitKph: number;
  }[];
};

type NavigationSearchResult = {
  id: string | null;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  accessLat: number | null;
  accessLng: number | null;
  resultType: string | null;
  categories: string[];
};

type TomTomManeuverGuidance =
  | "keepLeft"
  | "keepRight"
  | "mergeLeftLane"
  | "mergeRightLane";

type NavigationInstruction = {
  sectionIndex?: number;
  instructionIndex?: number;
  text?: string | null;
  voiceText?: string | null;
  action?: string | null;
  maneuverGuidance?:
    | TomTomManeuverGuidance
    | null;
  direction?: string | null;
  length?: number;
  duration?: number;
  offset?: number;
  routeOffsetMeters?: number;
  roadLabel?: string | null;
  towardLabel?: string | null;
  exitNumber?: string | null;
  landmark?: string | null;
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

type NavigationRoadMetadata = {
  name?: string | null;
  number?: string | null;
  toward?: string[];
};

type NavigationSignpostLabel = {
  routeNumber?: string | null;
  name?: string | null;
};

type NavigationTurnByTurnAction = {
  sectionIndex?: number;
  actionIndex?: number;
  action?: string | null;
  maneuverGuidance?:
    | TomTomManeuverGuidance
    | null;
  direction?: string | null;
  severity?: string | null;
  length?: number;
  duration?: number;
  offset?: number;
  routeOffsetMeters?: number;
  turnAngle?: number | null;
  currentRoad?: NavigationRoadMetadata | null;
  nextRoad?: NavigationRoadMetadata | null;
  signpost?: NavigationSignpostLabel[];
  exitNumbers?: string[];
};
type GuidedRoute = RouteOption & {
  navigationInstructions?:
    NavigationInstruction[];
  navigationActions?:
    NavigationAction[];
  navigationTurnByTurnActions?:
    NavigationTurnByTurnAction[];
};

function uniqueNavigationLabels(
  values: Array<string | null | undefined>
): string[] {
  const seen =
    new Set<string>();

  const result: string[] = [];

  for (const rawValue of values) {
    const value =
      typeof rawValue === "string"
        ? rawValue.trim()
        : "";

    if (!value) {
      continue;
    }

    const key =
      value.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function navigationRoadLabel(
  road:
    | NavigationRoadMetadata
    | null
    | undefined
): string | null {
  if (!road) {
    return null;
  }

  const values =
    uniqueNavigationLabels([
      road.number,
      road.name,
    ]);

  return values.length > 0
    ? values.join(" · ")
    : null;
}

function navigationTowardLabel(
  action: NavigationTurnByTurnAction
): string | null {
  const nextRoadToward =
    Array.isArray(
      action.nextRoad?.toward
    )
      ? action.nextRoad?.toward ?? []
      : [];

  const signpostNames =
    Array.isArray(action.signpost)
      ? action.signpost
          .map((label) => label?.name)
          .filter(
            (
              value
            ): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
      : [];

  const signpostRoutes =
    Array.isArray(action.signpost)
      ? action.signpost
          .map(
            (label) =>
              label?.routeNumber
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
      : [];

  const values =
    uniqueNavigationLabels([
      ...nextRoadToward,
      ...signpostNames,
      ...signpostRoutes,
    ]);

  return values.length > 0
    ? values.join(" / ")
    : null;
}

function navigationDirectionPhrase(
  direction:
    | string
    | null
    | undefined
): string {
  return typeof direction === "string"
    ? direction
        .replace(
          /([a-z])([A-Z])/g,
          "$1 $2"
        )
        .replace(/[_-]+/g, " ")
        .trim()
        .toLowerCase()
    : "";
}

function richInstructionForAction(
  action: NavigationTurnByTurnAction,
  instructionIndex: number
): NavigationInstruction {
  const actionName =
    typeof action.maneuverGuidance === "string"
      ? action.maneuverGuidance
      : typeof action.action === "string"
        ? action.action.trim()
        : "";

  const direction =
    navigationDirectionPhrase(
      action.direction
    );

  const nextRoadLabel =
    navigationRoadLabel(
      action.nextRoad
    );

  const currentRoadLabel =
    navigationRoadLabel(
      action.currentRoad
    );

  const roadLabel =
    nextRoadLabel ??
    currentRoadLabel;

  const towardLabel =
    navigationTowardLabel(
      action
    );

  const exitNumber =
    Array.isArray(action.exitNumbers)
      ? action.exitNumbers.find(
          (value) =>
            typeof value === "string" &&
            value.trim().length > 0
        )?.trim() ?? null
      : null;

  let text = "";

  switch (actionName) {
    case "keepLeft":
      text =
        "Keep left";
      break;

    case "keepRight":
      text =
        "Keep right";
      break;

    case "mergeLeftLane":
      text =
        "Merge into the left lane";
      break;

    case "mergeRightLane":
      text =
        "Merge into the right lane";
      break;

    case "depart":
      text =
        roadLabel
          ? `Start on ${roadLabel}`
          : "Start your route";
      break;

    case "arrive":
      text =
        "Arrive at your destination";
      break;

    case "turn":
      text =
        `Turn${
          direction
            ? ` ${direction}`
            : ""
        }${
          roadLabel
            ? ` onto ${roadLabel}`
            : ""
        }`;
      break;

    case "keep":
      text =
        `Keep${
          direction
            ? ` ${direction}`
            : ""
        }${
          roadLabel
            ? ` onto ${roadLabel}`
            : ""
        }`;
      break;

    case "enterHighway":
      text =
        roadLabel
          ? `Enter ${roadLabel}`
          : "Enter the highway";
      break;

    case "exitHighway":
      text =
        `Take${
          exitNumber
            ? ` exit ${exitNumber}`
            : " the exit"
        }${
          towardLabel
            ? ` toward ${towardLabel}`
            : roadLabel
              ? ` onto ${roadLabel}`
              : ""
        }`;
      break;

    case "continue":
      text =
        roadLabel
          ? `Continue on ${roadLabel}`
          : "Continue";
      break;

    default: {
      const fallbackAction =
        actionName
          ? actionName
              .replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
              )
              .replace(
                /[_-]+/g,
                " "
              )
              .trim()
          : "Continue";

      text =
        `${fallbackAction}${
          direction
            ? ` ${direction}`
            : ""
        }${
          roadLabel
            ? ` onto ${roadLabel}`
            : ""
        }`;
    }
  }

  if (
    towardLabel &&
    actionName !== "exitHighway" &&
    !text
      .toLowerCase()
      .includes(
        towardLabel.toLowerCase()
      )
  ) {
    text =
      `${text} toward ${towardLabel}`;
  }

  const voiceText =
    text
      .replace(/\s*·\s*/g, ", ")
      .replace(/\s*\/\s*/g, " or ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    sectionIndex:
      action.sectionIndex,
    instructionIndex,
    text:
      text.trim(),
    voiceText,
    action:
      action.action ?? null,
    maneuverGuidance:
      action.maneuverGuidance ?? null,
    direction:
      action.direction ?? null,
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
    roadLabel,
    towardLabel,
    exitNumber,
  };
}
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
      guidedRoute.navigationTurnByTurnActions
    ) &&
    guidedRoute.navigationTurnByTurnActions.length > 0
  ) {
    return guidedRoute.navigationTurnByTurnActions.map(
      (action, index) =>
        richInstructionForAction(
          action,
          index
        )
    );
  }

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
type SafeNavigationActiveTrip = {
  id: string;
  status: string;
};

type SafeNavigationVehicleOption = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName: string | null;
  activeTrip: SafeNavigationActiveTrip | null;
};

type SafeNavigationFleetResponse = {
  success: boolean;
  fleet: SafeNavigationVehicleOption[];
};

type RerouteResponse = {
  success?: boolean;
  routingProfile?: string;
  routes?: RouteOption[];
  recommendedRoute?: RouteOption | null;
  recommendation?: string | null;
  error?: string;
};
type TrafficCalmingAwarenessContext = {
  featureType:
    | "speed_bump"
    | "raised_intersection";
  providerFeatureId?: string | null;
  ownership?: string | null;
  statusCode?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
};
type ActiveRouteSafetyThreat = {
  id?: string | null;
  routeSafetyAlertId?: string | null;
  type?: string | null;
  title?: string | null;
  severity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  score?: number | null;
  confidence?: number | null;
  verificationCount?: number | null;
  createdAt?: string | null;
  recommendation?: string | null;
  trafficCalmingContext?: TrafficCalmingAwarenessContext | null;
};

type LiveRoadIntelligence = {
  trafficRiskLevel: string | null;
  trafficRiskScore: number | null;
  averageDelayMinutes: number | null;
  overallRiskLevel: string | null;
  overallRiskScore: number | null;
};

type RouteWeatherIntelligence = {
  riskLevel: string | null;
  riskScore: number | null;
  contribution: number | null;
  temperatureC: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  visibilityKm: number | null;
  weatherCode: number | null;
  riskReasons: string[];
};

type RouteSafetyPredictionResponse = {
  riskScore?: number | null;
  riskLevel?: string | null;
  trafficRiskScore?: number | null;
  trafficRiskLevel?: string | null;
  trafficError?: string | null;
  weatherRiskScore?: number | null;
  weatherContribution?: number | null;
  weatherError?: string | null;
  weather?: {
    latitude?: number | null;
    longitude?: number | null;
    observedAt?: string | null;
    temperatureC?: number | null;
    windSpeedKph?: number | null;
    windGustKph?: number | null;
    precipitationMm?: number | null;
    visibilityKm?: number | null;
    weatherCode?: number | null;
    riskScore?: number | null;
    riskLevel?: string | null;
    riskReasons?: string[];
  } | null;
  traffic?: {
    summary?: {
      averageDelay?: number | null;
    } | null;
  } | null;
  threats?: ActiveRouteSafetyThreat[];
};

function liveRoadIntelligenceLabel(
  intelligence: LiveRoadIntelligence
): string | null {
  const parts: string[] = [];

  if (intelligence.trafficRiskLevel) {
    parts.push(
      `Traffic risk ${intelligence.trafficRiskLevel.toLowerCase()}`
    );
  }

  if (intelligence.averageDelayMinutes != null) {
    parts.push(
      intelligence.averageDelayMinutes >= 1
        ? `~${Math.max(
            1,
            Math.round(intelligence.averageDelayMinutes)
          )} min delay`
        : "No major traffic delay"
    );
  }

  if (intelligence.overallRiskScore != null) {
    parts.push(
      `Route risk ${Math.round(
        intelligence.overallRiskScore
      )}/100`
    );
  }

  return parts.length > 0
    ? parts.join(" · ")
    : null;
}

function routeWeatherIntelligenceLabel(
  intelligence: RouteWeatherIntelligence
): string | null {
  const parts: string[] = [];

  if (intelligence.riskLevel) {
    parts.push(
      `${intelligence.riskLevel.toUpperCase()} weather risk`
    );
  }

  if (intelligence.temperatureC != null) {
    parts.push(
      `${Math.round(intelligence.temperatureC)}°C`
    );
  }

  if (intelligence.windSpeedKph != null) {
    parts.push(
      `Wind ${Math.round(
        intelligence.windSpeedKph
      )} km/h`
    );
  }

  if (intelligence.precipitationMm != null) {
    parts.push(
      `Rain ${intelligence.precipitationMm.toFixed(1)} mm`
    );
  }

  if (intelligence.visibilityKm != null) {
    parts.push(
      `Visibility ${intelligence.visibilityKm.toFixed(1)} km`
    );
  }

  if (
    intelligence.contribution != null &&
    intelligence.contribution > 0
  ) {
    parts.push(
      `+${Math.round(
        intelligence.contribution
      )} route-risk points`
    );
  }

  return parts.length > 0
    ? parts.join(" · ")
    : null;
}

function routeWeatherDriverGuidance(
  weather: RouteWeatherIntelligence
): string {
  const reasons = weather.riskReasons
    .map((reason) => reason.toLowerCase())
    .join(" ");

  const guidance: string[] = [];

  if (reasons.includes("visibility")) {
    guidance.push(
      "Reduce speed and increase following distance."
    );
  }

  if (
    reasons.includes("precipitation") ||
    reasons.includes("shower") ||
    reasons.includes("snow") ||
    reasons.includes("freezing")
  ) {
    guidance.push(
      "Allow extra braking distance and avoid sudden manoeuvres."
    );
  }

  if (reasons.includes("wind")) {
    guidance.push(
      "Keep both hands on the wheel and allow extra space around high-sided vehicles."
    );
  }

  if (reasons.includes("thunderstorm")) {
    guidance.push(
      "Use extra caution and be prepared for rapidly changing road conditions."
    );
  }

  if (guidance.length > 0) {
    return guidance.join(" ");
  }

  if (
    weather.riskLevel === "critical" ||
    weather.riskLevel === "high"
  ) {
    return "Drive cautiously and allow extra time for changing weather conditions.";
  }

  if (weather.riskLevel === "medium") {
    return "Stay alert for changing weather and road conditions.";
  }

  return "No significant weather-related driving adjustment is currently indicated.";
}
type ActiveRouteSafetyWarning = {
  threat: ActiveRouteSafetyThreat;
  distanceAheadMeters: number;
};

function activeRouteSafetyVoiceKey(
  warning: ActiveRouteSafetyWarning
): string {
  const threat =
    warning.threat;

  const id =
    typeof threat.id === "string"
      ? threat.id.trim()
      : "";

  if (id) {
    return `route-safety-threat:${id}`;
  }

  const type =
    typeof threat.type === "string"
      ? threat.type
          .trim()
          .toLowerCase()
      : "unknown";

  const latitude =
    Number(threat.latitude);

  const longitude =
    Number(threat.longitude);

  const coordinateKey =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
      ? `${latitude.toFixed(5)}:${longitude.toFixed(5)}`
      : "unknown-location";

  return `route-safety-threat:${type}:${coordinateKey}`;
}

function trafficCalmingAwarenessLabel(
  threat: ActiveRouteSafetyThreat
): string | null {
  const context =
    threat.trafficCalmingContext;

  if (!context) {
    return null;
  }

  if (context.featureType === "speed_bump") {
    return "Speed bump";
  }

  if (
    context.featureType ===
    "raised_intersection"
  ) {
    return "Raised intersection";
  }

  return null;
}
function incidentAwarenessLabel(
  threat: ActiveRouteSafetyThreat
): string | null {
  const type =
    typeof threat.type === "string"
      ? threat.type.trim().toLowerCase()
      : "";

  const title =
    typeof threat.title === "string"
      ? threat.title.trim()
      : "";

  /*
   * Aggregated road-risk threats intentionally carry a generic backend
   * title. The dominant incident type already identifies what the driver
   * is approaching, so expose that existing intelligence without changing
   * prediction, scoring, routing, or API ownership.
   *
   * Specific provider / community titles remain authoritative.
   */
  const mayUseIncidentType =
    !title ||
    title.toLowerCase() ===
      "aggregated road-risk segment";

  if (!mayUseIncidentType) {
    return null;
  }

  const labels: Record<string, string> = {
    road_closure: "Road closure",
    lane_closure: "Lane closure",
    collision: "Accident",
    roadblock: "Roadblock",
    protest: "Protest activity",
    flooding: "Flooding",
    weather_hazard: "Weather hazard",
    vehicle_breakdown: "Vehicle breakdown",
    road_hazard: "Road hazard",
    roadworks: "Roadworks",
    congestion: "Heavy congestion",
    traffic_light_outage:
      "Traffic light outage",
    smash_grab_hotspot:
      "High-risk area",
  };

  return labels[type] ?? null;
}

function activeRouteSafetyVoiceTitle(
  threat: ActiveRouteSafetyThreat
): string {
  const trafficCalmingLabel =
    trafficCalmingAwarenessLabel(threat);

  if (trafficCalmingLabel) {
    return trafficCalmingLabel;
  }

  const incidentLabel =
    incidentAwarenessLabel(threat);

  if (incidentLabel) {
    return incidentLabel;
  }

  const title =
    typeof threat.title === "string"
      ? threat.title.trim()
      : "";

  if (title) {
    return title;
  }

  const type =
    typeof threat.type === "string"
      ? threat.type.trim()
      : "";

  if (!type) {
    return "Route safety hazard";
  }

  return type
    .replace(/[_-]+/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

type SaferRouteOffer = {
  route: RouteOption;
  baselineRoute: RouteOption | null;
  threatKey: string;
  durationMinutes: number | null;
};


function routeGeometryFingerprint(
  route: RouteOption | null
): string {
  if (
    !route?.routePoints ||
    route.routePoints.length < 2
  ) {
    return "";
  }

  const points =
    route.routePoints;

  const indexes =
    Array.from(
      new Set([
        0,
        Math.floor(
          (points.length - 1) * 0.25
        ),
        Math.floor(
          (points.length - 1) * 0.5
        ),
        Math.floor(
          (points.length - 1) * 0.75
        ),
        points.length - 1,
      ])
    );

  return indexes
    .map((index) => {
      const point =
        points[index];

      return [
        Number(point[0]).toFixed(5),
        Number(point[1]).toFixed(5),
      ].join(",");
    })
    .join("|");
}

/*
 * A reroute generated from the driver's current position naturally has
 * a different start point from the original full route.
 *
 * Therefore a start/end fingerprint alone cannot decide whether it is
 * genuinely an alternative.
 *
 * Sample the candidate route and project those points onto the existing
 * route. At least two samples must be more than 75 m from the current
 * route before HarborGuard calls it a materially different alternative.
 */
function routeMateriallyDiffersFromActiveRoute(
  candidate: RouteOption | null,
  activeRoutePoints: LatLng[]
): boolean {
  if (
    !candidate?.routePoints ||
    candidate.routePoints.length < 2 ||
    activeRoutePoints.length < 2
  ) {
    return false;
  }

  const candidatePoints =
    candidate.routePoints;

  const indexes =
    Array.from(
      new Set([
        0,
        Math.floor(
          (candidatePoints.length - 1) * 0.25
        ),
        Math.floor(
          (candidatePoints.length - 1) * 0.5
        ),
        Math.floor(
          (candidatePoints.length - 1) * 0.75
        ),
        candidatePoints.length - 1,
      ])
    );

  let divergentSamples =
    0;

  for (const index of indexes) {
    const point =
      candidatePoints[index];

    const projection =
      calculateRouteProgress(
        point,
        activeRoutePoints
      );

    if (
      !projection ||
      !Number.isFinite(
        projection.distanceFromRouteMeters
      ) ||
      projection.distanceFromRouteMeters >
        75
    ) {
      divergentSamples += 1;
    }
  }

  return divergentSamples >= 2;
}

function routeDurationMinutes(
  route: RouteOption | null
): number | null {
  if (!route) {
    return null;
  }

  if (
    route.durationSeconds != null &&
    Number.isFinite(
      Number(route.durationSeconds)
    )
  ) {
    return Math.max(
      1,
      Math.round(
        Number(route.durationSeconds) / 60
      )
    );
  }

  if (route.duration) {
    const seconds =
      Number(
        String(route.duration)
          .replace("s", "")
      );

    if (Number.isFinite(seconds)) {
      return Math.max(
        1,
        Math.round(
          seconds / 60
        )
      );
    }
  }

  return null;
}

function alternativeRouteTimeComparisonLabel(
  baselineRoute: RouteOption | null,
  alternativeRoute: RouteOption | null
): string | null {
  const baselineMinutes =
    routeDurationMinutes(
      baselineRoute
    );

  const alternativeMinutes =
    routeDurationMinutes(
      alternativeRoute
    );

  if (
    baselineMinutes == null ||
    alternativeMinutes == null
  ) {
    return null;
  }

  const differenceMinutes =
    alternativeMinutes -
    baselineMinutes;

  if (differenceMinutes === 0) {
    return "About the same estimated travel time";
  }

  if (differenceMinutes > 0) {
    return `${differenceMinutes} min longer than the current-path estimate`;
  }

  return `${Math.abs(
    differenceMinutes
  )} min faster than the current-path estimate`;
}

function saferRouteDecisionIntelligence(
  baselineRoute: RouteOption | null,
  alternativeRoute: RouteOption | null
): {
  recommended: boolean;
  safetyImprovement: number | null;
  riskReduction: number | null;
} {
  const baselineSafety =
    baselineRoute?.safetyScore != null
      ? Number(baselineRoute.safetyScore)
      : null;

  const alternativeSafety =
    alternativeRoute?.safetyScore != null
      ? Number(alternativeRoute.safetyScore)
      : null;

  const baselineRisk =
    baselineRoute?.riskScore != null
      ? Number(baselineRoute.riskScore)
      : null;

  const alternativeRisk =
    alternativeRoute?.riskScore != null
      ? Number(alternativeRoute.riskScore)
      : null;

  const hasComparableSafety =
    baselineSafety != null &&
    alternativeSafety != null &&
    Number.isFinite(baselineSafety) &&
    Number.isFinite(alternativeSafety);

  const hasComparableRisk =
    baselineRisk != null &&
    alternativeRisk != null &&
    Number.isFinite(baselineRisk) &&
    Number.isFinite(alternativeRisk);

  const safetyImprovement =
    hasComparableSafety
      ? Math.round(
          alternativeSafety - baselineSafety
        )
      : null;

  const riskReduction =
    hasComparableRisk
      ? Math.round(
          baselineRisk - alternativeRisk
        )
      : null;

  return {
    recommended:
      safetyImprovement != null &&
      riskReduction != null &&
      safetyImprovement > 0 &&
      riskReduction > 0,
    safetyImprovement,
    riskReduction,
  };
}
function routeSafetyExplanation(
  route: RouteOption | null
): string | null {
  if (
    !route ||
    route.safetyScore == null ||
    route.riskScore == null
  ) {
    return null;
  }

  const safetyScore =
    Number(route.safetyScore);

  const riskScore =
    Number(route.riskScore);

  if (
    !Number.isFinite(safetyScore) ||
    !Number.isFinite(riskScore)
  ) {
    return null;
  }

  if (
    safetyScore >= 85 &&
    riskScore <= 20
  ) {
    return "High safety score with low calculated road risk.";
  }

  if (
    safetyScore >= 70 &&
    riskScore <= 40
  ) {
    return "Good safety score with moderate calculated road risk.";
  }

  if (riskScore >= 70) {
    return "Elevated calculated road risk. Review the route assessment before continuing.";
  }

  if (riskScore >= 40) {
    return "Moderate calculated road risk. Stay alert to changing road conditions.";
  }

  return "HarborGuard found a balanced route based on the current safety and risk scores.";
}

function matchedRiskSegmentLabel(
  route: RouteOption | null
): string | null {
  if (
    !route ||
    route.matchedRiskSegmentCount == null
  ) {
    return null;
  }

  const count =
    Math.max(
      0,
      Math.round(
        Number(route.matchedRiskSegmentCount)
      )
    );

  if (!Number.isFinite(count)) {
    return null;
  }

  return `${count} matched road risk segment${
    count === 1 ? "" : "s"
  }`;
}
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

const OVERSPEED_TOLERANCE_KPH = 5;
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
    instruction.voiceText?.trim() ||
    instruction.text?.trim() ||
    [
      instruction.action,
      instruction.direction,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const landmark =
    instruction.landmark?.trim() ||
    "";

  const contextualRaw =
    landmark &&
    !raw
      .toLocaleLowerCase()
      .includes(
        landmark.toLocaleLowerCase()
      )
      ? `${raw}. Landmark: ${landmark}`
      : raw;

  return contextualRaw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const AUTO_REROUTE_OFF_ROUTE_THRESHOLD = 45;
const AUTO_REROUTE_ACCURACY_MULTIPLIER = 1.5;
const AUTO_REROUTE_SUSTAINED_MS = 4000;
const AUTO_REROUTE_COOLDOWN_MS = 15000;

/*
 * Above this accuracy radius, the current GPS fix is too uncertain
 * for state-changing navigation decisions such as arrival or
 * automatic rerouting.
 */
const GPS_POOR_ACCURACY_METERS = 200;

function gpsAccuracyIsPoor(
  accuracy: number | null | undefined
): boolean {
  const numericAccuracy = Number(accuracy);

  return (
    Number.isFinite(numericAccuracy) &&
    numericAccuracy > GPS_POOR_ACCURACY_METERS
  );
}
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


  /*
   * Destination-search generation fence.
   *
   * A newer search or destination text edit increments this
   * value. Older requests may finish, but they are forbidden
   * from publishing stale UI state.
   */
  const destinationSearchRequestIdRef =
    useRef(0);
  const destinationSearchAbortControllerRef =
    useRef<AbortController | null>(null);

  /*
   * Monotonic manual-route request generation.
   *
   * Only the newest manual route calculation may publish route state.
   * Destination, profile and navigation lifecycle changes invalidate
   * older in-flight calculations.
   */
  const manualRouteRequestIdRef =
    useRef(0);
  const manualRouteAbortControllerRef =
    useRef<AbortController | null>(null);
  const offRouteStartedAtRef =
    useRef<number | null>(null);

  const lastAutoRerouteAtRef =
    useRef(0);

  const autoRerouteInFlightRef =
    useRef(false);


  /*
   * Monotonic automatic-reroute generation.
   *
   * Navigation lifecycle changes and newer route intent invalidate
   * older automatic reroutes. Only the current generation may
   * publish route state, errors or completion state.
   */
  const autoRerouteRequestIdRef =
    useRef(0);
  const autoRerouteAbortControllerRef =
    useRef<AbortController | null>(null);
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
  /*
   * Customer-facing Route Safety intelligence.
   *
   * This does not create another safety engine.
   * The existing /api/route-safety/predict pipeline remains the
   * authoritative source for route-relevant threats.
   */
  const [
    activeRouteSafetyThreats,
    setActiveRouteSafetyThreats,
  ] =
    useState<ActiveRouteSafetyThreat[]>([]);

  /*
   * Customer Increment #13
   * ----------------------
   * Reuse the existing Route Safety prediction response to
   * surface simple live road intelligence to the driver.
   * No additional traffic or weather request is introduced.
   */
  const [
    liveRoadIntelligence,
    setLiveRoadIntelligence,
  ] =
    useState<LiveRoadIntelligence | null>(null);

  /*
   * Customer Increment #15
   * ----------------------
   * Route weather comes from the existing Route Safety prediction.
   * No second weather request is made by Safe Navigation.
   */
  const [
    routeWeatherIntelligence,
    setRouteWeatherIntelligence,
  ] =
    useState<RouteWeatherIntelligence | null>(null);

  const activeRouteSafetyThreatRequestIdRef =
    useRef(0);

  const activeRouteSafetyThreatAbortControllerRef =
    useRef<AbortController | null>(null);

  const activeRouteSafetyThreatRouteKeyRef =
    useRef("");

  /*
   * Customer Increment #5
   * ---------------------
   * Driver confirmation is explicit and locally one-shot.
   *
   * GPS ticks and rerenders never own this request lifecycle.
   */
  const [
    hazardConfirmationStateByAlertId,
    setHazardConfirmationStateByAlertId,
  ] = useState<
    Record<
      string,
      "submitting" | "confirmed" | "failed"
    >
  >({});

  const hazardConfirmationInFlightRef =
    useRef<Set<string>>(new Set());

  const confirmedHazardAlertIdsRef =
    useRef<Set<string>>(new Set());

  /*
   * Customer Increment #7
   * ---------------------
   * Negative live-hazard feedback has its own request lifecycle.
   */
  const [
    hazardResolutionStateByAlertId,
    setHazardResolutionStateByAlertId,
  ] = useState<
    Record<
      string,
      "submitting" | "resolved" | "failed"
    >
  >({});

  const hazardResolutionInFlightRef =
    useRef<Set<string>>(new Set());

  const resolvedHazardAlertIdsRef =
    useRef<Set<string>>(new Set());

  /*
   * Customer Increment #2
   * ---------------------
   * Background safer-route discovery has its own ownership.
   * It must not interfere with manual calculation or automatic reroute.
   */
  const [
    saferRouteOffer,
    setSaferRouteOffer,
  ] =
    useState<SaferRouteOffer | null>(null);

  const [
    saferRouteOfferLoading,
    setSaferRouteOfferLoading,
  ] =
    useState(false);

  const saferRouteOfferRequestIdRef =
    useRef(0);

  const saferRouteOfferAbortControllerRef =
    useRef<AbortController | null>(null);

  const saferRouteOfferKeyRef =
    useRef("");

  const lastSpokenAnnouncementRef =
    useRef<Set<string>>(new Set());

  const overspeedVoiceArmedRef =
    useRef(true);

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

  const simulatorSpeedKmhRef =
    useRef(20);

  const simulatorIndexRef =
    useRef(0);
  const navigationOwnsSimulatorRouteRef =
    useRef(false);

  const [simulatorRunning, setSimulatorRunning] =
    useState(false);

  const [simulatorMessage, setSimulatorMessage] =
    useState("Simulator ready");

  const simulatorEnabled =
    process.env.NODE_ENV === "development";

  const [position, setPosition] =
    useState<PositionState | null>(null);

  /*
   * Customer Increment #9 Part A
   * ----------------------------
   * Safe Navigation establishes explicit vehicle context before
   * any later emergency action can be exposed.
   *
   * Vehicle identity is loaded from the existing authenticated,
   * organization-scoped fleet endpoint.
   */
  const [
    safeNavigationVehicles,
    setSafeNavigationVehicles,
  ] = useState<SafeNavigationVehicleOption[]>([]);

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] = useState("");

  const [
    vehicleContextLoading,
    setVehicleContextLoading,
  ] = useState(false);

  const [
    vehicleContextMessage,
    setVehicleContextMessage,
  ] = useState("");

  const [gpsActive, setGpsActive] = useState(false);
  const [gpsMessage, setGpsMessage] =
    useState("GPS is off");

  /*
   * CUSTOMER INCREMENT #6 PART B
   * ----------------------------
   * Driver-originated hazard reporting reuses the existing Safe
   * Navigation GPS position and the hardened Route Safety report API.
   */
  const [hazardReportOpen, setHazardReportOpen] =
    useState(false);

  const [hazardReportType, setHazardReportType] =
    useState("roadblock");

  const [
    hazardReportSeverity,
    setHazardReportSeverity,
  ] =
    useState("medium");

  const [
    hazardReportDescription,
    setHazardReportDescription,
  ] =
    useState("");

  const [
    hazardReportSubmitting,
    setHazardReportSubmitting,
  ] =
    useState(false);

  /*
   * Customer Increment #9 Part B
   * ----------------------------
   * Emergency SOS deliberately uses a two-step confirmation.
   * Opening the confirmation performs no mutation.
   * Only the explicit confirmation sends /api/fleet/panic.
   */
  const [
    panicConfirmOpen,
    setPanicConfirmOpen,
  ] = useState(false);

  const [
    panicSending,
    setPanicSending,
  ] = useState(false);

  const [
    panicMessage,
    setPanicMessage,
  ] = useState("");

  const [
    hazardReportMessage,
    setHazardReportMessage,
  ] =
    useState("");

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
    activeDestinationResultIndex,
    setActiveDestinationResultIndex,
  ] =
    useState(-1);

  const [
    selectedDestination,
    setSelectedDestination,
  ] =
    useState<NavigationSearchResult | null>(
      null
    );

  const calculateRouteButtonRef =
    useRef<HTMLButtonElement | null>(null);

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

  /*
   * Customer Increment #8
   * ---------------------
   * This flag means a destination was restored after a page refresh,
   * but no stale route/navigation state was restored.
   *
   * A fresh route must still be calculated from current GPS position.
   */
  const [
    refreshRecoveryAvailable,
    setRefreshRecoveryAvailable,
  ] = useState(false);

  const refreshRecoveryReadyRef =
    useRef(false);

  const refreshRecoveryStorageKey =
    "harborguard:safe-navigation:active-session:v1";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored =
        window.sessionStorage.getItem(
          refreshRecoveryStorageKey
        );

      if (!stored) {
        refreshRecoveryReadyRef.current = true;
        return;
      }

      const parsed =
        JSON.parse(stored) as {
          destinationLat?: string;
          destinationLng?: string;
          destinationName?: string;
          selectedDestination?:
            NavigationSearchResult | null;
          routingProfile?: string;
        };

      setDestinationLat(
        typeof parsed.destinationLat === "string"
          ? parsed.destinationLat
          : ""
      );

      setDestinationLng(
        typeof parsed.destinationLng === "string"
          ? parsed.destinationLng
          : ""
      );

      setDestinationName(
        typeof parsed.destinationName === "string" &&
          parsed.destinationName.trim()
          ? parsed.destinationName
          : "Destination"
      );

      setSelectedDestination(
        parsed.selectedDestination ?? null
      );

      setRoutingProfile(
        typeof parsed.routingProfile === "string" &&
          parsed.routingProfile
          ? parsed.routingProfile
          : "safest"
      );

      /*
       * Refresh restores destination convenience only.
       * Active route/navigation state must be recalculated
       * explicitly by the driver after a page reload.
       */
      setRoutes([]);
      setSelectedRouteIndex(0);
      setNavigationInstructions([]);
      setRecommendation(null);
      setRouting(false);
      setFollowVehicle(true);
      setVoiceEnabled(false);
      setVoiceStatusMessage(
        "Voice guidance off"
      );
      setRefreshRecoveryAvailable(true);

      setRoutingMessage(
        "Destination restored after refresh. Calculate a route when you are ready."
      );
    } catch {
      setRefreshRecoveryAvailable(false);

      window.sessionStorage.removeItem(
        refreshRecoveryStorageKey
      );
    } finally {
      refreshRecoveryReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (
      !refreshRecoveryReadyRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const hasRecoverableDestination =
      selectedDestination !== null ||
      (
        destinationLat.trim().length > 0 &&
        destinationLng.trim().length > 0
      ) ||
      (
        destinationName.trim().length > 0 &&
        destinationName !== "Destination"
      );

    if (!hasRecoverableDestination) {
      window.sessionStorage.removeItem(
        refreshRecoveryStorageKey
      );

      return;
    }

    try {
      window.sessionStorage.setItem(
        refreshRecoveryStorageKey,
        JSON.stringify({
          destinationLat,
          destinationLng,
          destinationName,
          selectedDestination,
          routingProfile,
        })
      );
    } catch {
      /*
       * Destination recovery is best-effort.
       * Navigation continues if session storage is unavailable.
       */
    }
  }, [
    destinationLat,
    destinationLng,
    destinationName,
    selectedDestination,
    routingProfile,
  ]);

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
  useEffect(() => {
    return () => {
      /*
       * Invalidate and cancel destination search work when this
       * page leaves the component tree. The request-ID increment
       * prevents the abort rejection from publishing stale state.
       */
      destinationSearchRequestIdRef.current += 1;
      destinationSearchAbortControllerRef.current?.abort();
      destinationSearchAbortControllerRef.current = null;
    };
  }, []);
  useEffect(() => {
    return () => {
      /*
       * Invalidate and cancel manual route work when this page
       * leaves the component tree.
       */
      manualRouteRequestIdRef.current += 1;
      manualRouteAbortControllerRef.current?.abort();
      manualRouteAbortControllerRef.current = null;
    };
  }, []);
  useEffect(() => {
    return () => {
      /*
       * Invalidate and physically cancel automatic reroute work
       * when this page leaves the component tree.
       */
      autoRerouteRequestIdRef.current += 1;
      autoRerouteAbortControllerRef.current?.abort();
      autoRerouteAbortControllerRef.current = null;
      autoRerouteInFlightRef.current = false;
    };
  }, []);

  const selectedVehicle =
    useMemo(
      () =>
        safeNavigationVehicles.find(
          (vehicle) =>
            vehicle.id === selectedVehicleId
        ) || null,
      [
        safeNavigationVehicles,
        selectedVehicleId,
      ]
    );

  const selectedVehicleTripId =
    selectedVehicle?.activeTrip?.id || null;

  useEffect(() => {
    let cancelled = false;

    async function loadSafeNavigationVehicles() {
      try {
        setVehicleContextLoading(true);
        setVehicleContextMessage("");

        const response =
          await fetchWithAuth(
            "/api/fleet/live",
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            | SafeNavigationFleetResponse
            | { error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setSafeNavigationVehicles([]);
          setSelectedVehicleId("");

          setVehicleContextMessage(
            "Could not load vehicles for Safe Navigation."
          );

          return;
        }

        const fleet =
          (result as SafeNavigationFleetResponse)
            .fleet || [];

        setSafeNavigationVehicles(fleet);

        /*
         * Never silently choose from several vehicles.
         * One authorized vehicle may safely auto-select;
         * multiple vehicles require explicit driver choice.
         */
        setSelectedVehicleId(
          (current) => {
            if (
              current &&
              fleet.some(
                (vehicle) =>
                  vehicle.id === current
              )
            ) {
              return current;
            }

            if (fleet.length === 1) {
              return fleet[0].id;
            }

            return "";
          }
        );

        if (fleet.length === 0) {
          setVehicleContextMessage(
            "No vehicles are available for this organization."
          );
        }
      } catch {
        if (!cancelled) {
          setSafeNavigationVehicles([]);
          setSelectedVehicleId("");

          setVehicleContextMessage(
            "Could not load vehicles for Safe Navigation."
          );
        }
      } finally {
        if (!cancelled) {
          setVehicleContextLoading(false);
        }
      }
    }

    void loadSafeNavigationVehicles();

    return () => {
      cancelled = true;
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
  const routingDestination = useMemo(() => {
    if (!destination) {
      return null;
    }

    const hasAccessPoint =
      selectedDestination !== null &&
      typeof selectedDestination.accessLat === "number" &&
      typeof selectedDestination.accessLng === "number" &&
      Number.isFinite(selectedDestination.accessLat) &&
      Number.isFinite(selectedDestination.accessLng);

    if (!hasAccessPoint) {
      return {
        lat: destination[0],
        lng: destination[1],
      };
    }

    return {
      lat: selectedDestination.accessLat as number,
      lng: selectedDestination.accessLng as number,
      sideOfStreetHint: {
        lat: selectedDestination.lat,
        lng: selectedDestination.lng,
      },
    };
  }, [
    destination,
    selectedDestination,
  ]);

  const arrivalTarget =
    useMemo<LatLng | null>(() => {
      if (!routingDestination) {
        return destination;
      }

      const lat =
        Number(routingDestination.lat);

      const lng =
        Number(routingDestination.lng);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return destination;
      }

      return [lat, lng];
    }, [
      destination,
      routingDestination,
    ]);
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

    /*
     * Stop DEV simulator playback as part of the same GPS lifecycle.
     * Without this, the next simulator tick can set gpsActive=true again.
     */
    clearSimulatorTimer();
    setSimulatorRunning(false);

    /*
     * Cancel any pending off-route decision that was based on movement
     * before GPS tracking was stopped.
     */
    clearOffRouteTimer();
    offRouteStartedAtRef.current = null;

    /*
     * GPS loss invalidates any destination search still in flight.
     * Prevent a late search response from publishing results after
     * live positioning has stopped.
     */
    destinationSearchRequestIdRef.current += 1;
    destinationSearchAbortControllerRef.current?.abort();
    destinationSearchAbortControllerRef.current = null;
    setDestinationSearching(false);

    /*
     * Search loading state and routingMessage are independent.
     * Replace any search-owned lifecycle message when GPS stops.
     */
    setRoutingMessage(
      "GPS stopped. Start GPS to search or calculate a route."
    );

    /*
     * GPS loss invalidates any manual route calculation still in flight.
     * Prevent a late manual response from publishing route state after
     * live positioning has stopped.
     */
    manualRouteRequestIdRef.current += 1;
    manualRouteAbortControllerRef.current?.abort();
    manualRouteAbortControllerRef.current = null;
    setRouting(false);

    /*
     * GPS loss invalidates any automatic reroute already in flight.
     * Prevent a late response from publishing route state after live
     * positioning has stopped.
     */
    autoRerouteRequestIdRef.current += 1;
    autoRerouteAbortControllerRef.current?.abort();
    autoRerouteAbortControllerRef.current = null;
    autoRerouteInFlightRef.current = false;
    setAutoRerouteActive(false);
    setAutoRerouteMessage("");

    /*
     * GPS-dependent voice guidance stops with live positioning.
     */
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    lastSpokenAnnouncementRef.current.clear();
    overspeedVoiceArmedRef.current = true;

    /*
     * Preserve the last known map position, but remove stale motion
     * from the HUD while GPS tracking is stopped.
     */
    setPosition((current) =>
      current
        ? {
            ...current,
            speedKmh: 0,
          }
        : current
    );

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
          gpsAccuracyIsPoor(gps.coords.accuracy)
            ? `GPS accuracy poor - ${Math.round(
                gps.coords.accuracy
              )} m. Waiting for a better location fix.`
            : `GPS live - accuracy ${Math.round(
                gps.coords.accuracy
              )} m`
        );
      },
      (error) => {
        const isTerminalPermissionError =
          error.code === error.PERMISSION_DENIED;

        /*
         * Permission denial is terminal for the current watch.
         * POSITION_UNAVAILABLE and TIMEOUT are transient watch errors:
         * keep the watch alive so a later good fix can recover without
         * forcing the driver to restart GPS manually.
         */
        if (
          isTerminalPermissionError &&
          watchIdRef.current !== null &&
          typeof navigator !== "undefined" &&
          navigator.geolocation
        ) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        clearOffRouteTimer();
        offRouteStartedAtRef.current = null;

        if (isTerminalPermissionError) {
          /*
           * Terminal GPS permission loss invalidates any destination
           * search still in flight so a late response cannot publish
           * results after live positioning has been lost.
           */
          destinationSearchRequestIdRef.current += 1;
          destinationSearchAbortControllerRef.current?.abort();
          destinationSearchAbortControllerRef.current = null;
          setDestinationSearching(false);

          /*
           * Permission denial owns the terminal lifecycle message.
           * Do not leave stale destination-search text visible.
           */
          setRoutingMessage(
            "Location permission was denied. Enable location access for HarborGuard and tap Start GPS again."
          );
        }

        /*
         * GPS failure invalidates any manual route calculation still in flight.
         * Prevent a late manual response from publishing route state after
         * live positioning has been lost.
         */
        manualRouteRequestIdRef.current += 1;
        manualRouteAbortControllerRef.current?.abort();
        manualRouteAbortControllerRef.current = null;
        setRouting(false);

        /*
         * GPS failure invalidates any automatic reroute already in flight.
         * Prevent a late response from publishing route state after live
         * positioning has been lost.
         */
        autoRerouteRequestIdRef.current += 1;
        autoRerouteAbortControllerRef.current?.abort();
        autoRerouteAbortControllerRef.current = null;
        autoRerouteInFlightRef.current = false;
        setAutoRerouteActive(false);
        setAutoRerouteMessage("");

        if (
          typeof window !== "undefined" &&
          "speechSynthesis" in window
        ) {
          window.speechSynthesis.cancel();
        }

        lastSpokenAnnouncementRef.current.clear();
        overspeedVoiceArmedRef.current = true;

        if (voiceEnabled) {
          setVoiceStatusMessage(
            "Voice guidance on"
          );
        }

        /*
         * Do not leave the last measured speed visible after GPS failure.
         */
        setPosition((current) =>
          current
            ? {
                ...current,
                speedKmh: 0,
                accuracy:
                  isTerminalPermissionError
                    ? current.accuracy
                    : Math.max(
                        current.accuracy,
                        GPS_POOR_ACCURACY_METERS + 1
                      ),
              }
            : current
        );

        /*
         * Keep transient watch failures in an active recovery state.
         * Existing poor-GPS gating suppresses arrival, reroute, turn
         * progression and voice until a trustworthy fix arrives.
         */
        setGpsActive(!isTerminalPermissionError);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsMessage(
              "Location permission was denied. Enable location access for HarborGuard and tap Start GPS again."
            );
            break;

          case error.POSITION_UNAVAILABLE:
            setGpsMessage(
              "GPS signal temporarily unavailable. Waiting for location recovery."
            );
            break;

          case error.TIMEOUT:
            setGpsMessage(
              "GPS update timed out. Waiting for the next location fix."
            );
            break;

          default:
            setGpsMessage(
              "GPS could not start. Check location services and try again."
            );
            break;
        }
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
        message: string,
        interruptExisting = false
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
          if (!interruptExisting) {
            return false;
          }

          speechEngine.cancel();
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

  type ArrivalSide =
  | "left"
  | "right"
  | null;

function classifyArrivalSide(
  routePoints: LatLng[],
  accessPoint: LatLng | null,
  poiPoint: LatLng | null
): ArrivalSide {
  if (
    routePoints.length < 2 ||
    !accessPoint ||
    !poiPoint
  ) {
    return null;
  }

  const latitudeRadians =
    (accessPoint[0] * Math.PI) / 180;

  const metersPerDegreeLatitude =
    111_320;

  const metersPerDegreeLongitude =
    metersPerDegreeLatitude *
    Math.cos(latitudeRadians);

  const toLocalMeters = (
    point: LatLng
  ) => ({
    x:
      (point[1] - accessPoint[1]) *
      metersPerDegreeLongitude,
    y:
      (point[0] - accessPoint[0]) *
      metersPerDegreeLatitude,
  });

  const poiVector =
    toLocalMeters(poiPoint);

  const poiDistanceMeters =
    Math.hypot(
      poiVector.x,
      poiVector.y
    );

  if (poiDistanceMeters < 2) {
    return null;
  }

  let approachPoint: LatLng | null =
    null;

  for (
    let index = routePoints.length - 1;
    index >= 0;
    index -= 1
  ) {
    const candidate =
      routePoints[index];

    const candidateVector =
      toLocalMeters(candidate);

    const distanceFromAccessMeters =
      Math.hypot(
        candidateVector.x,
        candidateVector.y
      );

    if (
      distanceFromAccessMeters >= 15
    ) {
      approachPoint =
        candidate;

      break;
    }
  }

  if (!approachPoint) {
    return null;
  }

  const approachLocal =
    toLocalMeters(approachPoint);

  const approachVector = {
    x: -approachLocal.x,
    y: -approachLocal.y,
  };

  const approachMagnitude =
    Math.hypot(
      approachVector.x,
      approachVector.y
    );

  if (approachMagnitude < 1) {
    return null;
  }

  const signedCrossProduct =
    approachVector.x *
      poiVector.y -
    approachVector.y *
      poiVector.x;

  const normalizedCrossProduct =
    signedCrossProduct /
    (
      approachMagnitude *
      poiDistanceMeters
    );

  /*
   * Avoid claiming a side when the POI
   * is nearly straight ahead or behind.
   */
  if (
    Math.abs(
      normalizedCrossProduct
    ) < 0.21
  ) {
    return null;
  }

  return normalizedCrossProduct > 0
    ? "left"
    : "right";
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
          : simulatorSpeedKmhRef.current,
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

    /*
     * Force Off Route becomes the sole position owner for this
     * DEV test. A live browser geolocation watch would otherwise
     * overwrite the forced position and repeatedly cancel the
     * sustained off-route confirmation timer.
     */
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );
      watchIdRef.current = null;
    }

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

    /*
     * The production detector measures distance against the complete
     * active route, not merely the current simulator segment.
     *
     * Try increasing offsets on both sides of the current segment and
     * accept only a point that calculateRouteProgress confirms is
     * genuinely outside the route corridor.
     */
    const candidateOffsetsMeters =
      [220, 300, 400, 550, 750, 1000];

    let forcedPosition:
      | {
          lat: number;
          lng: number;
          distanceFromRouteMeters: number;
          offsetMeters: number;
        }
      | null = null;

    for (
      const offsetMeters of
        candidateOffsetsMeters
    ) {
      for (
        const direction of [1, -1]
      ) {
        const candidateLat =
          current[0] +
          (perpendicularLat *
            offsetMeters *
            direction) /
            metersPerLatitudeDegree;

        const candidateLng =
          current[1] +
          (perpendicularLng *
            offsetMeters *
            direction) /
            metersPerLongitudeDegree;

        const candidateProgress =
          calculateRouteProgress(
            [
              candidateLat,
              candidateLng,
            ],
            routePoints
          );

        if (
          candidateProgress &&
          Number.isFinite(
            candidateProgress.distanceFromRouteMeters
          ) &&
          candidateProgress.distanceFromRouteMeters >
            AUTO_REROUTE_OFF_ROUTE_THRESHOLD +
              50
        ) {
          forcedPosition = {
            lat: candidateLat,
            lng: candidateLng,
            distanceFromRouteMeters:
              candidateProgress.distanceFromRouteMeters,
            offsetMeters,
          };

          break;
        }
      }

      if (forcedPosition) {
        break;
      }
    }

    if (!forcedPosition) {
      setSimulatorMessage(
        "Could not generate a position safely outside the active route corridor."
      );

      return;
    }

    const heading =
      simulatorBearing(
        current,
        next
      );

    clearOffRouteTimer();

    offRouteStartedAtRef.current =
      null;

    setPosition({
      lat: forcedPosition.lat,
      lng: forcedPosition.lng,
      speedKmh: 25,
      heading,
      accuracy: position && gpsAccuracyIsPoor(position.accuracy) ? position.accuracy : 5,
    });

    setGpsActive(true);
    setFollowVehicle(true);

    setGpsMessage(
      "DEV simulator forced off route"
    );

    setSimulatorMessage(
      `Forced ${Math.round(
        forcedPosition.distanceFromRouteMeters
      )} m from the active route using a ${forcedPosition.offsetMeters} m test offset. Hold position to test automatic rerouting.`
    );

    setAutoRerouteMessage("");
  }
  function forceSimulatorPoorGps() {
    if (!simulatorEnabled) {
      return;
    }

    clearSimulatorTimer();
    setSimulatorRunning(false);
    clearOffRouteTimer();
    offRouteStartedAtRef.current = null;

    /*
     * This DEV-only control owns the simulated position while
     * poor-GPS behavior is being tested. Prevent the browser
     * geolocation watch from immediately overwriting it.
     */
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setPosition((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        speedKmh: 0,
        accuracy: 250,
      };
    });

    setGpsActive(true);
    setGpsMessage(
      "DEV poor GPS - accuracy 250 m. Waiting for a better location fix."
    );
    setSimulatorMessage(
      "Poor GPS test active - simulated accuracy 250 m."
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

    if (!navigationOwnsSimulatorRouteRef.current) {
      setSimulatorMessage(
        "Calculate a route before starting playback."
      );
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

  function endNavigation() {
    clearOffRouteTimer();

    /*
     * Navigation termination also invalidates destination search
     * work so a late search response cannot overwrite the ended
     * navigation state.
     */
    destinationSearchRequestIdRef.current += 1;
    destinationSearchAbortControllerRef.current?.abort();
    destinationSearchAbortControllerRef.current = null;
    setDestinationSearching(false);


    /*
     * Navigation termination invalidates any manual route request
     * that may still be completing asynchronously.
     */
    manualRouteRequestIdRef.current += 1;
    manualRouteAbortControllerRef.current?.abort();
    manualRouteAbortControllerRef.current = null;

    /*
     * Navigation termination also invalidates any automatic reroute
     * that is still awaiting a response.
     */
    autoRerouteRequestIdRef.current += 1;
    autoRerouteAbortControllerRef.current?.abort();
    autoRerouteAbortControllerRef.current = null;
    offRouteStartedAtRef.current = null;
    lastAutoRerouteAtRef.current = 0;
    autoRerouteInFlightRef.current = false;
    /*
     * End Navigation owns safer-route discovery cleanup too.
     * A late response must never resurrect an offer after navigation ends.
     */
    saferRouteOfferRequestIdRef.current += 1;
    saferRouteOfferAbortControllerRef.current?.abort();
    saferRouteOfferAbortControllerRef.current =
      null;
    saferRouteOfferKeyRef.current =
      "";
    setSaferRouteOffer(null);
    setSaferRouteOfferLoading(false);


    navigationOwnsSimulatorRouteRef.current = false;

    pauseSyntheticDrive();

    /*
     * Ending navigation invalidates DEV simulator route ownership.
     * A future Start / Resume must build playback from the newly
     * calculated route instead of resuming stale route points.
     */
    simulatorPointsRef.current = [];
    simulatorIndexRef.current = 0;

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    lastSpokenAnnouncementRef.current.clear();
    overspeedVoiceArmedRef.current = true;

    /*
     * Ending navigation stops route-owned motion.
     * Preserve the last known map position while removing the
     * simulator/live speed that belonged to the ended route.
     */
    setPosition((current) =>
      current
        ? {
            ...current,
            speedKmh: 0,
          }
        : current
    );

    /*
     * speechSynthesis.cancel() does not guarantee that the canceled
     * utterance will run onend. Normalize the visible voice state
     * explicitly after ending navigation.
     */
    setVoiceStatusMessage(
      voiceEnabled
        ? "Voice guidance on"
        : "Voice guidance off"
    );

    setRoutes([]);
    setSelectedRouteIndex(0);
    setNavigationInstructions([]);
    setRecommendation(null);

    setAutoRerouteActive(false);
    setAutoRerouteMessage("");

    setRouting(false);
    setFollowVehicle(true);

    setRoutingMessage(
      "Navigation ended. Destination retained - calculate a route when you are ready."
    );
  }
  async function sendEmergencySos() {
    if (!selectedVehicleId) {
      setPanicMessage(
        "Select the vehicle you are driving before sending Emergency SOS."
      );
      setPanicConfirmOpen(false);
      return;
    }

    if (panicSending) {
      return;
    }

    setPanicSending(true);
    setPanicMessage("");

    try {
      const response =
        await fetchWithAuth(
          "/api/fleet/panic",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              vehicleId:
                selectedVehicleId,
              tripId:
                selectedVehicleTripId,
              message:
                "Safe Navigation Emergency SOS activated by driver.",
            }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          skipped?: string;
          message?: string;
          error?: string;
          alert?: {
            id?: string;
          };
        };

      if (!response.ok) {
        setPanicMessage(
          result.error ||
            "Could not confirm Emergency SOS. Retry if needed."
        );
        return;
      }

      if (
        result.skipped ===
        "duplicate_open_panic"
      ) {
        setPanicMessage(
          "Emergency SOS is already active for this vehicle. HarborGuard operations already has the alert."
        );
      } else {
        setPanicMessage(
          "Emergency SOS sent. HarborGuard operations has been alerted."
        );
      }

      setPanicConfirmOpen(false);
    } catch {
      setPanicMessage(
        "Could not confirm Emergency SOS. Retry if needed."
      );
    } finally {
      setPanicSending(false);
    }
  }

  async function searchDestination() {
    const query =
      destinationName.trim();

    /*
     * Every invocation gets a monotonically increasing ID.
     * Only the latest ID is allowed to publish search state.
     */
    const requestId =
      destinationSearchRequestIdRef.current + 1;

    destinationSearchRequestIdRef.current =
      requestId;

    destinationSearchAbortControllerRef.current?.abort();
    destinationSearchAbortControllerRef.current = null;

    if (query.length < 2) {
      setDestinationResults([]);
      setDestinationSearching(false);
      setRoutingMessage(
        "Enter at least two characters to search."
      );
      return;
    }

    const abortController =
      new AbortController();

    destinationSearchAbortControllerRef.current =
      abortController;

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
          `/api/navigation/search?${params.toString()}`,
          {
            signal: abortController.signal,
          }
        );

      /*
       * The request may have been superseded while fetch was
       * in flight.
       */
      if (
        requestId !==
        destinationSearchRequestIdRef.current
      ) {
        return;
      }

      const result =
        (await response.json()) as {
          results?: NavigationSearchResult[];
          error?: string;
        };

      /*
       * JSON parsing is asynchronous too, so re-check before
       * publishing anything.
       */
      if (
        requestId !==
        destinationSearchRequestIdRef.current
      ) {
        return;
      }

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
      /*
       * A failure from an obsolete request must not overwrite
       * the state belonging to the latest request.
       */
      if (
        requestId !==
        destinationSearchRequestIdRef.current
      ) {
        return;
      }

      setDestinationResults([]);
      setRoutingMessage(
        "Destination search failed."
      );
    } finally {
      /*
       * A stale request must not clear the loading state of a
       * newer request.
       */
      if (
        destinationSearchAbortControllerRef.current ===
        abortController
      ) {
        destinationSearchAbortControllerRef.current = null;
      }

      if (
        requestId ===
        destinationSearchRequestIdRef.current
      ) {
        setDestinationSearching(false);
      }
    }
  }
  const autoRerouteFromCurrentPosition =
    useCallback(
      async (
        reroutePosition: PositionState
      ) => {
        if (
          !destination ||
          !routingDestination ||
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

        /*
         * Each automatic reroute receives a generation ID.
         * Only this generation may publish response-derived state.
         */
        const requestId =
          autoRerouteRequestIdRef.current + 1;

        autoRerouteRequestIdRef.current =
          requestId;

        autoRerouteAbortControllerRef.current?.abort();

        const autoRerouteAbortController =
          new AbortController();

        autoRerouteAbortControllerRef.current =
          autoRerouteAbortController;

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
                signal: autoRerouteAbortController.signal,
                body: JSON.stringify({
                  origin: {
                    lat:
                      reroutePosition.lat,
                    lng:
                      reroutePosition.lng,
                  },
                  destination:
                    routingDestination,
                  routingProfile,
                }),
              }
            );

          /*
           * Navigation may have ended or route intent may have changed
           * while the request was awaiting its response.
           */
          if (
            requestId !==
            autoRerouteRequestIdRef.current
          ) {
            return;
          }

          const result =
            (await response.json()) as RerouteResponse;

          /*
           * Parsing is asynchronous too, so verify the generation again
           * immediately before publishing response-derived state.
           */
          if (
            requestId !==
            autoRerouteRequestIdRef.current
          ) {
            return;
          }

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
          /*
           * A stale failure must not overwrite state belonging to a
           * newer route/navigation lifecycle.
           */
          if (
            requestId !==
            autoRerouteRequestIdRef.current
          ) {
            return;
          }

          setAutoRerouteMessage(
            "Automatic reroute failed."
          );

          setRoutingMessage(
            "Automatic reroute failed."
          );
        } finally {
          if (
            autoRerouteAbortControllerRef.current ===
            autoRerouteAbortController
          ) {
            autoRerouteAbortControllerRef.current = null;
          }

          /*
           * An obsolete request must not mark a newer reroute complete
           * or alter its in-flight/active state.
           */
          if (
            requestId ===
            autoRerouteRequestIdRef.current
          ) {
            autoRerouteInFlightRef.current =
              false;

            setAutoRerouteActive(
              false
            );
          }
        }
      },
      [
        destination,
        routingDestination,
        routing,
        routingProfile,
      ]
    );
  async function calculateRoute() {
    if (!gpsActive || !position) {
      setRoutingMessage(
        "Start GPS before calculating a route."
      );
      return;
    }

    if (!destination || !routingDestination) {
      setRoutingMessage(
        "Enter valid destination coordinates."
      );
      return;
    }

    navigationOwnsSimulatorRouteRef.current = false;

    /*
     * A deliberate manual recalculation replaces DEV simulator
     * route ownership. Stop playback and discard old playback
     * points while preserving the current simulated position as
     * the origin for this new route calculation.
     */
    if (simulatorEnabled) {
      clearSimulatorTimer();
      setSimulatorRunning(false);
      simulatorPointsRef.current = [];
      simulatorIndexRef.current = 0;
      setGpsMessage(
        "DEV simulator stopped for route recalculation"
      );
      setSimulatorMessage(
        "Simulator stopped for route recalculation."
      );
    }

    /*
     * Each manual calculation gets a monotonically increasing
     * generation. Only the newest generation may publish state.
     */
    /*
     * A deliberate manual calculation supersedes any automatic
     * reroute that may still be completing in the background.
     */
    autoRerouteRequestIdRef.current += 1;
    autoRerouteAbortControllerRef.current?.abort();
    autoRerouteAbortControllerRef.current = null;
    autoRerouteInFlightRef.current = false;
    setAutoRerouteActive(false);
    setAutoRerouteMessage("");

    const requestId =
      manualRouteRequestIdRef.current + 1;

    manualRouteRequestIdRef.current =
      requestId;

    manualRouteAbortControllerRef.current?.abort();
    manualRouteAbortControllerRef.current = null;

    const manualRouteAbortController =
      new AbortController();

    manualRouteAbortControllerRef.current =
      manualRouteAbortController;

    setRouting(true);
    setRoutingMessage(
      "Calculating HarborGuard route..."
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
            signal: manualRouteAbortController.signal,
            body: JSON.stringify({
              origin: {
                lat: position.lat,
                lng: position.lng,
              },
              destination:
                routingDestination,
              routingProfile,
            }),
          }
        );

      /*
       * A newer route request or lifecycle change superseded
       * this response while the request was in flight.
       */
      if (
        requestId !==
        manualRouteRequestIdRef.current
      ) {
        return;
      }

      const result =
        (await response.json()) as RerouteResponse;

      /*
       * Parsing is asynchronous too, so check again before any
       * response-derived state is published.
       */
      if (
        requestId !==
        manualRouteRequestIdRef.current
      ) {
        return;
      }

      if (!response.ok) {
        setRoutes([]);
        setNavigationInstructions([]);
        setRecommendation(null);
        setRoutingMessage(
          result.error ??
          "Could not calculate route."
        );
        return;
      }

      const nextRoutes =
        result.routes ?? [];

      navigationOwnsSimulatorRouteRef.current =
        nextRoutes.length > 0;

      setNavigationInstructions(
        instructionsForRoute(
          nextRoutes[0] ??
          result.recommendedRoute ??
          null
        )
      );

      setRoutes(nextRoutes);
      setSelectedRouteIndex(0);
      lastAutoRerouteAtRef.current = 0;

      if (nextRoutes.length > 0) {
        setRefreshRecoveryAvailable(false);
      }

      setRecommendation(
        result.recommendation ?? null
      );

      setFollowVehicle(true);

      if (nextRoutes.length === 0) {
        setRoutingMessage(
          "No route was returned."
        );
      } else {
        setRoutingMessage(
          `${nextRoutes.length} HarborGuard route option${
            nextRoutes.length === 1
              ? ""
              : "s"
          } ready.`
        );
      }
    } catch {
      /*
       * An obsolete failure must not clear or overwrite state
       * belonging to a newer route request.
       */
      if (
        requestId !==
        manualRouteRequestIdRef.current
      ) {
        return;
      }

      setRoutes([]);
      setNavigationInstructions([]);
      setRecommendation(null);

      setRoutingMessage(
        "Route calculation failed."
      );
    } finally {
      /*
       * A stale request must not clear the loading state of a
       * newer manual calculation.
       */
      if (
        manualRouteAbortControllerRef.current ===
        manualRouteAbortController
      ) {
        manualRouteAbortControllerRef.current = null;
      }

      if (
        requestId ===
        manualRouteRequestIdRef.current
      ) {
        setRouting(false);
      }
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

  /*
   * Route-derived driver guidance must not trust a position whose
   * accuracy radius is too large for state-changing navigation work.
   */
  const gpsAccuracyPoor =
    position
      ? gpsAccuracyIsPoor(position.accuracy)
      : false;

  const hazardReportTitles: Record<string, string> = {
    roadblock: "Roadblock reported",
    accident: "Road accident reported",
    flooding: "Flooding reported",
    traffic_light_outage:
      "Traffic light outage reported",
    protest:
      "Protest or public disruption reported",
    vehicle_breakdown:
      "Vehicle breakdown reported",
    road_hazard:
      "Road safety hazard reported",
    police_activity:
      "Police activity reported",
    smash_grab_hotspot:
      "Smash-and-grab hotspot reported",
  };

  async function submitDriverHazardReport() {
    if (
      !gpsActive ||
      !position ||
      gpsAccuracyPoor
    ) {
      setHazardReportMessage(
        "A reliable live GPS position is required before reporting a hazard."
      );

      return;
    }

    try {
      setHazardReportSubmitting(true);
      setHazardReportMessage(
        "Submitting hazard report..."
      );

      const response =
        await fetchWithAuth(
          "/api/route-safety/report",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              type: hazardReportType,
              title:
                hazardReportTitles[
                  hazardReportType
                ] ??
                "Road safety hazard reported",
              description:
                hazardReportDescription.trim() ||
                null,
              severity:
                hazardReportSeverity,
              latitude:
                position.lat,
              longitude:
                position.lng,
              radius_meters: 500,
              expires_hours: 6,
            }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          duplicate?: boolean;
          message?: string;
          error?: string;
        };

      if (!response.ok) {
        setHazardReportMessage(
          result.error ??
            "The hazard report could not be submitted."
        );

        return;
      }

      setHazardReportDescription("");

      setHazardReportMessage(
        result.duplicate
          ? "A similar hazard was already reported nearby. HarborGuard kept the existing report."
          : "Hazard reported successfully using your current GPS location."
      );
    }
    catch (error: any) {
      setHazardReportMessage(
        error?.message ??
          "Network error while submitting the hazard report."
      );
    }
    finally {
      setHazardReportSubmitting(false);
    }
  }

  let activeInstructionIndex =
    navigationInstructions.length > 0 &&
    !gpsAccuracyPoor
      ? 0
      : -1;

  /*
   * Do not advance turn ownership from an uncertain GPS fix.
   * The active route remains visible while guidance waits for
   * a trustworthy position.
   */
  if (
    routeProgress &&
    !gpsAccuracyPoor
  ) {
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
    currentPosition && arrivalTarget
      ? navigationDistanceMeters(
          currentPosition,
          arrivalTarget
        )
      : null;
  const arrivalSide: ArrivalSide =
    selectedDestination &&
    typeof selectedDestination.accessLat ===
      "number" &&
    typeof selectedDestination.accessLng ===
      "number" &&
    Number.isFinite(
      selectedDestination.accessLat
    ) &&
    Number.isFinite(
      selectedDestination.accessLng
    ) &&
    Number.isFinite(
      selectedDestination.lat
    ) &&
    Number.isFinite(
      selectedDestination.lng
    ) &&
    routePoints.length >= 2
      ? classifyArrivalSide(
          routePoints,
          [
            selectedDestination.accessLat,
            selectedDestination.accessLng,
          ],
          [
            selectedDestination.lat,
            selectedDestination.lng,
          ]
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
    gpsActive &&
    !gpsAccuracyPoor &&
    navigationInstructions.length > 0 &&
    activeInstructionIndex >=
      Math.max(
        0,
        navigationInstructions.length - 2
      ) &&
    destinationDistanceMeters != null &&
    destinationDistanceMeters <=
      arrivalThresholdMeters;

  /*
   * CUSTOMER INCREMENT #1
   * ---------------------
   * Load existing Route Safety prediction intelligence for the
   * selected route. One request is made per route identity rather
   * than on every GPS position update.
   */
  useEffect(() => {
    const firstRoutePoint =
      routePoints[0];

    const lastRoutePoint =
      routePoints[
        routePoints.length - 1
      ];


    if (
      !selectedRoute ||
      !gpsActive ||
      gpsAccuracyPoor ||
      hasReachedDestination ||
      !firstRoutePoint ||
      !lastRoutePoint ||
      routePoints.length < 2
    ) {
      activeRouteSafetyThreatRequestIdRef.current += 1;

      activeRouteSafetyThreatAbortControllerRef.current?.abort();
      activeRouteSafetyThreatAbortControllerRef.current = null;

      activeRouteSafetyThreatRouteKeyRef.current =
        "";

      setActiveRouteSafetyThreats([]);

      return;
    }

    const routeKey =
      [
        selectedRouteIndex,
        routingProfile,
        routePoints.length,
        ...routePoints.flatMap(
          ([lat, lng]) => [
            lat.toFixed(6),
            lng.toFixed(6),
          ]
        ),
      ].join(":");

    if (
      activeRouteSafetyThreatRouteKeyRef.current ===
      routeKey
    ) {
      return;
    }

    activeRouteSafetyThreatRouteKeyRef.current =
      routeKey;

    setLiveRoadIntelligence(null);
    setRouteWeatherIntelligence(null);

    const requestId =
      activeRouteSafetyThreatRequestIdRef.current + 1;

    activeRouteSafetyThreatRequestIdRef.current =
      requestId;

    activeRouteSafetyThreatAbortControllerRef.current?.abort();

    const controller =
      new AbortController();

    activeRouteSafetyThreatAbortControllerRef.current =
      controller;

    void (async () => {
      try {
        const response =
          await fetchWithAuth(
            "/api/route-safety/predict",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              cache: "no-store",
              signal: controller.signal,
              body: JSON.stringify({
                origin: {
                  lat: firstRoutePoint[0],
                  lng: firstRoutePoint[1],
                },
                destination: {
                  lat: lastRoutePoint[0],
                  lng: lastRoutePoint[1],
                },
              }),
            }
          );

        const result =
          (await response
            .json()
            .catch(() => null)) as
            | RouteSafetyPredictionResponse
            | null;

        if (
          requestId !==
          activeRouteSafetyThreatRequestIdRef.current
        ) {
          return;
        }

        if (!response.ok) {
          activeRouteSafetyThreatRouteKeyRef.current =
            "";

          setActiveRouteSafetyThreats([]);
          setLiveRoadIntelligence(null);
          setRouteWeatherIntelligence(null);

          return;
        }

        setActiveRouteSafetyThreats(
          Array.isArray(result?.threats)
            ? result.threats
            : []
        );

        const trafficRiskLevel =
          typeof result?.trafficRiskLevel === "string" &&
          result.trafficRiskLevel.trim()
            ? result.trafficRiskLevel.trim().toUpperCase()
            : null;

        const trafficRiskScore =
          typeof result?.trafficRiskScore === "number" &&
          Number.isFinite(result.trafficRiskScore)
            ? result.trafficRiskScore
            : null;

        const averageDelayMinutes =
          typeof result?.traffic?.summary?.averageDelay ===
            "number" &&
          Number.isFinite(
            result.traffic.summary.averageDelay
          )
            ? result.traffic.summary.averageDelay
            : null;

        const overallRiskLevel =
          typeof result?.riskLevel === "string" &&
          result.riskLevel.trim()
            ? result.riskLevel.trim().toUpperCase()
            : null;

        const overallRiskScore =
          typeof result?.riskScore === "number" &&
          Number.isFinite(result.riskScore)
            ? result.riskScore
            : null;

        const weatherRiskScore =
          typeof result?.weatherRiskScore === "number" &&
          Number.isFinite(result.weatherRiskScore)
            ? result.weatherRiskScore
            : null;

        const weatherContribution =
          typeof result?.weatherContribution === "number" &&
          Number.isFinite(result.weatherContribution)
            ? result.weatherContribution
            : null;

        const weather =
          result?.weather ?? null;

        const nextRouteWeatherIntelligence:
          RouteWeatherIntelligence | null =
          weather &&
          !result?.weatherError
            ? {
                riskLevel:
                  typeof weather.riskLevel === "string" &&
                  weather.riskLevel.trim()
                    ? weather.riskLevel.trim()
                    : null,
                riskScore:
                  typeof weather.riskScore === "number" &&
                  Number.isFinite(weather.riskScore)
                    ? weather.riskScore
                    : weatherRiskScore,
                contribution:
                  weatherContribution,
                temperatureC:
                  typeof weather.temperatureC === "number" &&
                  Number.isFinite(weather.temperatureC)
                    ? weather.temperatureC
                    : null,
                windSpeedKph:
                  typeof weather.windSpeedKph === "number" &&
                  Number.isFinite(weather.windSpeedKph)
                    ? weather.windSpeedKph
                    : null,
                windGustKph:
                  typeof weather.windGustKph === "number" &&
                  Number.isFinite(weather.windGustKph)
                    ? weather.windGustKph
                    : null,
                precipitationMm:
                  typeof weather.precipitationMm === "number" &&
                  Number.isFinite(weather.precipitationMm)
                    ? weather.precipitationMm
                    : null,
                visibilityKm:
                  typeof weather.visibilityKm === "number" &&
                  Number.isFinite(weather.visibilityKm)
                    ? weather.visibilityKm
                    : null,
                weatherCode:
                  typeof weather.weatherCode === "number" &&
                  Number.isFinite(weather.weatherCode)
                    ? weather.weatherCode
                    : null,
                riskReasons:
                  Array.isArray(weather.riskReasons)
                    ? weather.riskReasons.filter(
                        (reason): reason is string =>
                          typeof reason === "string" &&
                          reason.trim().length > 0
                      )
                    : [],
              }
            : null;

        const hasTrafficIntelligence =
          result?.traffic != null &&
          !result?.trafficError &&
          (
            trafficRiskLevel != null ||
            trafficRiskScore != null ||
            averageDelayMinutes != null
          );

        setRouteWeatherIntelligence(
          nextRouteWeatherIntelligence
        );

        setLiveRoadIntelligence(
          hasTrafficIntelligence
            ? {
                trafficRiskLevel,
                trafficRiskScore,
                averageDelayMinutes,
                overallRiskLevel,
                overallRiskScore,
              }
            : null
        );
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !==
            activeRouteSafetyThreatRequestIdRef.current
        ) {
          return;
        }

        activeRouteSafetyThreatRouteKeyRef.current =
          "";

        setActiveRouteSafetyThreats([]);
        setLiveRoadIntelligence(null);
        setRouteWeatherIntelligence(null);
      } finally {
        if (
          requestId ===
          activeRouteSafetyThreatRequestIdRef.current
        ) {
          activeRouteSafetyThreatAbortControllerRef.current =
            null;
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    selectedRoute,
    selectedRouteIndex,
    routingProfile,
    routePoints,
    gpsActive,
    gpsAccuracyPoor,
    hasReachedDestination,
  ]);

  /*
   * Convert Route Safety threat coordinates into the same
   * route-progress coordinate system used by turn-by-turn guidance.
   *
   * This gives the customer-facing value:
   *
   *   threat position on route
   *   minus
   *   current driver position on route
   *   =
   *   distance ahead
   */
  const activeRouteSafetyWarning =
    useMemo<ActiveRouteSafetyWarning | null>(
      () => {
        if (
          !routeProgress ||
          !selectedRoute ||
          gpsAccuracyPoor ||
          hasReachedDestination ||
          routePoints.length < 2 ||
          activeRouteSafetyThreats.length === 0
        ) {
          return null;
        }

        const candidates =
          activeRouteSafetyThreats
            .map((threat) => {
              const latitude =
                Number(threat.latitude);

              const longitude =
                Number(threat.longitude);

              if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
              ) {
                return null;
              }

              const threatProgress =
                calculateRouteProgress(
                  [latitude, longitude],
                  routePoints
                );

              if (!threatProgress) {
                return null;
              }

              /*
               * The prediction API has already determined route
               * relevance. This local geometry fence protects the
               * customer UI from an obviously remote coordinate.
               */
              const corridorToleranceMeters =
                Math.max(
                  250,
                  Number(
                    threat.radiusMeters || 0
                  )
                );

              if (
                !Number.isFinite(
                  threatProgress.distanceFromRouteMeters
                ) ||
                threatProgress.distanceFromRouteMeters >
                  corridorToleranceMeters
              ) {
                return null;
              }

              const distanceAheadMeters =
                threatProgress.progressMeters -
                routeProgress.progressMeters;

              /*
               * Do not warn about hazards already behind the driver
               * or events too far ahead for an immediate navigation
               * decision.
               */
              if (
                distanceAheadMeters < -50 ||
                distanceAheadMeters > 3000
              ) {
                return null;
              }

              return {
                threat,
                distanceAheadMeters:
                  Math.max(
                    0,
                    distanceAheadMeters
                  ),
              };
            })
            .filter(
              (
                candidate
              ): candidate is ActiveRouteSafetyWarning =>
                candidate !== null
            )
            .sort(
              (first, second) => {
                const distanceDifference =
                  first.distanceAheadMeters -
                  second.distanceAheadMeters;

                if (
                  Math.abs(distanceDifference) >
                  50
                ) {
                  return distanceDifference;
                }

                return (
                  Number(
                    second.threat.score || 0
                  ) -
                  Number(
                    first.threat.score || 0
                  )
                );
              }
            );

        return candidates[0] ?? null;
      },
      [
        routeProgress,
        selectedRoute,
        gpsAccuracyPoor,
        hasReachedDestination,
        routePoints,
        activeRouteSafetyThreats,
      ]
    );
  /*
   * Customer Increment #2
   * ---------------------
   * One meaningful active-route threat may trigger one background
   * alternative-route discovery request.
   *
   * GPS movement does not own this lifecycle.
   */
  useEffect(() => {
    const threat =
      activeRouteSafetyWarning?.threat ??
      null;

    const threatLatitude =
      Number(threat?.latitude);

    const threatLongitude =
      Number(threat?.longitude);

    const threatKey =
      threat
        ? [
            threat.id ?? "",
            threat.type ?? "",
            Number.isFinite(
              threatLatitude
            )
              ? threatLatitude.toFixed(6)
              : "",
            Number.isFinite(
              threatLongitude
            )
              ? threatLongitude.toFixed(6)
              : "",
          ].join(":")
        : "";

    const currentRouteFingerprint =
      routeGeometryFingerprint(
        selectedRoute
      );

    const offerKey =
      [
        threatKey,
        currentRouteFingerprint,
        routingProfile,
      ].join("::");

    const offerPosition =
      latestNavigationPositionRef.current;

    if (
      !activeRouteSafetyWarning ||
      !selectedRoute ||
      !offerPosition ||
      !routingDestination ||
      !gpsActive ||
      gpsAccuracyPoor ||
      hasReachedDestination ||
      !currentRouteFingerprint
    ) {
      saferRouteOfferRequestIdRef.current +=
        1;

      saferRouteOfferAbortControllerRef.current?.abort();
      saferRouteOfferAbortControllerRef.current =
        null;

      saferRouteOfferKeyRef.current =
        "";

      setSaferRouteOffer(null);
      setSaferRouteOfferLoading(false);

      return;
    }

    if (
      saferRouteOfferKeyRef.current ===
      offerKey
    ) {
      return;
    }

    saferRouteOfferKeyRef.current =
      offerKey;

    const requestId =
      saferRouteOfferRequestIdRef.current +
      1;

    saferRouteOfferRequestIdRef.current =
      requestId;

    saferRouteOfferAbortControllerRef.current?.abort();

    const controller =
      new AbortController();

    saferRouteOfferAbortControllerRef.current =
      controller;

    setSaferRouteOfferLoading(true);
    setSaferRouteOffer(null);

    void (async () => {
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
              signal: controller.signal,
              body: JSON.stringify({
                origin: {
                  lat: offerPosition.lat,
                  lng: offerPosition.lng,
                },
                destination:
                  routingDestination,
                routingProfile,
              }),
            }
          );

        const result =
          (await response
            .json()
            .catch(() => null)) as
            | RerouteResponse
            | null;

        if (
          requestId !==
          saferRouteOfferRequestIdRef.current
        ) {
          return;
        }

        if (!response.ok) {
          saferRouteOfferKeyRef.current =
            "";

          setSaferRouteOffer(null);

          return;
        }

        const nextRoutes =
          Array.isArray(result?.routes)
            ? result.routes
            : [];

        const activeRoutePoints =
          selectedRoute.routePoints ??
          [];

        const candidatePool =
          [
            ...nextRoutes,
            ...(result?.recommendedRoute
              ? [result.recommendedRoute]
              : []),
          ].filter(
            (
              route,
              index,
              routes
            ) =>
              route &&
              route.routePoints &&
              route.routePoints.length >= 2 &&
              routes.indexOf(route) ===
                index
          );

        const evaluatedCandidates =
          candidatePool.map(
            (route) => {
              const materiallyDifferent =
                routeMateriallyDiffersFromActiveRoute(
                  route,
                  activeRoutePoints
                );

              return {
                route,
                materiallyDifferent,
              };
            }
          );

        /*
         * CUSTOMER INCREMENT #4
         * ---------------------
         * The reroute request starts at the driver's current position.
         *
         * Keep one route that still follows the active path as the
         * same-origin comparison baseline, and one materially different
         * route as the alternative.
         *
         * This prevents comparing a fresh alternative against the
         * original full-trip ETA or distance.
         */
        const baselineRoute =
          evaluatedCandidates.find(
            (entry) =>
              !entry.materiallyDifferent
          )?.route ??
          null;

        const candidate =
          evaluatedCandidates.find(
            (entry) =>
              entry.materiallyDifferent
          )?.route ??
          null;

        if (!candidate) {
          setSaferRouteOffer(null);
          return;
        }

        setSaferRouteOffer({
          route: candidate,
          baselineRoute,
          threatKey,
          durationMinutes:
            routeDurationMinutes(
              candidate
            ),
        });
      } catch {
        if (
          controller.signal.aborted ||
          requestId !==
            saferRouteOfferRequestIdRef.current
        ) {
          return;
        }

        saferRouteOfferKeyRef.current =
          "";

        setSaferRouteOffer(null);
      } finally {
        if (
          requestId ===
          saferRouteOfferRequestIdRef.current
        ) {
          saferRouteOfferAbortControllerRef.current =
            null;

          setSaferRouteOfferLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    activeRouteSafetyWarning?.threat.id,
    activeRouteSafetyWarning?.threat.type,
    activeRouteSafetyWarning?.threat.latitude,
    activeRouteSafetyWarning?.threat.longitude,
    selectedRoute,
    routingDestination,
    routingProfile,
    gpsActive,
    gpsAccuracyPoor,
    hasReachedDestination,
  ]);

  /*
   * Customer Increment #5
   * ---------------------
   * Confirm only threats that /predict explicitly proves came from
   * a live route_safety_alerts row.
   */
  async function confirmActiveRouteSafetyHazard() {
    const alertId =
      activeRouteSafetyWarning?.threat
        .routeSafetyAlertId?.trim() ||
      "";

    if (!alertId) {
      return;
    }

    if (
      hazardConfirmationInFlightRef.current.has(
        alertId
      ) ||
      confirmedHazardAlertIdsRef.current.has(
        alertId
      ) ||
      hazardResolutionInFlightRef.current.has(
        alertId
      ) ||
      resolvedHazardAlertIdsRef.current.has(
        alertId
      )
    ) {
      return;
    }

    hazardConfirmationInFlightRef.current.add(
      alertId
    );

    setHazardConfirmationStateByAlertId(
      (current) => ({
        ...current,
        [alertId]: "submitting",
      })
    );

    try {
      const response =
        await fetchWithAuth(
          "/api/route-safety/verify",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              alertId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Hazard confirmation failed."
        );
      }

      confirmedHazardAlertIdsRef.current.add(
        alertId
      );

      setHazardConfirmationStateByAlertId(
        (current) => ({
          ...current,
          [alertId]: "confirmed",
        })
      );
    } catch {
      setHazardConfirmationStateByAlertId(
        (current) => ({
          ...current,
          [alertId]: "failed",
        })
      );
    } finally {
      hazardConfirmationInFlightRef.current.delete(
        alertId
      );
    }
  }

  /*
   * Customer Increment #7
   * ---------------------
   * Explicitly resolve the backing live route_safety_alerts row when
   * the driver says the hazard is no longer present.
   */
  async function resolveActiveRouteSafetyHazard() {
    const alertId =
      activeRouteSafetyWarning?.threat
        .routeSafetyAlertId?.trim() ||
      "";

    if (!alertId) {
      return;
    }

    if (
      hazardResolutionInFlightRef.current.has(
        alertId
      ) ||
      resolvedHazardAlertIdsRef.current.has(
        alertId
      ) ||
      hazardConfirmationInFlightRef.current.has(
        alertId
      )
    ) {
      return;
    }

    hazardResolutionInFlightRef.current.add(
      alertId
    );

    setHazardResolutionStateByAlertId(
      (current) => ({
        ...current,
        [alertId]: "submitting",
      })
    );

    try {
      const response =
        await fetchWithAuth(
          "/api/route-safety/resolve",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              alertId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Hazard resolution failed."
        );
      }

      resolvedHazardAlertIdsRef.current.add(
        alertId
      );

      setHazardResolutionStateByAlertId(
        (current) => ({
          ...current,
          [alertId]: "resolved",
        })
      );

      /*
       * The alternative route offer belonged to an alert that is no
       * longer active, so cancel and remove it.
       */
      saferRouteOfferRequestIdRef.current +=
        1;

      saferRouteOfferAbortControllerRef.current?.abort();

      saferRouteOfferAbortControllerRef.current =
        null;

      saferRouteOfferKeyRef.current =
        "";

      setSaferRouteOffer(null);
      setSaferRouteOfferLoading(false);

      /*
       * Remove only this resolved live alert from the customer-facing
       * threat collection. Navigation route state itself is untouched.
       */
      setActiveRouteSafetyThreats(
        (current) =>
          current.filter(
            (threat) =>
              threat.routeSafetyAlertId?.trim() !==
              alertId
          )
      );
    }
    catch {
      setHazardResolutionStateByAlertId(
        (current) => ({
          ...current,
          [alertId]: "failed",
        })
      );
    }
    finally {
      hazardResolutionInFlightRef.current.delete(
        alertId
      );
    }
  }

  /*
   * Nothing changes until the customer explicitly accepts the offer.
   */
  function keepCurrentRoute() {
    setSaferRouteOffer(null);
  }
  function acceptSaferRouteOffer() {
    if (
      !saferRouteOffer?.route
    ) {
      return;
    }

    manualRouteRequestIdRef.current += 1;
    manualRouteAbortControllerRef.current?.abort();
    manualRouteAbortControllerRef.current =
      null;

    autoRerouteRequestIdRef.current += 1;
    autoRerouteAbortControllerRef.current?.abort();
    autoRerouteAbortControllerRef.current =
      null;

    autoRerouteInFlightRef.current =
      false;

    saferRouteOfferRequestIdRef.current +=
      1;

    saferRouteOfferAbortControllerRef.current?.abort();
    saferRouteOfferAbortControllerRef.current =
      null;

    const acceptedRoute =
      saferRouteOffer.route;

    setRoutes([
      acceptedRoute,
    ]);

    setSelectedRouteIndex(0);

    setNavigationInstructions(
      instructionsForRoute(
        acceptedRoute
      )
    );

    setRecommendation(
      "Alternative route selected by the driver."
    );

    setFollowVehicle(true);

    offRouteStartedAtRef.current =
      null;

    lastAutoRerouteAtRef.current =
      0;

    navigationOwnsSimulatorRouteRef.current =
      true;

    saferRouteOfferKeyRef.current =
      "";

    setSaferRouteOffer(null);
    setSaferRouteOfferLoading(false);

    setAutoRerouteMessage(
      "Alternative route selected."
    );

    setRoutingMessage(
      "Alternative route selected."
    );
  }
  const activeSpeedLimitKph =
    gpsActive &&
    !hasReachedDestination &&
    !gpsAccuracyPoor &&
    routeProgress &&
    Array.isArray(
      selectedRoute?.speedLimitSegments
    )
      ? selectedRoute.speedLimitSegments.find(
          (segment) =>
            routeProgress.progressMeters >=
              segment.startOffsetMeters &&
            routeProgress.progressMeters <
              segment.endOffsetMeters
        )?.speedLimitKph ?? null
      : null;
  const currentSpeedKph =
    Math.max(
      0,
      Number(position?.speedKmh ?? 0)
    );

  const overspeedAmountKph =
    activeSpeedLimitKph != null
      ? Math.max(
          0,
          currentSpeedKph -
            activeSpeedLimitKph
        )
      : 0;

  const isOverspeeding =
    activeSpeedLimitKph != null &&
    currentSpeedKph >
      activeSpeedLimitKph +
        OVERSPEED_TOLERANCE_KPH;


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

  const hasNavigationRoute =
    selectedRoute != null;

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
      hasNavigationRoute &&
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
    hasNavigationRoute,
    hasReachedDestination,
    requestWakeLock,
    releaseWakeLock,
  ]);
  useEffect(() => {
    if (!isOverspeeding) {
      overspeedVoiceArmedRef.current = true;
      lastSpokenAnnouncementRef.current.delete(
        "overspeed-warning"
      );
      return;
    }

    if (
      !voiceEnabled ||
      gpsAccuracyPoor ||
      !overspeedVoiceArmedRef.current
    ) {
      return;
    }

    const didSpeak =
      speakNavigationInstruction(
        "overspeed-warning",
        "Warning. You are exceeding the speed limit.",
        true
      );

    if (didSpeak) {
      overspeedVoiceArmedRef.current = false;
    }
  }, [
    isOverspeeding,
    voiceEnabled,
    gpsAccuracyPoor,
    speakNavigationInstruction,
  ]);

  /*
   * CUSTOMER INCREMENT #3
   * ---------------------
   * Speak the existing active-route safety warning through the
   * existing navigation speech engine.
   *
   * A stable threat identity prevents GPS progress updates from
   * repeatedly speaking the same warning.
   *
   * This first increment does not interrupt speech already in progress.
   */
  useEffect(() => {
    if (
      !voiceEnabled ||
      !gpsActive ||
      gpsAccuracyPoor ||
      routing ||
      autoRerouteActive ||
      !selectedRoute ||
      hasReachedDestination ||
      !activeRouteSafetyWarning
    ) {
      return;
    }

    const announcementKey =
      activeRouteSafetyVoiceKey(
        activeRouteSafetyWarning
      );

    const title =
      activeRouteSafetyVoiceTitle(
        activeRouteSafetyWarning.threat
      );

    const distanceMeters =
      Math.max(
        0,
        Math.round(
          activeRouteSafetyWarning
            .distanceAheadMeters
        )
      );

    speakNavigationInstruction(
      announcementKey,
      `Safety alert ahead. ${title}. ${distanceMeters} metres ahead.`
    );
  }, [
    voiceEnabled,
    gpsActive,
    gpsAccuracyPoor,
    routing,
    autoRerouteActive,
    selectedRoute,
    hasReachedDestination,
    activeRouteSafetyWarning,
    speakNavigationInstruction,
  ]);

  useEffect(() => {
    if (
      !voiceEnabled ||
      !gpsActive ||
      gpsAccuracyPoor ||
      routing ||
      autoRerouteActive ||
      !selectedRoute
    ) {
      return;
    }

    if (hasReachedDestination) {
      const arrivalKey =
        `arrival:${
          arrivalTarget?.[0] ?? ""
        }:${
          arrivalTarget?.[1] ?? ""
        }`;

      const arrivalBaseMessage =
        destinationName &&
        destinationName !==
          "Destination"
          ? `You have arrived at ${destinationName}.`
          : "You have arrived at your destination.";

      const arrivalMessage =
        arrivalSide
          ? `${arrivalBaseMessage} Your destination is on the ${arrivalSide}.`
          : arrivalBaseMessage;

      speakNavigationInstruction(
        arrivalKey,
        arrivalMessage,
        true
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
    gpsActive,
    gpsAccuracyPoor,
    routing,
    autoRerouteActive,
    selectedRoute,
    hasReachedDestination,
    destination,
    arrivalTarget,
    arrivalSide,
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
      !gpsActive ||
      gpsAccuracyPoor ||
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

        if (
          gpsAccuracyIsPoor(
            latestPosition.accuracy
          )
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
    gpsActive,
    gpsAccuracyPoor,
    offRouteThresholdMeters,
    autoRerouteFromCurrentPosition,
    clearOffRouteTimer,
  ]);
  useEffect(() => {
    if (!hasReachedDestination) {
      return;
    }

    /*
     * Arrival owns the terminal navigation lifecycle.
     * Invalidate and cancel any automatic reroute that started
     * before arrival so it cannot publish stale route state.
     */
    autoRerouteRequestIdRef.current += 1;
    autoRerouteAbortControllerRef.current?.abort();
    autoRerouteAbortControllerRef.current = null;
    autoRerouteInFlightRef.current = false;
    clearOffRouteTimer();
    offRouteStartedAtRef.current = null;

    /*
     * React state normalization is deferred out of the effect body.
     * The request generation/ref invalidation above is synchronous,
     * so a late reroute response is already obsolete.
     */
    const normalizeArrivalState =
      window.setTimeout(() => {
        setAutoRerouteActive(false);
        setAutoRerouteMessage("");
      }, 0);

    return () => {
      window.clearTimeout(
        normalizeArrivalState
      );
    };
  }, [
    hasReachedDestination,
    clearOffRouteTimer,
  ]);

  const navigationHeadline =
    hasReachedDestination
      ? "You have arrived"
      : autoRerouteActive
        ? "Rerouting..."
      : activeInstruction?.text ||
        (selectedRoute
          ? `Continue toward ${
              destinationName ||
              "destination"
            }`
          : "Choose a destination");

  const navigationDetail =
    hasReachedDestination
      ? destinationName
        ? `Arrived at ${destinationName}.${arrivalSide ? ` Destination is on the ${arrivalSide}.` : ""}`
        : arrivalSide
          ? `Destination reached. Destination is on the ${arrivalSide}.`
          : "Destination reached."
      : autoRerouteActive
        ? "Finding a new HarborGuard safe route from your current position."
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
              repeat(6, minmax(0, 1fr)) !important;
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
              max-height: 42dvh;
            }

            .hg-navigation-metrics-wrap {
              bottom:
                calc(
                  42dvh +
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
                  42dvh +
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
                max(8px, env(safe-area-inset-left)) !important;
              right:
                max(8px, env(safe-area-inset-right)) !important;
            }

            .hg-navigation-metrics-wrap {
              left:
                max(8px, env(safe-area-inset-left)) !important;
              right:
                max(8px, env(safe-area-inset-right)) !important;
              bottom:
                max(8px, env(safe-area-inset-bottom)) !important;
            }

            .hg-navigation-metrics {
              grid-template-columns:
                repeat(3, minmax(0, 1fr)) !important;
            }

            .hg-navigation-follow-button {
              bottom:
                max(176px, env(safe-area-inset-bottom)) !important;
            }
            .hg-navigation-recommendation {
              display: none !important;
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
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                background:
                  "rgba(2,6,23,.65)",
                border:
                  "1px solid rgba(148,163,184,.25)",
              }}
            >
              <div
                style={{
                  marginBottom: 7,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                }}
              >
                Vehicle context
              </div>

              <select
                aria-label="Safe Navigation vehicle"
                value={selectedVehicleId}
                onChange={(event) => {
                  setSelectedVehicleId(
                    event.target.value
                  );
                  setVehicleContextMessage("");
                  setPanicConfirmOpen(false);
                  setPanicMessage("");
                }}
                disabled={vehicleContextLoading}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(148,163,184,.35)",
                  background: "#020617",
                  color: "#e2e8f0",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <option value="">
                  {vehicleContextLoading
                    ? "Loading vehicles..."
                    : "Select vehicle"}
                </option>

                {safeNavigationVehicles.map(
                  (vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                    >
                      {vehicle.nickname
                        ? `${vehicle.nickname} - ${vehicle.registrationNumber}`
                        : vehicle.registrationNumber}
                    </option>
                  )
                )}
              </select>

              {selectedVehicle && (
                <div
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    color: "#cbd5e1",
                    lineHeight: 1.4,
                  }}
                >
                  {selectedVehicle.driverName
                    ? `Driver: ${selectedVehicle.driverName} ? `
                    : ""}
                  Active trip:{" "}
                  {selectedVehicleTripId ||
                    "none"}
                </div>
              )}

              {vehicleContextMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    color: "#fbbf24",
                    lineHeight: 1.4,
                  }}
                >
                  {vehicleContextMessage}
                </div>
              )}
            </div>

            <div
              style={{
                color: gpsActive ? "#5eead4" : "#94a3b8",
                marginBottom: 12,
                fontSize: 14,
              }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
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
                htmlFor="safe-navigation-destination"
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
                  id="safe-navigation-destination"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={destinationResults.length > 0}
                  aria-controls={
                    destinationResults.length > 0
                      ? "safe-navigation-destination-results"
                      : undefined
                  }
                  aria-activedescendant={
                    activeDestinationResultIndex >= 0 &&
                    destinationResults[
                      activeDestinationResultIndex
                    ]
                      ? `safe-navigation-destination-option-${activeDestinationResultIndex}`
                      : undefined
                  }
                  value={destinationName}
                  onChange={(event) => {
                    if (
                      routes.length > 0 ||
                      navigationInstructions.length > 0 ||
                      autoRerouteActive
                    ) {
                      endNavigation();

                      setRoutingMessage(
                        "Destination changed. Select a destination and calculate a new route."
                      );
                    } else {
                      setRoutingMessage(
                        "Destination changed. Search to select a destination."
                      );
                    }

                    /*

                     * Invalidate any destination search started for

                     * the previous input text.

                     */

                    destinationSearchRequestIdRef.current +=

                      1;
                  destinationSearchAbortControllerRef.current?.abort();
                  destinationSearchAbortControllerRef.current = null;



                    /*
                     * Destination text changed, so any route calculated
                     * for the previous destination intent is stale.
                     */
                    manualRouteRequestIdRef.current +=
                      1;
                    manualRouteAbortControllerRef.current?.abort();
                    manualRouteAbortControllerRef.current = null;

                    autoRerouteRequestIdRef.current +=
                      1;
                    autoRerouteAbortControllerRef.current?.abort();
                    autoRerouteAbortControllerRef.current = null;
                    setRouting(false);
                    setDestinationSearching(

                      false

                    );


                    setDestinationResults(

                      []

                    );
                    setActiveDestinationResultIndex(-1);


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
                    if (
                      event.key === "ArrowDown" &&
                      destinationResults.length > 0
                    ) {
                      event.preventDefault();

                      setActiveDestinationResultIndex(
                        (currentIndex) =>
                          currentIndex >=
                          destinationResults.length - 1
                            ? 0
                            : currentIndex + 1
                      );

                      return;
                    }

                    if (
                      event.key === "ArrowUp" &&
                      destinationResults.length > 0
                    ) {
                      event.preventDefault();

                      setActiveDestinationResultIndex(
                        (currentIndex) =>
                          currentIndex <= 0
                            ? destinationResults.length - 1
                            : currentIndex - 1
                      );

                      return;
                    }

                    if (
                      event.key === "Escape" &&
                      destinationResults.length > 0
                    ) {
                      event.preventDefault();
                      setDestinationResults([]);
                      setActiveDestinationResultIndex(-1);
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();

                      if (
                        activeDestinationResultIndex >= 0 &&
                        destinationResults[
                          activeDestinationResultIndex
                        ]
                      ) {
                        document
                          .getElementById(
                            `safe-navigation-destination-option-${activeDestinationResultIndex}`
                          )
                          ?.click();

                        return;
                      }

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
                  aria-controls={
                    destinationResults.length > 0
                      ? "safe-navigation-destination-results"
                      : undefined
                  }
                  disabled={destinationSearching}
                  style={{
                    border: 0,
                    borderRadius: 12,
                    minHeight: 44,
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
                  id="safe-navigation-destination-results"
                  role="listbox"
                  aria-label="Destination search results"
                  style={{
                    display: "grid",
                    gap: 6,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {destinationResults.map(
                    (result, resultIndex) => (
                      <button
                        id={`safe-navigation-destination-option-${resultIndex}`}
                        role="option"
                        aria-selected={
                          activeDestinationResultIndex ===
                          resultIndex
                        }
                        tabIndex={-1}
                        key={
                          result.id ??
                          `${result.lat}-${result.lng}`
                        }
                        type="button"
                        onClick={() => {
                          if (
                            routes.length > 0 ||
                            navigationInstructions.length > 0 ||
                            autoRerouteActive
                          ) {
                            endNavigation();
                          }

                          /*
                           * A destination selection owns the current search
                           * intent. Invalidate and cancel any search still
                           * running before publishing the selected result.
                           */
                          destinationSearchRequestIdRef.current +=
                            1;
                          destinationSearchAbortControllerRef.current?.abort();
                          destinationSearchAbortControllerRef.current =
                            null;
                          setDestinationSearching(false);
                          /*

                           * Selecting a new destination invalidates any

                           * manual route request for the previous destination.

                           */

                          manualRouteRequestIdRef.current +=

                            1;

                          manualRouteAbortControllerRef.current?.abort();
                          manualRouteAbortControllerRef.current = null;

                    autoRerouteRequestIdRef.current +=
                      1;
                    autoRerouteAbortControllerRef.current?.abort();
                    autoRerouteAbortControllerRef.current = null;
                    setRouting(false);


                          setRefreshRecoveryAvailable(
                            false
                          );

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

                          /*
                           * The selected search-result button is
                           * removed when results are cleared.
                           * Move keyboard focus to the next
                           * logical navigation action.
                           */
                          calculateRouteButtonRef.current?.focus();
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
                          minHeight: 44,
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
              aria-label="Routing preference"
              value={routingProfile}
              onChange={(event) => {
                const nextRoutingProfile =
                  event.target.value;

                /*
                 * A route calculated for one routing profile must not
                 * remain active after the user selects another profile.
                 *
                 * If route/navigation state already exists, reuse the
                 * complete navigation termination lifecycle so route,
                 * instruction, recommendation and reroute state are all
                 * cleared together.
                 *
                 * If no route has published yet, only invalidate and
                 * cancel outstanding route work.
                 */
                if (
                  routes.length > 0 ||
                  navigationInstructions.length > 0 ||
                  autoRerouteActive
                ) {
                  endNavigation();
                } else {
                  manualRouteRequestIdRef.current +=
                    1;
                  manualRouteAbortControllerRef.current?.abort();
                  manualRouteAbortControllerRef.current = null;

                  autoRerouteRequestIdRef.current +=
                    1;
                  autoRerouteAbortControllerRef.current?.abort();
                  autoRerouteAbortControllerRef.current = null;

                  setRouting(false);
                }

                setRoutingProfile(
                  nextRoutingProfile
                );

                setRoutingMessage(
                  "Routing preference changed. Calculate a new route."
                );
              }}
              style={inputStyle}
            >
              <option value="safest">Safest</option>
              <option value="balanced">Balanced</option>
              <option value="fastest">Fastest</option>
            </select>

            <button
              ref={calculateRouteButtonRef}
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
              {routing
                ? "Calculating..."
                : refreshRecoveryAvailable &&
                    routes.length === 0
                  ? "Resume Journey"
                  : "Calculate Safe Route"}
            </button>

            {routes.length > 0 ? (
              <button
                type="button"
                onClick={endNavigation}
                style={{
                  width: "100%",
                  marginTop: 10,
                  border: "1px solid #475569",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                End Navigation
              </button>
            ) : null}

            <div
              className="hg-emergency-sos"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                border:
                  "1px solid rgba(239,68,68,.72)",
                background:
                  "rgba(69,10,10,.42)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!selectedVehicleId) {
                    setPanicMessage(
                      "Select the vehicle you are driving before sending Emergency SOS."
                    );
                    setPanicConfirmOpen(false);
                    return;
                  }

                  setPanicMessage("");
                  setPanicConfirmOpen(true);
                }}
                disabled={panicSending}
                style={{
                  width: "100%",
                  border:
                    "1px solid #ef4444",
                  borderRadius: 10,
                  padding: "12px 13px",
                  background: "#991b1b",
                  color: "#ffffff",
                  fontWeight: 950,
                  cursor: panicSending
                    ? "wait"
                    : "pointer",
                  opacity: panicSending
                    ? 0.7
                    : 1,
                }}
              >
                {panicSending
                  ? "Sending Emergency SOS..."
                  : "Emergency SOS"}
              </button>

              {!selectedVehicleId && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: "#fecaca",
                  }}
                >
                  Select your vehicle first.
                  No emergency alert is sent
                  until a vehicle is selected
                  and SOS is confirmed.
                </div>
              )}

              {panicConfirmOpen && (
                <div
                  role="alertdialog"
                  aria-label="Confirm Emergency SOS"
                  style={{
                    marginTop: 10,
                    padding: 11,
                    borderRadius: 10,
                    border:
                      "1px solid rgba(248,113,113,.55)",
                    background:
                      "rgba(127,29,29,.42)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      color: "#fee2e2",
                      marginBottom: 6,
                    }}
                  >
                    Confirm Emergency SOS
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "#fecaca",
                    }}
                  >
                    This creates a critical
                    HarborGuard emergency alert
                    for the selected vehicle and
                    notifies operations.
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPanicConfirmOpen(
                          false
                        );
                        setPanicMessage("");
                      }}
                      disabled={panicSending}
                      style={{
                        border:
                          "1px solid #64748b",
                        borderRadius: 9,
                        padding: "10px 8px",
                        background: "#0f172a",
                        color: "#f8fafc",
                        fontWeight: 850,
                        cursor: panicSending
                          ? "wait"
                          : "pointer",
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void sendEmergencySos();
                      }}
                      disabled={panicSending}
                      style={{
                        border:
                          "1px solid #f87171",
                        borderRadius: 9,
                        padding: "10px 8px",
                        background: "#dc2626",
                        color: "#ffffff",
                        fontWeight: 950,
                        cursor: panicSending
                          ? "wait"
                          : "pointer",
                      }}
                    >
                      {panicSending
                        ? "Sending..."
                        : "Confirm SOS"}
                    </button>
                  </div>
                </div>
              )}

              {panicMessage && (
                <div
                  role="status"
                  aria-live="assertive"
                  style={{
                    marginTop: 9,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "#fee2e2",
                  }}
                >
                  {panicMessage}
                </div>
              )}
            </div>

            <div
              className="hg-driver-hazard-report"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                border:
                  "1px solid rgba(248,113,113,.38)",
                background:
                  "rgba(69,10,10,.24)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setHazardReportOpen(
                    (current) => !current
                  );

                  setHazardReportMessage("");
                }}
                disabled={
                  hazardReportSubmitting
                }
                style={{
                  width: "100%",
                  border:
                    "1px solid rgba(248,113,113,.55)",
                  borderRadius: 10,
                  padding: "11px 13px",
                  background:
                    "rgba(127,29,29,.58)",
                  color: "#fee2e2",
                  fontWeight: 900,
                  cursor:
                    hazardReportSubmitting
                      ? "wait"
                      : "pointer",
                  opacity:
                    hazardReportSubmitting
                      ? 0.7
                      : 1,
                }}
              >
                {hazardReportOpen
                  ? "Close Hazard Report"
                  : "Report Hazard"}
              </button>

              {hazardReportOpen && (
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "#fecaca",
                    }}
                  >
                    Report what you can see at
                    your current GPS location.
                    Community reports remain
                    unverified until confirmed.
                  </div>

                  <label
                    style={{
                      display: "grid",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#e2e8f0",
                    }}
                  >
                    Hazard type
                    <select
                      aria-label="Hazard report type"
                      value={
                        hazardReportType
                      }
                      onChange={(event) => {
                        setHazardReportType(
                          event.target.value
                        );

                        setHazardReportMessage(
                          ""
                        );
                      }}
                      disabled={
                        hazardReportSubmitting
                      }
                      style={inputStyle}
                    >
                      <option value="roadblock">
                        Roadblock
                      </option>
                      <option value="accident">
                        Accident
                      </option>
                      <option value="flooding">
                        Flooding
                      </option>
                      <option value="traffic_light_outage">
                        Traffic light outage
                      </option>
                      <option value="protest">
                        Protest / disruption
                      </option>
                      <option value="vehicle_breakdown">
                        Vehicle breakdown
                      </option>
                      <option value="road_hazard">
                        Road hazard / debris
                      </option>
                      <option value="police_activity">
                        Police activity
                      </option>
                      <option value="smash_grab_hotspot">
                        Smash-and-grab activity
                      </option>
                    </select>
                  </label>

                  <label
                    style={{
                      display: "grid",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#e2e8f0",
                    }}
                  >
                    Severity
                    <select
                      aria-label="Hazard report severity"
                      value={
                        hazardReportSeverity
                      }
                      onChange={(event) => {
                        setHazardReportSeverity(
                          event.target.value
                        );

                        setHazardReportMessage(
                          ""
                        );
                      }}
                      disabled={
                        hazardReportSubmitting
                      }
                      style={inputStyle}
                    >
                      <option value="low">
                        Low
                      </option>
                      <option value="medium">
                        Medium
                      </option>
                      <option value="high">
                        High
                      </option>
                      <option value="critical">
                        Critical
                      </option>
                    </select>
                  </label>

                  <label
                    style={{
                      display: "grid",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#e2e8f0",
                    }}
                  >
                    Description
                    <textarea
                      aria-label="Hazard report description"
                      value={
                        hazardReportDescription
                      }
                      onChange={(event) => {
                        setHazardReportDescription(
                          event.target.value
                        );
                      }}
                      placeholder="Optional details..."
                      maxLength={500}
                      rows={3}
                      disabled={
                        hazardReportSubmitting
                      }
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: 72,
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      void submitDriverHazardReport();
                    }}
                    disabled={
                      hazardReportSubmitting ||
                      !gpsActive ||
                      !position ||
                      gpsAccuracyPoor
                    }
                    style={{
                      width: "100%",
                      border: 0,
                      borderRadius: 10,
                      padding: "11px 13px",
                      background:
                        "#b91c1c",
                      color: "#ffffff",
                      fontWeight: 900,
                      cursor:
                        hazardReportSubmitting ||
                        !gpsActive ||
                        !position ||
                        gpsAccuracyPoor
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        hazardReportSubmitting ||
                        !gpsActive ||
                        !position ||
                        gpsAccuracyPoor
                          ? 0.55
                          : 1,
                    }}
                  >
                    {hazardReportSubmitting
                      ? "Submitting..."
                      : "Submit Hazard Report"}
                  </button>

                  {(
                    !gpsActive ||
                    !position ||
                    gpsAccuracyPoor
                  ) && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#fbbf24",
                        lineHeight: 1.4,
                      }}
                    >
                      Start GPS and wait for a
                      reliable location fix to
                      submit a report.
                    </div>
                  )}

                  {hazardReportMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "#e2e8f0",
                      }}
                    >
                      {hazardReportMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                color: "#94a3b8",
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
              }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
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
                        {(
                          instruction.roadLabel ||
                          instruction.towardLabel ||
                          instruction.exitNumber ||
                          instruction.landmark
                        ) ? (
                          <div
                            style={{
                              marginTop: 5,
                              display: "grid",
                              gap: 2,
                              fontSize: 12,
                              color: "#94a3b8",
                            }}
                          >
                            {instruction.roadLabel ? (
                              <div>
                                {instruction.roadLabel}
                              </div>
                            ) : null}

                            {instruction.exitNumber ? (
                              <div>
                                Exit {instruction.exitNumber}
                              </div>
                            ) : null}

                            {instruction.towardLabel ? (
                              <div>
                                Toward {instruction.towardLabel}
                              </div>
                            ) : null}

                            {instruction.landmark ? (
                              <div>
                                Landmark: {instruction.landmark}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
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
              <div
                id="safe-navigation-route-options-heading"
                style={{ fontWeight: 900, marginBottom: 8 }}
              >
                Route options
              </div>

              <div
                role="group"
                aria-labelledby="safe-navigation-route-options-heading"
                style={{ display: "grid", gap: 8 }}
              >
                {routes.slice(0, 4).map((route, index) => (
                  <button
                    key={`${route.index ?? index}-${index}`}
                    type="button"
                    aria-pressed={selectedRouteIndex === index}
                    onClick={() => {
                      manualRouteRequestIdRef.current += 1;
                      manualRouteAbortControllerRef.current?.abort();
                      manualRouteAbortControllerRef.current = null;
                      setRouting(false);
                      autoRerouteRequestIdRef.current += 1;
                      autoRerouteAbortControllerRef.current?.abort();
                      autoRerouteAbortControllerRef.current = null;
                      autoRerouteInFlightRef.current = false;
                      setAutoRerouteActive(false);
                      const simulatorOwnsPosition =
                        watchIdRef.current === null &&
                        gpsActive;
                      clearSimulatorTimer();
                      setSimulatorRunning(false);
                      simulatorPointsRef.current = [];
                      simulatorIndexRef.current = 0;
                      if (simulatorOwnsPosition) {
                        setPosition(null);
                        setGpsActive(false);
                        setGpsMessage(
                          "Simulator stopped after route change."
                        );
                      }
                      clearOffRouteTimer();
                      offRouteStartedAtRef.current = null;
                      lastSpokenAnnouncementRef.current.clear();
                      overspeedVoiceArmedRef.current = true;
                      if (
                        typeof window !== "undefined" &&
                        "speechSynthesis" in window
                      ) {
                        window.speechSynthesis.cancel();
                      }
                      setSelectedRouteIndex(index);
                      setRecommendation(null);
                      lastAutoRerouteAtRef.current = 0;
                      setAutoRerouteMessage("");
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
                  onClick={() => {
                    simulatorSpeedKmhRef.current = 20;
                    setSimulatorMessage(
                      "Simulator test speed set to 20 km/h"
                    );
                  }}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #22c55e",
                    background: "#14532d",
                    color: "#dcfce7",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Test 20 km/h
                </button>

                <button
                  type="button"
                  onClick={() => {
                    simulatorSpeedKmhRef.current = 80;
                    setSimulatorMessage(
                      "Simulator test speed set to 80 km/h"
                    );
                  }}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #ef4444",
                    background: "#7f1d1d",
                    color: "#fee2e2",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Test 80 km/h
                </button>
                <button
                  type="button"
                  onClick={forceSimulatorPoorGps}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid #64748b",
                    background: "#334155",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Test Poor GPS
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
                role="status"
                aria-live="polite"
                aria-atomic="true"
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
                  "repeat(6, minmax(0, 1fr))",
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
                label={
                  isOverspeeding
                    ? "OVERSPEED"
                    : "Speed"
                }
                value={
                  isOverspeeding
                    ? `${Math.round(currentSpeedKph)} km/h (+${Math.round(overspeedAmountKph)} over)`
                    : `${Math.round(currentSpeedKph)} km/h`
                }
                alert={isOverspeeding}
              />
              <Metric
                label="Speed Limit"
                value={
                  activeSpeedLimitKph != null
                    ? `${Math.round(activeSpeedLimitKph)} km/h`
                    : "--"
                }
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

          {activeRouteSafetyWarning && (
            <div
              className="hg-active-route-safety-warning"
              role="status"
              aria-live="polite"
              style={{
                position: "absolute",
                left: 18,
                bottom: 390,
                zIndex: 760,
                width:
                  "min(520px, calc(100vw - 36px))",
                padding: "13px 14px",
                borderRadius: 14,
                border:
                  "1px solid rgba(245, 158, 11, .72)",
                background:
                  "rgba(69, 26, 3, .96)",
                color: "#fef3c7",
                boxShadow:
                  "0 16px 44px rgba(0,0,0,.4)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#fbbf24",
                }}
              >
                Safety alert ahead
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontWeight: 900,
                  fontSize: 16,
                  color: "#fff7ed",
                }}
              >
                {activeRouteSafetyVoiceTitle(
                  activeRouteSafetyWarning.threat
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fde68a",
                }}
              >
                {Math.round(
                  activeRouteSafetyWarning.distanceAheadMeters
                )}{" "}
                m ahead on your current route
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "#ffedd5",
                }}
              >
                {activeRouteSafetyWarning.threat.recommendation ||
                  "Stay alert and continue with caution."}
              </div>
              {activeRouteSafetyWarning.threat
                .routeSafetyAlertId &&
                activeRouteSafetyWarning.threat
                  .verificationCount != null && (
                  <div
                    className="hg-community-hazard-trust"
                    aria-label="Community hazard verification"
                    style={{
                      marginTop: 7,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#fed7aa",
                    }}
                  >
                    {Math.max(
                      0,
                      Math.round(
                        activeRouteSafetyWarning.threat
                          .verificationCount
                      )
                    ) === 0
                      ? "Community report - awaiting confirmation"
                      : "Community report - verified"}
                  </div>
                )}

              {activeRouteSafetyWarning.threat
                .routeSafetyAlertId && (
                <div
                  className="hg-hazard-confirmation"
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {hazardConfirmationStateByAlertId[
                    activeRouteSafetyWarning
                      .threat
                      .routeSafetyAlertId
                  ] === "confirmed" ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#bbf7d0",
                      }}
                    >
                      Thanks - hazard confirmed
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void confirmActiveRouteSafetyHazard();
                        }}
                        disabled={
                          hazardConfirmationStateByAlertId[
                            activeRouteSafetyWarning
                              .threat
                              .routeSafetyAlertId
                          ] === "submitting" ||
                          hazardResolutionStateByAlertId[
                            activeRouteSafetyWarning
                              .threat
                              .routeSafetyAlertId
                          ] === "submitting"
                        }
                        style={{
                          border:
                            "1px solid rgba(251,191,36,.7)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          background:
                            "rgba(120,53,15,.55)",
                          color: "#fff7ed",
                          fontSize: 13,
                          fontWeight: 900,
                          cursor:
                            hazardConfirmationStateByAlertId[
                              activeRouteSafetyWarning
                                .threat
                                .routeSafetyAlertId
                            ] === "submitting"
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {hazardConfirmationStateByAlertId[
                          activeRouteSafetyWarning
                            .threat
                            .routeSafetyAlertId
                        ] === "submitting"
                          ? "Confirming..."
                          : hazardConfirmationStateByAlertId[
                                activeRouteSafetyWarning
                                  .threat
                                  .routeSafetyAlertId
                              ] === "failed"
                            ? "Try again"
                            : "Still there"}
                      </button>

                      {hazardConfirmationStateByAlertId[
                        activeRouteSafetyWarning
                          .threat
                          .routeSafetyAlertId
                      ] === "failed" && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#fecaca",
                          }}
                        >
                          Could not confirm hazard.
                        </span>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void resolveActiveRouteSafetyHazard();
                    }}
                    disabled={
                      hazardResolutionStateByAlertId[
                        activeRouteSafetyWarning
                          .threat
                          .routeSafetyAlertId
                      ] === "submitting" ||
                      hazardConfirmationStateByAlertId[
                        activeRouteSafetyWarning
                          .threat
                          .routeSafetyAlertId
                      ] === "submitting"
                    }
                    style={{
                      border:
                        "1px solid rgba(134,239,172,.65)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      background:
                        "rgba(20,83,45,.55)",
                      color: "#dcfce7",
                      fontSize: 13,
                      fontWeight: 900,
                      cursor:
                        hazardResolutionStateByAlertId[
                          activeRouteSafetyWarning
                            .threat
                            .routeSafetyAlertId
                        ] === "submitting"
                          ? "wait"
                          : "pointer",
                    }}
                  >
                    {hazardResolutionStateByAlertId[
                      activeRouteSafetyWarning
                        .threat
                        .routeSafetyAlertId
                    ] === "submitting"
                      ? "Clearing..."
                      : hazardResolutionStateByAlertId[
                            activeRouteSafetyWarning
                              .threat
                              .routeSafetyAlertId
                          ] === "failed"
                        ? "Try clear again"
                        : "No longer there"}
                  </button>

                  {hazardResolutionStateByAlertId[
                    activeRouteSafetyWarning
                      .threat
                      .routeSafetyAlertId
                  ] === "failed" && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#fecaca",
                      }}
                    >
                      Could not clear hazard.
                    </span>
                  )}
                </div>
              )}

              {saferRouteOfferLoading && (
                <div
                  style={{
                    marginTop: 9,
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#fde68a",
                  }}
                >
                  Checking for an alternative route...
                </div>
              )}

              {saferRouteOffer && (
                <div
                  className="hg-safer-route-offer"
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop:
                      "1px solid rgba(251,191,36,.32)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: "#fff7ed",
                    }}
                  >
                    {saferRouteOffer.baselineRoute &&
                    saferRouteDecisionIntelligence(
                      saferRouteOffer.baselineRoute,
                      saferRouteOffer.route
                    ).recommended
                      ? "Safer route recommended"
                      : "Alternative route available"}
                  </div>

                  {saferRouteOffer.baselineRoute ? (
                    <div
                      className="hg-alternative-route-comparison"
                      style={{
                        marginTop: 8,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#fcd34d",
                          lineHeight: 1.4,
                        }}
                      >
                        Fresh comparison from your current position
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 9,
                            background:
                              "rgba(15, 23, 42, .72)",
                            border:
                              "1px solid rgba(148,163,184,.25)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: "#cbd5e1",
                              marginBottom: 5,
                            }}
                          >
                            Current path
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#f8fafc",
                            }}
                          >
                            ETA{" "}
                            {durationLabel(
                              saferRouteOffer.baselineRoute
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#f8fafc",
                              marginTop: 2,
                            }}
                          >
                            Distance{" "}
                            {distanceLabel(
                              saferRouteOffer.baselineRoute
                            )}
                          </div>

                          {saferRouteOffer.baselineRoute
                            .safetyScore != null &&
                          saferRouteOffer.route
                            .safetyScore != null ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#cbd5e1",
                                marginTop: 4,
                              }}
                            >
                              Safety{" "}
                              {Math.round(
                                saferRouteOffer
                                  .baselineRoute
                                  .safetyScore
                              )}
                            </div>
                          ) : null}

                          {saferRouteOffer.baselineRoute
                            .riskScore != null &&
                          saferRouteOffer.route
                            .riskScore != null ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#cbd5e1",
                                marginTop: 2,
                              }}
                            >
                              Risk{" "}
                              {Math.round(
                                saferRouteOffer
                                  .baselineRoute
                                  .riskScore
                              )}
                            </div>
                          ) : null}

                          {saferRouteOffer.baselineRoute
                            .matchedRiskSegmentCount !=
                            null &&
                          saferRouteOffer.route
                            .matchedRiskSegmentCount !=
                            null ? (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                marginTop: 4,
                              }}
                            >
                              {matchedRiskSegmentLabel(
                                saferRouteOffer.baselineRoute
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            padding: 8,
                            borderRadius: 9,
                            background:
                              "rgba(8, 47, 73, .55)",
                            border:
                              "1px solid rgba(34,211,238,.28)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: "#67e8f9",
                              marginBottom: 5,
                            }}
                          >
                            Alternative
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#f8fafc",
                            }}
                          >
                            ETA{" "}
                            {durationLabel(
                              saferRouteOffer.route
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#f8fafc",
                              marginTop: 2,
                            }}
                          >
                            Distance{" "}
                            {distanceLabel(
                              saferRouteOffer.route
                            )}
                          </div>

                          {saferRouteOffer.baselineRoute
                            .safetyScore != null &&
                          saferRouteOffer.route
                            .safetyScore != null ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#cbd5e1",
                                marginTop: 4,
                              }}
                            >
                              Safety{" "}
                              {Math.round(
                                saferRouteOffer.route
                                  .safetyScore
                              )}
                            </div>
                          ) : null}

                          {saferRouteOffer.baselineRoute
                            .riskScore != null &&
                          saferRouteOffer.route
                            .riskScore != null ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#cbd5e1",
                                marginTop: 2,
                              }}
                            >
                              Risk{" "}
                              {Math.round(
                                saferRouteOffer.route
                                  .riskScore
                              )}
                            </div>
                          ) : null}

                          {saferRouteOffer.baselineRoute
                            .matchedRiskSegmentCount !=
                            null &&
                          saferRouteOffer.route
                            .matchedRiskSegmentCount !=
                            null ? (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                marginTop: 4,
                              }}
                            >
                              {matchedRiskSegmentLabel(
                                saferRouteOffer.route
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {saferRouteDecisionIntelligence(
                        saferRouteOffer.baselineRoute,
                        saferRouteOffer.route
                      ).recommended ? (
                        <div
                          className="hg-safer-route-decision-intelligence"
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#67e8f9",
                          }}
                        >
                          Safety +
                          {saferRouteDecisionIntelligence(
                            saferRouteOffer.baselineRoute,
                            saferRouteOffer.route
                          ).safetyImprovement}
                          {" · "}Risk -
                          {saferRouteDecisionIntelligence(
                            saferRouteOffer.baselineRoute,
                            saferRouteOffer.route
                          ).riskReduction}
                        </div>
                      ) : null}
                      {alternativeRouteTimeComparisonLabel(
                        saferRouteOffer.baselineRoute,
                        saferRouteOffer.route
                      ) ? (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#fde68a",
                          }}
                        >
                          {alternativeRouteTimeComparisonLabel(
                            saferRouteOffer.baselineRoute,
                            saferRouteOffer.route
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: "#fde68a",
                      }}
                    >
                      {saferRouteOffer.durationMinutes != null
                        ? `Estimated ${saferRouteOffer.durationMinutes} min from your current position`
                        : "Fresh route calculated from your current position"}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      acceptSaferRouteOffer
                    }
                    style={{
                      marginTop: 9,
                      width: "100%",
                      borderRadius: 10,
                      border:
                        "1px solid rgba(34,211,238,.8)",
                      background:
                        "#0891b2",
                      color: "#ecfeff",
                      padding:
                        "10px 12px",
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Take Alternative Route
                  </button>

                  <button
                    type="button"
                    onClick={keepCurrentRoute}
                    style={{
                      marginTop: 7,
                      width: "100%",
                      borderRadius: 10,
                      border:
                        "1px solid rgba(148,163,184,.45)",
                      background:
                        "rgba(15,23,42,.72)",
                      color: "#cbd5e1",
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Keep Current Route
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedRoute &&
            selectedRoute.safetyScore != null &&
            selectedRoute.riskScore != null && (
              <div
                className="hg-navigation-recommendation"
                style={{
                  position: "absolute",
                  left: 18,
                  bottom: 190,
                  zIndex: 700,
                  maxWidth: 520,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(2, 6, 23, .92)",
                  color: "#cbd5e1",
                  border: "1px solid #334155",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    color: "#f8fafc",
                    fontWeight: 900,
                    marginBottom: 5,
                  }}
                >
                  Why this route?
                </div>

                <div
                  style={{
                    color: "#67e8f9",
                    fontWeight: 800,
                    marginBottom: 5,
                  }}
                >
                  Safety{" "}
                  {Math.round(
                    selectedRoute.safetyScore
                  )}
                  {" · "}
                  Risk{" "}
                  {Math.round(
                    selectedRoute.riskScore
                  )}
                </div>

                {liveRoadIntelligence &&
                  liveRoadIntelligenceLabel(
                    liveRoadIntelligence
                  ) && (
                    <div
                      aria-label="Live road intelligence"
                      style={{
                        marginBottom: 7,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background:
                          "rgba(8, 47, 73, .55)",
                        border:
                          "1px solid rgba(34,211,238,.28)",
                        color: "#bae6fd",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          color: "#f8fafc",
                          fontWeight: 900,
                          marginBottom: 3,
                        }}
                      >
                        Live road conditions
                      </div>

                      {liveRoadIntelligenceLabel(
                        liveRoadIntelligence
                      )}
                    </div>
                  )}

                {routeWeatherIntelligence &&
                  routeWeatherIntelligenceLabel(
                    routeWeatherIntelligence
                  ) && (
                    <div
                      aria-label="Route weather intelligence"
                      style={{
                        marginBottom: 7,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background:
                          "rgba(30, 41, 59, .72)",
                        border:
                          "1px solid rgba(125,211,252,.28)",
                        color: "#bae6fd",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          color: "#f8fafc",
                          fontWeight: 900,
                          marginBottom: 3,
                        }}
                      >
                        Route weather
                      </div>

                      {routeWeatherIntelligenceLabel(
                        routeWeatherIntelligence
                      )}

                      {routeWeatherIntelligence
                        .riskReasons.length > 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            color: "#cbd5e1",
                            fontWeight: 600,
                          }}
                        >
                          {
                            routeWeatherIntelligence
                              .riskReasons[0]
                          }
                        </div>
                      )}
                      <div
                        aria-label="Weather driving guidance"
                        style={{
                          marginTop: 5,
                          color: "#fde68a",
                          fontWeight: 700,
                        }}
                      >
                        {routeWeatherDriverGuidance(
                          routeWeatherIntelligence
                        )}
                      </div>
                    </div>
                  )}

                {routeSafetyExplanation(
                  selectedRoute
                ) && (
                  <div>
                    {routeSafetyExplanation(
                      selectedRoute
                    )}
                  </div>
                )}

                {matchedRiskSegmentLabel(
                  selectedRoute
                ) && (
                  <div
                    style={{
                      marginTop: 4,
                      color: "#94a3b8",
                    }}
                  >
                    {matchedRiskSegmentLabel(
                      selectedRoute
                    )}
                  </div>
                )}

                {recommendation && (
                  <div
                    style={{
                      marginTop: 7,
                      paddingTop: 7,
                      borderTop:
                        "1px solid rgba(148,163,184,.22)",
                    }}
                  >
                    <strong
                      style={{
                        color: "#e2e8f0",
                      }}
                    >
                      HarborGuard assessment:
                    </strong>{" "}
                    {recommendation}
                  </div>
                )}
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
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      style={{
        background: alert
          ? "rgba(127,29,29,.97)"
          : "rgba(2,6,23,.96)",
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
  fontSize: 14,
};
