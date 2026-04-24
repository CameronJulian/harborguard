"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
};

type FleetResponse = {
  success: boolean;
  fleet: FleetVehicle[];
};

type ReplayPoint = {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string | null;
  source: string | null;
};

type ReplayAlert = {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
};

type ReplayResponse = {
  success: boolean;
  vehicle?: {
    id: string;
    nickname: string | null;
    registration_number: string;
    make: string | null;
    model: string | null;
  } | null;
  pointCount: number;
  alertCount: number;
  points: ReplayPoint[];
  alerts: ReplayAlert[];
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 16px",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 16px",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function severityColor(severity: string) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

function alertTypeLabel(value: string) {
  return value.replace(/_/g, " ");
}

function findNearestPointForAlert(alert: ReplayAlert, points: ReplayPoint[]) {
  if (!alert.created_at || points.length === 0) return null;

  const alertMs = new Date(alert.created_at).getTime();
  let closest: ReplayPoint | null = null;
  let minDiff = Number.POSITIVE_INFINITY;

  for (const point of points) {
    if (!point.recorded_at) continue;
    const diff = Math.abs(new Date(point.recorded_at).getTime() - alertMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}

function MapAutoCenter({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, map.getZoom(), {
      duration: 0.6,
    });
  }, [position, map]);

  return null;
}

async function createPlaybackIcon() {
  const L = (await import("leaflet")).default;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:9999px;
        background:#2563eb;
        border:4px solid white;
        box-shadow:0 0 0 2px rgba(37,99,235,0.25), 0 8px 18px rgba(15,23,42,0.22);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

async function createAlertIcon(severity: string) {
  const L = (await import("leaflet")).default;
  const color = severity === "critical" ? "#dc2626" : severity === "high" ? "#ea580c" : "#d97706";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:9999px;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 0 2px rgba(15,23,42,0.16);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export default function RouteReplayPage() {
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [alerts, setAlerts] = useState<ReplayAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState(900);
  const [playbackIcon, setPlaybackIcon] = useState<any>(null);
  const [alertIcons, setAlertIcons] = useState<Record<string, any>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    createPlaybackIcon().then(setPlaybackIcon);
  }, []);

  useEffect(() => {
    const vehicleIdFromUrl = searchParams.get("vehicleId") || "";
    const startFromUrl = searchParams.get("start");
    const endFromUrl = searchParams.get("end");

    if (vehicleIdFromUrl) setSelectedVehicleId(vehicleIdFromUrl);
    if (startFromUrl) setStart(toLocalDateTimeInput(startFromUrl));
    if (endFromUrl) setEnd(toLocalDateTimeInput(endFromUrl));
  }, [searchParams]);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch("/api/fleet/live", { cache: "no-store" });
        const result = (await response.json()) as FleetResponse | { error: string };

        if (!response.ok) {
          setMessage("Failed to load vehicles.");
          return;
        }

        const fleet = (result as FleetResponse).fleet || [];
        setVehicles(fleet);

        if (fleet.length > 0 && !searchParams.get("vehicleId")) {
          setSelectedVehicleId((current) => current || fleet[0].id);
        }
      } catch (err: any) {
        setMessage(err.message || "Failed to load vehicles.");
      }
    }

    loadVehicles();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedVehicleId || !vehicles.length || hasLoadedOnce) return;
    loadReplay(selectedVehicleId, searchParams.get("autoplay") === "1");
  }, [selectedVehicleId, vehicles, hasLoadedOnce, searchParams]);

  useEffect(() => {
    return () => {
      stopPlaybackTimer();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      stopPlaybackTimer();
      return;
    }

    if (points.length <= 1) {
      setIsPlaying(false);
      return;
    }

    stopPlaybackTimer();

    timerRef.current = setInterval(() => {
      setPlaybackIndex((current) => {
        if (current >= points.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, playbackSpeedMs);

    return () => {
      stopPlaybackTimer();
    };
  }, [isPlaying, playbackSpeedMs, points.length]);

  useEffect(() => {
    let cancelled = false;

    async function buildAlertIcons() {
      const next: Record<string, any> = {};
      for (const alert of alerts) {
        next[alert.id] = await createAlertIcon(alert.severity);
      }
      if (!cancelled) setAlertIcons(next);
    }

    if (alerts.length > 0) buildAlertIcons();
    else setAlertIcons({});

    return () => {
      cancelled = true;
    };
  }, [alerts]);

  function stopPlaybackTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function loadReplay(vehicleIdOverride?: string, autoPlay = false) {
    const vehicleId = vehicleIdOverride || selectedVehicleId;

    if (!vehicleId) {
      setMessage("Please select a vehicle.");
      setPoints([]);
      setAlerts([]);
      setVehicleLabel("");
      setIsPlaying(false);
      setPlaybackIndex(0);
      return;
    }

    setLoading(true);
    setMessage("");
    setPoints([]);
    setAlerts([]);
    setVehicleLabel("");
    setIsPlaying(false);
    setPlaybackIndex(0);

    try {
      const params = new URLSearchParams();
      params.set("vehicleId", vehicleId);

      if (start.trim()) params.set("start", new Date(start).toISOString());
      if (end.trim()) params.set("end", new Date(end).toISOString());

      const response = await fetch(`/api/fleet/replay?${params.toString()}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as ReplayResponse | { error: string };

      if (!response.ok) {
        setMessage("error" in result ? result.error : "Failed to load replay.");
        return;
      }

      const replay = result as ReplayResponse;
      const replayPoints = replay.points || [];
      const replayAlerts = replay.alerts || [];
      const label =
        replay.vehicle?.nickname && replay.vehicle?.registration_number
          ? `${replay.vehicle.nickname} - ${replay.vehicle.registration_number}`
          : replay.vehicle?.nickname ||
            replay.vehicle?.registration_number ||
            "Vehicle";

      setPoints(replayPoints);
      setAlerts(replayAlerts);
      setVehicleLabel(label);
      setPlaybackIndex(0);

      if (replayPoints.length === 0) {
        setMessage("No route points found for the selected vehicle and time range.");
      } else if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to load replay.");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  function handlePlay() {
    if (points.length <= 1) {
      setMessage("Load a replay with at least 2 points to play animation.");
      return;
    }

    setMessage("");

    if (playbackIndex >= points.length - 1) {
      setPlaybackIndex(0);
    }

    setIsPlaying(true);
  }

  function handlePause() {
    setIsPlaying(false);
  }

  function handleReset() {
    setIsPlaying(false);
    setPlaybackIndex(0);
  }

  const polylinePositions = useMemo(
    () => points.map((point) => [point.latitude, point.longitude] as [number, number]),
    [points]
  );

  const startPoint = points[0] || null;
  const endPoint = points.length > 0 ? points[points.length - 1] : null;
  const currentPlaybackPoint = points[playbackIndex] || null;

  const visitedPositions = useMemo(
    () =>
      points
        .slice(0, playbackIndex + 1)
        .map((point) => [point.latitude, point.longitude] as [number, number]),
    [points, playbackIndex]
  );

  const replayAlertMarkers = useMemo(
    () =>
      alerts
        .map((alert) => {
          const nearestPoint = findNearestPointForAlert(alert, points);
          if (!nearestPoint) return null;

          return {
            alert,
            latitude: nearestPoint.latitude,
            longitude: nearestPoint.longitude,
          };
        })
        .filter(Boolean) as Array<{
        alert: ReplayAlert;
        latitude: number;
        longitude: number;
      }>,
    [alerts, points]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (currentPlaybackPoint) {
      return [currentPlaybackPoint.latitude, currentPlaybackPoint.longitude];
    }
    if (startPoint) {
      return [startPoint.latitude, startPoint.longitude];
    }
    return [-33.9249, 18.4241];
  }, [currentPlaybackPoint, startPoint]);

  const progressPercent =
    points.length > 1 ? Math.round((playbackIndex / (points.length - 1)) * 100) : 0;

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Route Replay</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Replay vehicle movement history, animate playback, and inspect alert locations on the route.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 180px",
            gap: 14,
          }}
        >
          <select
            value={selectedVehicleId}
            onChange={(e) => {
              setSelectedVehicleId(e.target.value);
              setPoints([]);
              setAlerts([]);
              setVehicleLabel("");
              setMessage("");
              setIsPlaying(false);
              setPlaybackIndex(0);
            }}
            style={inputStyle}
          >
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.nickname || vehicle.registrationNumber} - {vehicle.registrationNumber}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={inputStyle}
          />

          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={inputStyle}
          />

          <button onClick={() => loadReplay()} style={primaryButtonStyle} disabled={loading}>
            {loading ? "Loading..." : "Load Replay"}
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={handlePlay} style={primaryButtonStyle} disabled={loading || points.length < 2}>
            Play
          </button>

          <button onClick={handlePause} style={secondaryButtonStyle} disabled={!isPlaying}>
            Pause
          </button>

          <button onClick={handleReset} style={secondaryButtonStyle} disabled={points.length === 0}>
            Reset
          </button>

          <select
            value={String(playbackSpeedMs)}
            onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
            style={{ ...inputStyle, width: 180 }}
          >
            <option value="1400">Slow</option>
            <option value="900">Normal</option>
            <option value="450">Fast</option>
            <option value="220">Very Fast</option>
          </select>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Leave dates empty to load full route history.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                transition: "width 120ms linear",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            <span>Progress: {progressPercent}%</span>
            <span>
              Frame {points.length === 0 ? 0 : playbackIndex + 1} / {points.length}
            </span>
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 28, margin: "0 0 6px 0" }}>
              {vehicleLabel || "Replay Map"}
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              Blue path = full replay route. Darker path = visited path. Red/orange markers = alerts near the route.
            </p>
          </div>

          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              height: 560,
            }}
          >
            <MapContainer
              center={mapCenter}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {currentPlaybackPoint && (
                <MapAutoCenter
                  position={[
                    currentPlaybackPoint.latitude,
                    currentPlaybackPoint.longitude,
                  ]}
                />
              )}

              {polylinePositions.length >= 2 && (
                <Polyline
                  positions={polylinePositions}
                  pathOptions={{
                    color: "#93c5fd",
                    weight: 5,
                    opacity: 0.9,
                  }}
                />
              )}

              {visitedPositions.length >= 2 && (
                <Polyline
                  positions={visitedPositions}
                  pathOptions={{
                    color: "#1d4ed8",
                    weight: 6,
                    opacity: 1,
                  }}
                />
              )}

              {replayAlertMarkers.map(({ alert, latitude, longitude }) =>
                alertIcons[alert.id] ? (
                  <Marker
                    key={alert.id}
                    position={[latitude, longitude]}
                    icon={alertIcons[alert.id]}
                  >
                    <Popup>
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          {alertTypeLabel(alert.alert_type)}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>Severity:</strong> {alert.severity}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>Created:</strong> {formatDateTime(alert.created_at)}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          {alert.message}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>Status:</strong> {alert.is_resolved ? "Resolved" : "Open"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}

              {startPoint ? (
                <Marker position={[startPoint.latitude, startPoint.longitude]}>
                  <Popup>
                    <div>
                      <strong>Start Point</strong>
                      <br />
                      {formatDateTime(startPoint.recorded_at)}
                    </div>
                  </Popup>
                </Marker>
              ) : null}

              {endPoint ? (
                <Marker position={[endPoint.latitude, endPoint.longitude]}>
                  <Popup>
                    <div>
                      <strong>End Point</strong>
                      <br />
                      {formatDateTime(endPoint.recorded_at)}
                    </div>
                  </Popup>
                </Marker>
              ) : null}

              {currentPlaybackPoint && playbackIcon ? (
                <Marker
                  position={[currentPlaybackPoint.latitude, currentPlaybackPoint.longitude]}
                  icon={playbackIcon}
                >
                  <Popup>
                    <div>
                      <strong>Playback Position</strong>
                      <br />
                      {formatDateTime(currentPlaybackPoint.recorded_at)}
                      <br />
                      Speed: {currentPlaybackPoint.speed_kmh ?? 0} km/h
                    </div>
                  </Popup>
                </Marker>
              ) : null}
            </MapContainer>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ fontSize: 28, margin: "0 0 12px 0" }}>Replay Summary</h2>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Vehicle</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>
                  {vehicleLabel || "-"}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Points Loaded</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{points.length}</div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Alerts Loaded</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{alerts.length}</div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Replay Start</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDateTime(startPoint?.recorded_at || null)}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Replay End</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDateTime(endPoint?.recorded_at || null)}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>Current Playback Time</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDateTime(currentPlaybackPoint?.recorded_at || null)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ fontSize: 28, margin: "0 0 12px 0" }}>Alert Timeline</h2>

            <div style={{ display: "grid", gap: 12, maxHeight: 220, overflowY: "auto", marginBottom: 20 }}>
              {alerts.length === 0 ? (
                <div style={{ color: "#64748b" }}>No alerts in this replay range.</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      border: `1px solid ${alert.is_resolved ? "#bbf7d0" : "#fecaca"}`,
                      borderRadius: 14,
                      padding: 14,
                      background: alert.is_resolved ? "#f0fdf4" : "#fff7ed",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        marginBottom: 6,
                        color: severityColor(alert.severity),
                        textTransform: "capitalize",
                      }}
                    >
                      {alertTypeLabel(alert.alert_type)}
                    </div>
                    <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                      <strong>Time:</strong> {formatDateTime(alert.created_at)}
                    </div>
                    <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                      <strong>Severity:</strong> {alert.severity}
                    </div>
                    <div style={{ color: "#334155", fontSize: 14 }}>
                      {alert.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            <h2 style={{ fontSize: 28, margin: "0 0 12px 0" }}>Point Timeline</h2>

            <div style={{ display: "grid", gap: 12, maxHeight: 280, overflowY: "auto" }}>
              {points.length === 0 ? (
                <div style={{ color: "#64748b" }}>No points loaded yet.</div>
              ) : (
                points.map((point, index) => {
                  const isActive = index === playbackIndex;

                  return (
                    <div
                      key={point.id}
                      style={{
                        border: isActive ? "2px solid #2563eb" : "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: isActive ? "#eff6ff" : "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>
                        Point {index + 1} {isActive ? "• Current" : ""}
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Time:</strong> {formatDateTime(point.recorded_at)}
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Coords:</strong> {point.latitude}, {point.longitude}
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Speed:</strong> {point.speed_kmh ?? 0} km/h
                      </div>
                      <div style={{ color: "#334155", fontSize: 14 }}>
                        <strong>Source:</strong> {point.source || "-"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}