"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import dynamic from "next/dynamic";
import { CSSProperties, Fragment, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });

type FleetAlert = {
  id?: string;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type FleetStop = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
};

type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName?: string | null;
  isOffline?: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
  speedKmh?: number | null;
  heading?: number | null;
  lastSeen?: string | null;
  openAlerts?: FleetAlert[];
  route?: any[];
  stops?: FleetStop[];
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function cleanRoute(route?: any[]) {
  return (route || [])
    .map((p) => {
      const lat = Array.isArray(p) ? toNumber(p[0]) : toNumber(p?.latitude);
      const lng = Array.isArray(p) ? toNumber(p[1]) : toNumber(p?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      if (lat === 0 && lng === 0) return null;

      return [lat, lng] as [number, number];
    })
    .filter((p): p is [number, number] => p !== null);
}

function cleanLatLng(latitude: unknown, longitude: unknown): [number, number] | null {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePosition(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  return [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function alertLabel(value?: string | null) {
  return (value || "unknown_alert").replace(/_/g, " ").toUpperCase();
}

function vehicleRisk(vehicle: FleetVehicle) {
  const alerts = vehicle.openAlerts || [];
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.some((a) => a.severity === "high")) return "high";
  if (alerts.length > 0) return "alert";
  if (vehicle.isOffline) return "offline";
  return "normal";
}

function riskText(risk: string) {
  if (risk === "critical") return "Critical";
  if (risk === "high") return "High Risk";
  if (risk === "alert") return "Alert";
  if (risk === "offline") return "Offline";
  return "Normal";
}

function riskColor(risk: string) {
  if (risk === "critical") return "#dc2626";
  if (risk === "high") return "#ea580c";
  if (risk === "alert") return "#d97706";
  if (risk === "offline") return "#64748b";
  return "#16a34a";
}

function replayHref(vehicle: FleetVehicle) {
  const replayDate = vehicle.lastSeen ? new Date(vehicle.lastSeen) : new Date();

  const startDate = new Date(replayDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(replayDate);
  endDate.setHours(23, 59, 59, 999);

  const start = encodeURIComponent(startDate.toISOString());
  const end = encodeURIComponent(endDate.toISOString());

  return `/route-replay?vehicleId=${vehicle.id}&start=${start}&end=${end}&autoplay=1`;
}

async function createVehicleIcon(risk: string, selected: boolean) {
  const L = (await import("leaflet")).default;
  const color = riskColor(risk);

  return L.divIcon({
    className: "",
    html: `<div style="
      width:${selected ? "34px" : "26px"};
      height:${selected ? "34px" : "26px"};
      border-radius:9999px;
      background:${color};
      border:5px solid white;
      box-shadow:0 0 0 ${selected ? "8px" : "4px"} rgba(37,99,235,0.18),0 12px 28px rgba(15,23,42,0.3);
    "></div>`,
    iconSize: [selected ? 34 : 26, selected ? 34 : 26],
    iconAnchor: [selected ? 17 : 13, selected ? 17 : 13],
    popupAnchor: [0, -14],
  });
}

export default function CommandCenterPage() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, [number, number]>>({});
  const [icons, setIcons] = useState<Record<string, any>>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);

  async function loadFleet() {
    try {
      const response = await fetch("/api/fleet/live", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load command center.");
        return;
      }

      setFleet(result.fleet || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load command center.");
    } finally {
      setLoading(false);
    }
  }

  async function runRiskDetection() {
    setMessage("Running risk detection...");
    try {
      const response = await fetch("/api/fleet/detect-risks", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Risk detection failed.");
        return;
      }

      setMessage(`Risk detection complete. New alerts: ${result.createdCount || 0}`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Risk detection failed.");
    }
  }

  async function triggerPanic(vehicle: FleetVehicle) {
    setMessage(`Triggering panic escalation for ${vehicle.registrationNumber}...`);
    try {
      const response = await fetch("/api/fleet/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          message: `PANIC triggered from Command Center for ${vehicle.registrationNumber}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Panic escalation failed.");
        return;
      }

      setMessage(`Panic escalation triggered for ${vehicle.registrationNumber}.`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Panic escalation failed.");
    }
  }

  async function resolveFirstAlert(vehicle: FleetVehicle) {
    const alert = vehicle.openAlerts?.[0];

    if (!alert?.id) {
      setMessage("No alert available to resolve.");
      return;
    }

    setMessage(`Resolving first alert for ${vehicle.registrationNumber}...`);

    try {
      const response = await fetch("/api/fleet/resolve-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          resolutionNotes: "Resolved from Command Center.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Alert resolve failed.");
        return;
      }

      setMessage(`Alert resolved for ${vehicle.registrationNumber}.`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Alert resolve failed.");
    }
  }

  useEffect(() => {
    loadFleet();
    const interval = setInterval(loadFleet, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function buildIcons() {
      const next: Record<string, any> = {};

      for (const vehicle of fleet) {
        next[vehicle.id] = await createVehicleIcon(
          vehicleRisk(vehicle),
          selectedVehicleId === vehicle.id
        );
      }

      if (!cancelled) setIcons(next);
    }

    buildIcons();

    return () => {
      cancelled = true;
    };
  }, [fleet, selectedVehicleId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPositions((prev) => {
        const next: Record<string, [number, number]> = {};

        fleet.forEach((vehicle) => {
          const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);
          if (!coords) return;

          const previous = prev[vehicle.id];

          if (!previous) {
            next[vehicle.id] = coords;
          } else {
            next[vehicle.id] = interpolatePosition(previous, coords, 0.2);
          }
        });

        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [fleet]);

  const vehiclesWithLocation = useMemo(
    () => fleet.filter((v) => cleanLatLng(v.latitude, v.longitude)),
    [fleet]
  );

  const selectedVehicle = useMemo(
    () => fleet.find((v) => v.id === selectedVehicleId) || null,
    [fleet, selectedVehicleId]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    const selectedCoords = selectedVehicle
      ? cleanLatLng(selectedVehicle.latitude, selectedVehicle.longitude)
      : null;

    if (selectedCoords) return selectedCoords;

    const first = vehiclesWithLocation[0];
    const firstCoords = first ? cleanLatLng(first.latitude, first.longitude) : null;

    return firstCoords || [-33.9249, 18.4241];
  }, [vehiclesWithLocation, selectedVehicle]);

  const summary = useMemo(() => {
    return {
      total: fleet.length,
      mapped: vehiclesWithLocation.length,
      critical: fleet.filter((v) => vehicleRisk(v) === "critical").length,
      offline: fleet.filter((v) => vehicleRisk(v) === "offline").length,
      alerts: fleet.filter((v) => (v.openAlerts || []).length > 0).length,
      stops: fleet.reduce((total, v) => total + (v.stops?.length || 0), 0),
    };
  }, [fleet, vehiclesWithLocation]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Command Center</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Live GPS command map with route trails, stop detection, risk alerts, replay, and emergency escalation.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Vehicles", value: summary.total, color: "#0f172a" },
          { label: "Mapped", value: summary.mapped, color: "#2563eb" },
          { label: "Stops", value: summary.stops, color: "#7c3aed" },
          { label: "With Alerts", value: summary.alerts, color: "#d97706" },
          { label: "Critical", value: summary.critical, color: "#dc2626" },
          { label: "Offline", value: summary.offline, color: "#64748b" },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={loadFleet} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
            Refresh
          </button>

          <button onClick={runRiskDetection} style={{ border: "none", borderRadius: 12, background: "#2563eb", color: "#fff", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
            Run Risk Detection
          </button>

          <button onClick={() => setShowRoutes((v) => !v)} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: showRoutes ? "#eff6ff" : "#fff", padding: "12px 16px", fontWeight: 800, cursor: "pointer", color: "#1d4ed8" }}>
            {showRoutes ? "Hide Routes" : "Show Routes"}
          </button>

          <button onClick={() => setShowStops((v) => !v)} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: showStops ? "#faf5ff" : "#fff", padding: "12px 16px", fontWeight: 800, cursor: "pointer", color: "#7c3aed" }}>
            {showStops ? "Hide Stops" : "Show Stops"}
          </button>

          <div style={{ color: "#64748b", fontSize: 14 }}>Auto-refreshes every 15 seconds.</div>
        </div>

        {message ? (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" }}>
            {message}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 4px 0" }}>Live Tactical Fleet Map</h2>
          <div style={{ color: "#64748b", marginBottom: 12 }}>
            Blue trails show movement history. Purple circles show stops.
          </div>

          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #e5e7eb", height: 620 }}>
            <MapContainer center={mapCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {vehiclesWithLocation.map((vehicle) => {
                const risk = vehicleRisk(vehicle);
                const icon = icons[vehicle.id];
                const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);
                const routePoints = cleanRoute(vehicle.route);
                const selected = selectedVehicleId === vehicle.id;

                if (!icon || !coords) return null;

                return (
                  <Fragment key={vehicle.id}>
                    {showRoutes && routePoints.length > 1 ? (
                      <>
                        <Polyline positions={routePoints} pathOptions={{ color: "#0f172a", weight: selected ? 10 : 7, opacity: selected ? 0.18 : 0.12, lineJoin: "round", lineCap: "round" }} />
                        <Polyline positions={routePoints} pathOptions={{ color: selected ? "#2563eb" : "#3b82f6", weight: selected ? 5 : 3, opacity: selected ? 0.98 : 0.85, lineJoin: "round", lineCap: "round" }} />
                        <Polyline positions={routePoints} pathOptions={{ color: "#bfdbfe", weight: selected ? 2 : 1, opacity: selected ? 0.95 : 0.75, lineJoin: "round", lineCap: "round" }} />
                      </>
                    ) : null}

                    {showStops && (vehicle.stops || []).map((stop) => {
                      const stopCoords = cleanLatLng(stop.latitude, stop.longitude);
                      if (!stopCoords) return null;

                      return (
                        <CircleMarker key={stop.id} center={stopCoords} radius={selected ? 8 : 6} pathOptions={{ color: "#7c3aed", fillColor: "#a855f7", fillOpacity: 0.65, weight: 2 }}>
                          <Popup>
                            <div style={{ minWidth: 180 }}>
                              <strong>Stop detected</strong>
                              <br />Vehicle: {vehicle.registrationNumber}
                              <br />Started: {formatDateTime(stop.started_at)}
                              <br />Ended: {formatDateTime(stop.ended_at)}
                              <br />Duration: {Math.round((stop.duration_seconds || 0) / 60)} min
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}

                    <Marker position={animatedPositions[vehicle.id] || coords} icon={icon} eventHandlers={{ click: () => setSelectedVehicleId(vehicle.id) }}>
                      <Popup>
                        <div style={{ minWidth: 250 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>{vehicle.registrationNumber}</div>
                          <div style={{ color: "#64748b", marginBottom: 8 }}>Nickname: {vehicle.nickname || "-"}</div>
                          <div><strong>Status:</strong> <span style={{ color: riskColor(risk), fontWeight: 800 }}>{riskText(risk)}</span></div>
                          <div><strong>Driver:</strong> {vehicle.driverName || "-"}</div>
                          <div><strong>Speed:</strong> {Math.round(vehicle.speedKmh || 0)} km/h</div>
                          <div><strong>Heading:</strong> {Math.round(vehicle.heading || 0)}°</div>
                          <div><strong>Last Seen:</strong> {formatDateTime(vehicle.lastSeen)}</div>
                          <div style={{ marginTop: 8 }}><strong>Route Points:</strong> {routePoints.length}<br /><strong>Stops:</strong> {vehicle.stops?.length || 0}</div>

                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <Link href={replayHref(vehicle)} style={{ textDecoration: "none", borderRadius: 10, background: "#2563eb", color: "#fff", padding: "8px 10px", fontWeight: 800 }}>
                              Replay
                            </Link>
                            <button onClick={() => triggerPanic(vehicle)} style={{ borderRadius: 10, background: "#dc2626", color: "#fff", padding: "8px 10px", fontWeight: 800, border: "none", cursor: "pointer" }}>
                              Panic
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 16px 0" }}>Active Operations</h2>

          {loading ? (
            <div>Loading command center...</div>
          ) : fleet.length === 0 ? (
            <div style={{ color: "#64748b" }}>No vehicles found.</div>
          ) : (
            <div style={{ display: "grid", gap: 14, maxHeight: 620, overflowY: "auto" }}>
              {fleet.map((vehicle) => {
                const risk = vehicleRisk(vehicle);
                const alerts = vehicle.openAlerts || [];
                const selected = selectedVehicleId === vehicle.id;
                const routePoints = cleanRoute(vehicle.route);

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    style={{
                      border: selected ? "2px solid #2563eb" : `1px solid ${risk === "normal" ? "#e5e7eb" : "#fecaca"}`,
                      borderRadius: 16,
                      padding: 16,
                      background: risk === "critical" ? "#fff7f7" : selected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{vehicle.registrationNumber}</div>
                        <div style={{ color: "#64748b", fontSize: 14 }}>{vehicle.nickname || "-"}</div>
                      </div>
                      <div style={{ color: riskColor(risk), fontWeight: 900 }}>{riskText(risk)}</div>
                    </div>

                    <div style={{ color: "#334155", fontSize: 14, marginTop: 10 }}>Driver: {vehicle.driverName || "-"}</div>
                    <div style={{ color: "#334155", fontSize: 14 }}>Speed: {Math.round(vehicle.speedKmh || 0)} km/h</div>
                    <div style={{ color: "#334155", fontSize: 14 }}>Last Seen: {formatDateTime(vehicle.lastSeen)}</div>
                    <div style={{ color: "#334155", fontSize: 14 }}>Route Points: {routePoints.length} | Stops: {vehicle.stops?.length || 0}</div>

                    {alerts.length > 0 ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {alerts.slice(0, 3).map((alert, index) => (
                          <div key={alert.id || index} style={{ padding: 10, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13 }}>
                            <strong>{alertLabel(alert.alert_type)}</strong>
                            <br />
                            {alert.message || "No message"}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <Link href={replayHref(vehicle)} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none", borderRadius: 10, background: "#2563eb", color: "#fff", padding: "8px 10px", fontWeight: 800, fontSize: 13 }}>
                        Replay
                      </Link>

                      <button onClick={(e) => { e.stopPropagation(); triggerPanic(vehicle); }} style={{ borderRadius: 10, background: "#dc2626", color: "#fff", padding: "8px 10px", fontWeight: 800, border: "none", cursor: "pointer", fontSize: 13 }}>
                        Panic
                      </button>

                      {alerts.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); resolveFirstAlert(vehicle); }} style={{ borderRadius: 10, border: "1px solid #16a34a", color: "#16a34a", padding: "8px 10px", fontWeight: 800, background: "#fff", cursor: "pointer", fontSize: 13 }}>
                          Resolve
                        </button>
                      ) : null}

                      <Link href="/risk-dashboard" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none", borderRadius: 10, border: "1px solid #cbd5e1", color: "#0f172a", padding: "8px 10px", fontWeight: 800, fontSize: 13 }}>
                        Risk Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}