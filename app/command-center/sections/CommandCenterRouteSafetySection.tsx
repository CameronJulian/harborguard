import type { FleetVehicle } from "../types";
import { StatusBadge } from "@/components/ui";

type Props = {
  filteredFleet: FleetVehicle[];
  selectedVehicleId: string | null;
  routePrediction: any | null;
  routePredictionLoading: boolean;
  routeRerouteLoading: boolean;
  routeAssignLoading: boolean;
  loadRouteSafetyPrediction: (vehicle: FleetVehicle) => void;
  assignSaferRouteToDriver: (route: any) => void;
  escalateRouteThreat: (threat: any) => void;
  loadSaferRouteOptions: () => void;
};

function freshnessTone(
  freshness?: string
): "success" | "warning" | "danger" | "info" {
  switch (freshness) {
    case "fresh":
      return "success";
    case "needs_verification":
      return "warning";
    case "stale":
      return "danger";
    default:
      return "info";
  }
}

export default function CommandCenterRouteSafetySection({
  filteredFleet,
  selectedVehicleId,
  routePrediction,
  routePredictionLoading,
  routeRerouteLoading,
  routeAssignLoading,
  loadRouteSafetyPrediction,
  assignSaferRouteToDriver,
  escalateRouteThreat,
  loadSaferRouteOptions,
}: Props) {
  const selectedPredictionVehicle =
    filteredFleet.find((vehicle) => vehicle.id === selectedVehicleId) ||
    filteredFleet[0];

  return (
    <div
      style={{
        padding: 20,
        marginBottom: 24,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        borderRadius: 20,
      }}
    >
      <h2 style={{ fontSize: 24, margin: "0 0 12px 0" }}>
        Route Safety Prediction
      </h2>

      <div>
        <div style={{ color: "#475569", marginBottom: 12 }}>
          Predict roadblock, robot outage, and hotspot exposure for the selected vehicle route.
        </div>

        {selectedPredictionVehicle ? (
          <button
            onClick={() => loadRouteSafetyPrediction(selectedPredictionVehicle)}
            disabled={routePredictionLoading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            {routePredictionLoading
              ? "Analyzing..."
              : `Run Route Safety Prediction for ${selectedPredictionVehicle.registrationNumber}`}
          </button>
        ) : null}

        {routePrediction ? (
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid #bfdbfe",
            }}
          >
            <strong>
              {routePrediction.vehicle?.registrationNumber} - Route Risk{" "}
              {routePrediction.riskScore}/100 {routePrediction.riskLevel}
            </strong>

            <div style={{ marginTop: 8, color: "#1e3a8a", fontWeight: 800 }}>
              {routePrediction.driverWarning}
            </div>

            {routePrediction.routeEstimate ? (
              <div style={{ marginTop: 10, color: "#155e75", fontSize: 13, fontWeight: 800 }}>
                Google traffic-aware route checked.
                <br />
                Distance: {Math.round((routePrediction.routeEstimate.distanceMeters || 0) / 1000)} km
                <br />
                ETA: {routePrediction.routeEstimate.duration || "N/A"}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
                Google route estimate unavailable. Check GOOGLE_ROUTES_API_KEY if this persists.
              </div>
            )}

            {routePrediction.saferRoutes?.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <strong>Recommended safer route options</strong>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {routePrediction.saferRoutes.slice(0, 3).map((route: any) => (
                    <div key={route.index} style={{ padding: 8, borderRadius: 10, border: "1px solid #dcfce7" }}>
                      <strong>{route.label}</strong>
                      <br />
                      Distance: {Math.round((route.distanceMeters || 0) / 1000)} km
                      <br />
                      ETA: {route.duration || "N/A"}

                      <button
                        type="button"
                        onClick={() => assignSaferRouteToDriver(route)}
                        disabled={routeAssignLoading}
                        style={{ marginTop: 8, width: "100%" }}
                      >
                        {routeAssignLoading ? "Sending Route..." : "Send Route To Driver"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {routePrediction.threats?.length > 0 ? (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {routePrediction.threats.slice(0, 5).map((threat: any) => (
                  <div key={threat.id} style={{ padding: 10, borderRadius: 12, background: "#fff7ed" }}>
                    <strong>{threat.title}</strong>{" "}
                    <StatusBadge
                      label={
                        threat.freshness
                          ? threat.freshness.replaceAll("_", " ").toUpperCase()
                          : "UNKNOWN"
                      }
                      tone={freshnessTone(threat.freshness)}
                    />
                    <br />
                    Type: {threat.type?.replaceAll("_", " ")} | Severity:{" "}
                    {threat.severity?.toUpperCase()} | Score: {threat.score}
                    <br />
                    Distance from vehicle: {threat.distanceFromOrigin}m

                    <button type="button" onClick={() => escalateRouteThreat(threat)}>
                      Escalate Route Threat
                    </button>

                    <button type="button" onClick={loadSaferRouteOptions} disabled={routeRerouteLoading}>
                      {routeRerouteLoading ? "Calculating Safer Route..." : "Use Safer Route"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "#64748b" }}>
                No route safety threats predicted.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

