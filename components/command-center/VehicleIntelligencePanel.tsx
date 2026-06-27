"use client";

import Link from "next/link";

type Props = {
  vehicle: any | null;
  incidents: any[];
  onPredictRoute: (vehicle: any) => void;
  onSaferRoute: (vehicle: any) => void;
  onResolveAlert: (vehicle: any) => void;
  onPanic: (vehicle: any) => void;
  replayHref: (vehicle: any) => string;
};

function secondsSince(value?: string | null) {
  if (!value) return "Unknown";
  return `${Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))}s ago`;
}

function alertLabel(value?: string | null) {
  return String(value || "alert").replace(/_/g, " ").toUpperCase();
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function riskLevel(vehicle: any, nearbyThreats: any[]) {
  const alerts = vehicle?.openAlerts || [];
  if (alerts.some((a: any) => a.severity === "critical")) return "CRITICAL";
  if (alerts.some((a: any) => a.severity === "high")) return "HIGH";
  if (vehicle?.isOffline) return "OFFLINE";
  if (alerts.length > 0 || nearbyThreats.length > 0) return "MEDIUM";
  return "LOW";
}

function recommendation(level: string, vehicle: any, nearbyThreats: any[]) {
  if (level === "CRITICAL") {
    return "Escalate immediately. Contact the driver, confirm the incident, and dispatch response support.";
  }

  if (level === "HIGH") {
    return "Contact the driver now and review safer route options.";
  }

  if (level === "OFFLINE") {
    return "Verify tracker connectivity and contact the driver.";
  }

  if (nearbyThreats.length > 0) {
    return "Vehicle is near active route threats. Review route safety before the next stop.";
  }

  if ((vehicle?.openAlerts || []).length > 0) {
    return "Monitor vehicle and resolve the open alert once confirmed safe.";
  }

  return "Route appears stable. Continue routine monitoring.";
}

export default function VehicleIntelligencePanel({
  vehicle,
  incidents,
  onPredictRoute,
  onSaferRoute,
  onResolveAlert,
  onPanic,
  replayHref,
}: Props) {
  if (!vehicle) {
    return (
      <div style={{ padding: 18, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff" }}>
        <h2 style={{ margin: "0 0 8px 0" }}>Vehicle Intelligence</h2>
        <div style={{ color: "#64748b" }}>Select a vehicle to view its operational intelligence.</div>
      </div>
    );
  }

  const vehicleLat = Number(vehicle.latitude);
  const vehicleLng = Number(vehicle.longitude);

  const nearbyThreats =
    Number.isFinite(vehicleLat) && Number.isFinite(vehicleLng)
      ? incidents.filter((incident) => {
          const lat = Number(incident.latitude);
          const lng = Number(incident.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
          return distanceMeters(vehicleLat, vehicleLng, lat, lng) <= Number(incident.radius_meters || 1000);
        })
      : [];

  const alerts = vehicle.openAlerts || [];
  const routePoints = Array.isArray(vehicle.route) ? vehicle.route.length : 0;
  const stops = Array.isArray(vehicle.stops) ? vehicle.stops.length : 0;
  const level = riskLevel(vehicle, nearbyThreats);

  return (
    <div style={{ padding: 18, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 4px 0" }}>Vehicle Intelligence</h2>
      <div style={{ color: "#64748b", marginBottom: 14 }}>
        {vehicle.registrationNumber} · {vehicle.nickname || "Fleet Vehicle"}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <strong>Mission</strong>
          <div>Driver: {vehicle.driverName || "Unassigned"}</div>
          <div>Trip: {vehicle.activeTrip?.status || "No active trip"}</div>
          <div>Origin: {vehicle.activeTrip?.originPort || "-"}</div>
          <div>Destination: {vehicle.activeTrip?.destinationFishery || "-"}</div>
          <div>Route Points: {routePoints}</div>
          <div>Stops: {stops}</div>
        </div>

        <div style={{ padding: 12, borderRadius: 14, background: alerts.length > 0 ? "#fff7ed" : "#f0fdf4", border: "1px solid #e2e8f0" }}>
          <strong>Operational Intelligence</strong>
          <div>Risk Level: {level}</div>
          <div>Open Alerts: {alerts.length}</div>
          <div>Nearby Threats: {nearbyThreats.length}</div>
          <div>Telemetry: {vehicle.isOffline ? "Offline" : "Online"}</div>
          <div>Last Update: {secondsSince(vehicle.lastSeen)}</div>
        </div>

        {alerts.length > 0 ? (
          <div style={{ padding: 12, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca" }}>
            <strong>Active Alerts</strong>
            {alerts.slice(0, 4).map((alert: any, index: number) => (
              <div key={alert.id || index} style={{ fontSize: 13, marginTop: 6 }}>
                {alertLabel(alert.alert_type)}: {alert.message || "No detail"}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ padding: 12, borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <strong>AI Dispatcher Recommendation</strong>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {recommendation(level, vehicle, nearbyThreats)}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href={replayHref(vehicle)} style={{ padding: "8px 10px", borderRadius: 10, background: "#2563eb", color: "#fff", fontWeight: 800, textDecoration: "none" }}>
            Replay
          </Link>

          <button onClick={() => onPredictRoute(vehicle)} style={{ padding: "8px 10px", borderRadius: 10, background: "#0f172a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
            Predict Route
          </button>

          <button onClick={() => onSaferRoute(vehicle)} style={{ padding: "8px 10px", borderRadius: 10, background: "#16a34a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
            Safer Route
          </button>

          <button onClick={() => onResolveAlert(vehicle)} style={{ padding: "8px 10px", borderRadius: 10, background: "#f59e0b", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
            Resolve Alert
          </button>

          <button onClick={() => onPanic(vehicle)} style={{ padding: "8px 10px", borderRadius: 10, background: "#dc2626", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
            Panic
          </button>
        </div>
      </div>
    </div>
  );
}
