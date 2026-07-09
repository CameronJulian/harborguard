import Link from "next/link";
import type { FleetVehicle, RoadIncident } from "../types";

type Props = {
  vehicle: FleetVehicle;
  selectedVehicleId: string | null;
  incidents: RoadIncident[];
  setSelectedVehicleId: (id: string) => void;
  vehicleRisk: (vehicle: FleetVehicle) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  cleanRoute: (route: any[] | undefined) => any[];
  cleanLatLng: (lat: unknown, lng: unknown) => [number, number] | null;
  calculateDistanceMeters: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => number;
  riskColor: (risk: string) => string;
  riskText: (risk: string) => string;
  movementColor: (status: string) => string;
  secondsSince: (value: string | null | undefined) => number;
  formatDateTime: (value: string | null | undefined) => string;
  alertLabel: (type?: string | null) => string;
  replayHref: (vehicle: FleetVehicle) => string;
  triggerPanic: (vehicle: FleetVehicle) => void;
  resolveFirstAlert: (vehicle: FleetVehicle) => void;
};

export default function CommandCenterVehicleCard({
  vehicle,
  selectedVehicleId,
  incidents,
  setSelectedVehicleId,
  vehicleRisk,
  movementStatus,
  cleanRoute,
  cleanLatLng,
  calculateDistanceMeters,
  riskColor,
  riskText,
  movementColor,
  secondsSince,
  formatDateTime,
  alertLabel,
  replayHref,
  triggerPanic,
  resolveFirstAlert,
}: Props) {
  const risk = vehicleRisk(vehicle);
  const alerts = vehicle.openAlerts || [];
  const selected = selectedVehicleId === vehicle.id;
  const routePoints = cleanRoute(vehicle.route);
  const status = movementStatus(vehicle);

  const nearbyIncidents = incidents.filter((incident) => {
    const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);

    if (!coords) return false;

    const distance = calculateDistanceMeters(
      coords[0],
      coords[1],
      incident.latitude,
      incident.longitude
    );

    return distance <= incident.radius_meters;
  });

  const routeThreatScore = nearbyIncidents.reduce((total, incident) => {
    if (incident.type === "smash_grab_hotspot") return total + 40;
    if (incident.type === "roadblock") return total + 25;
    if (incident.type === "traffic_light_outage") return total + 15;
    return total + 10;
  }, 0);

  const vehicleRiskScore = Math.min(
    100,
    routeThreatScore +
      alerts.length * 10 +
      alerts.filter((alert) => alert.severity === "critical").length * 20 +
      (risk === "offline" ? 15 : 0) +
      (status === "Stopped" ? 5 : 0)
  );

  const vehicleRiskLevel =
    vehicleRiskScore >= 80
      ? "CRITICAL"
      : vehicleRiskScore >= 60
      ? "HIGH"
      : vehicleRiskScore >= 35
      ? "MEDIUM"
      : "LOW";

  return (
    <div
      onClick={() => setSelectedVehicleId(vehicle.id)}
      style={{
        border: selected
          ? "2px solid #2563eb"
          : `1px solid ${risk === "normal" ? "#e5e7eb" : "#fecaca"}`,
        borderRadius: 16,
        padding: 16,
        background: risk === "critical" ? "#fff7f7" : selected ? "#eff6ff" : "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {vehicle.registrationNumber}
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            {vehicle.nickname || "-"}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color: riskColor(risk), fontWeight: 900 }}>
            {riskText(risk)}
          </div>
          <div style={{ color: movementColor(status), fontWeight: 800, fontSize: 13 }}>
            {status}
          </div>
        </div>
      </div>

      <div style={{ color: "#334155", fontSize: 14, marginTop: 10 }}>
        Driver: {vehicle.driverName || "-"}
      </div>
      <div style={{ color: "#334155", fontSize: 14 }}>
        Speed: {Math.round(vehicle.speedKmh || 0)} km/h
      </div>
      <div style={{ color: "#334155", fontSize: 14 }}>
        Updated: {secondsSince(vehicle.lastSeen)}s ago
      </div>
      <div style={{ color: "#334155", fontSize: 14 }}>
        Last Seen: {formatDateTime(vehicle.lastSeen)}
      </div>
      <div style={{ color: "#334155", fontSize: 14 }}>
        Route Points: {routePoints.length} | Stops: {vehicle.stops?.length || 0}
      </div>

      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          background:
            vehicleRiskLevel === "CRITICAL"
              ? "#fee2e2"
              : vehicleRiskLevel === "HIGH"
              ? "#ffedd5"
              : vehicleRiskLevel === "MEDIUM"
              ? "#fef3c7"
              : "#dcfce7",
          border: "1px solid #e5e7eb",
          fontWeight: 900,
        }}
      >
        Risk Score: {vehicleRiskScore}/100 - {vehicleRiskLevel}
      </div>

      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e3a8a",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <strong>AI Dispatch Recommendation</strong>
        <br />
        {vehicleRiskLevel === "CRITICAL"
          ? "Escalate immediately. Contact driver, create/confirm incident case, and dispatch response support."
          : vehicleRiskLevel === "HIGH"
          ? "Contact driver now. Monitor route threats closely and prepare escalation if no response."
          : vehicleRiskLevel === "MEDIUM"
          ? "Warn driver and continue monitoring. Review nearby route threats before next stop."
          : nearbyIncidents.length > 0
          ? "Route threat nearby. Advise caution and monitor vehicle movement."
          : "Continue normal monitoring."}
      </div>

      {alerts.length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {alerts.slice(0, 3).map((alert, index) => (
            <div
              key={alert.id || index}
              style={{
                padding: 10,
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            >
              <strong>{alertLabel(alert.alert_type)}</strong>
              <br />
              {alert.message || "No message"}
            </div>
          ))}
        </div>
      ) : null}

      {nearbyIncidents.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            background: "rgba(220, 38, 38, 0.12)",
            border: "1px solid rgba(220,38,38,0.35)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800, color: "#dc2626" }}>
            Threat Alerts
          </div>

          {nearbyIncidents.map((incident) => (
            <div
              key={incident.id}
              style={{
                color: "#991b1b",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Warning: {incident.title} ({incident.severity})
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Link href={replayHref(vehicle)} onClick={(e) => e.stopPropagation()}>
          Replay
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerPanic(vehicle);
          }}
        >
          Panic
        </button>

        {alerts.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              resolveFirstAlert(vehicle);
            }}
          >
            Resolve
          </button>
        ) : null}

        <Link href="/risk-dashboard" onClick={(e) => e.stopPropagation()}>
          Risk Details
        </Link>
      </div>
    </div>
  );
}
