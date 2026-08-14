import type { FleetVehicle } from "../types";
import { StatusBadge } from "@/components/ui";

type Props = {
  filteredFleet: FleetVehicle[];
  selectedVehicleId: string | null;
  routePrediction: any | null;
  routingProfile: "safest" | "balanced" | "fastest";
  setRoutingProfile: (value: "safest" | "balanced" | "fastest") => void;
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
  routingProfile,
  setRoutingProfile,
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

            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#0f172a",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <strong>Composite Risk Breakdown</strong>

                <StatusBadge
                  label={`${String(
                    routePrediction.riskLevel || "unknown"
                  ).toUpperCase()} (${routePrediction.riskScore ?? 0}/100)`}
                  tone={
                    String(routePrediction.riskLevel).toUpperCase() ===
                      "CRITICAL" ||
                    String(routePrediction.riskLevel).toUpperCase() === "HIGH"
                      ? "danger"
                      : String(routePrediction.riskLevel).toUpperCase() ===
                          "MEDIUM"
                        ? "warning"
                        : "success"
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "8px 16px",
                  fontSize: 13,
                }}
              >
                <span>Threat intelligence</span>
                <strong>
                  {routePrediction.threatRiskScore ?? 0}/100
                </strong>

                <span>Threat level</span>
                <strong>
                  {String(
                    routePrediction.threatRiskLevel || "unknown"
                  ).toUpperCase()}
                </strong>

                <span>Weather risk</span>
                <strong>
                  {routePrediction.weatherRiskScore ?? 0}/100
                </strong>

                <span>Weather contribution</span>
                <strong>
                  +{routePrediction.weatherContribution ?? 0}
                </strong>

                <span>Traffic risk</span>
                <strong>
                  {routePrediction.trafficRiskScore ?? 0}/100
                </strong>

                <span>Traffic level</span>
                <strong>
                  {String(
                    routePrediction.trafficRiskLevel || "unknown"
                  ).toUpperCase()}
                </strong>

                <span>Traffic contribution</span>
                <strong>
                  +{routePrediction.trafficContribution ?? 0}
                </strong>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderTop: "1px solid #cbd5e1",
                    marginTop: 4,
                  }}
                />

                <span style={{ fontWeight: 800 }}>
                  Overall route risk
                </span>
                <strong>
                  {routePrediction.riskScore ?? 0}/100
                </strong>
              </div>
            </div>

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

            {routePrediction.openWatercourseContext ||
            routePrediction.mainDrainageContext ||
            routePrediction.drainageCatchmentContext ||
            routePrediction.fireStationContext ||
            routePrediction.policeStationContext ||
            routePrediction.koebergProtectiveActionZoneContext ||
            routePrediction.koebergRadiiPlanningContext ||
            routePrediction.koebergEvacuationDirectionContext ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <strong>Municipal Route Context</strong>

                  <StatusBadge
                    label="CONTEXT ONLY"
                    tone="info"
                  />
                </div>

                <div
                  style={{
                    color: "#475569",
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  City of Cape Town infrastructure and emergency-planning
                  context detected for this route. These details are
                  informational and do not change the HarborGuard route
                  risk score.
                </div>

                {routePrediction.openWatercourseContext ||
                routePrediction.mainDrainageContext ||
                routePrediction.drainageCatchmentContext ? (
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#0369a1",
                        marginBottom: 5,
                      }}
                    >
                      Environmental infrastructure
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {routePrediction.openWatercourseContext ? (
                        <div>
                          <strong>Nearby watercourse:</strong>{" "}
                          {routePrediction.openWatercourseContext.riverName ||
                            routePrediction.openWatercourseContext.description ||
                            routePrediction.openWatercourseContext.watercourseType ||
                            "City open watercourse"}
                          {Number.isFinite(
                            routePrediction.openWatercourseContext.distanceMeters
                          )
                            ? ` - ${Math.round(
                                routePrediction.openWatercourseContext
                                  .distanceMeters
                              )} m away`
                            : ""}
                          {routePrediction.openWatercourseContext.catchment
                            ? ` | Catchment: ${routePrediction.openWatercourseContext.catchment}`
                            : ""}
                        </div>
                      ) : null}

                      {routePrediction.mainDrainageContext ? (
                        <div>
                          <strong>Nearby main drainage:</strong>{" "}
                          {routePrediction.mainDrainageContext.assetType ||
                            routePrediction.mainDrainageContext
                              .locationDescription ||
                            routePrediction.mainDrainageContext.sapDescription ||
                            "City drainage asset"}
                          {Number.isFinite(
                            routePrediction.mainDrainageContext.distanceMeters
                          )
                            ? ` - ${Math.round(
                                routePrediction.mainDrainageContext
                                  .distanceMeters
                              )} m away`
                            : ""}
                          {routePrediction.mainDrainageContext.catchment
                            ? ` | Catchment: ${routePrediction.mainDrainageContext.catchment}`
                            : ""}
                        </div>
                      ) : null}

                      {routePrediction.drainageCatchmentContext ? (
                        <div>
                          <strong>Drainage catchment:</strong>{" "}
                          {routePrediction.drainageCatchmentContext
                            .catchmentRegion || "City catchment region"}
                          {Number.isFinite(
                            routePrediction.drainageCatchmentContext.areaKm2
                          )
                            ? ` | ${routePrediction.drainageCatchmentContext.areaKm2} km²`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {routePrediction.fireStationContext ||
                routePrediction.policeStationContext ? (
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#166534",
                        marginBottom: 5,
                      }}
                    >
                      Nearby emergency resources
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {routePrediction.fireStationContext ? (
                        <div>
                          <strong>Fire station:</strong>{" "}
                          {routePrediction.fireStationContext.stationName ||
                            "City fire station"}
                          {routePrediction.fireStationContext.stationClass
                            ? ` | ${routePrediction.fireStationContext.stationClass}`
                            : ""}
                          {Number.isFinite(
                            routePrediction.fireStationContext.distanceMeters
                          )
                            ? ` | ${Math.round(
                                routePrediction.fireStationContext.distanceMeters
                              )} m from sampled route location`
                            : ""}
                        </div>
                      ) : null}

                      {routePrediction.policeStationContext ? (
                        <div>
                          <strong>Police station:</strong>{" "}
                          {routePrediction.policeStationContext.stationName ||
                            "Police station"}
                          {routePrediction.policeStationContext.cluster
                            ? ` | Cluster: ${routePrediction.policeStationContext.cluster}`
                            : ""}
                          {Number.isFinite(
                            routePrediction.policeStationContext.distanceMeters
                          )
                            ? ` | ${Math.round(
                                routePrediction.policeStationContext
                                  .distanceMeters
                              )} m from sampled route location`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {routePrediction.koebergProtectiveActionZoneContext ||
                routePrediction.koebergRadiiPlanningContext ||
                routePrediction.koebergEvacuationDirectionContext ? (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #fde68a",
                      background: "#fffbeb",
                      color: "#78350f",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        marginBottom: 5,
                      }}
                    >
                      Koeberg emergency-planning context
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        marginBottom: 7,
                        lineHeight: 1.45,
                      }}
                    >
                      Published planning geography only. This does not indicate
                      an active emergency, evacuation order, radiological
                      condition or road closure.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {routePrediction.koebergProtectiveActionZoneContext ? (
                        <div>
                          <strong>Protective Action Zone:</strong>{" "}
                          {routePrediction.koebergProtectiveActionZoneContext
                            .zoneNumber
                            ? `Zone ${routePrediction.koebergProtectiveActionZoneContext.zoneNumber}`
                            : "Published PAZ"}
                        </div>
                      ) : null}

                      {routePrediction.koebergRadiiPlanningContext ? (
                        <div>
                          <strong>Planning radius:</strong>{" "}
                          {
                            routePrediction.koebergRadiiPlanningContext
                              .planningDistanceKm
                          }{" "}
                          km
                        </div>
                      ) : null}

                      {routePrediction.koebergEvacuationDirectionContext ? (
                        <div>
                          <strong>Nearest published evacuation direction:</strong>{" "}
                          {String(
                            routePrediction.koebergEvacuationDirectionContext
                              .direction || "unknown"
                          ).toUpperCase()}
                          {routePrediction.koebergEvacuationDirectionContext
                            .routeName
                            ? ` | ${routePrediction.koebergEvacuationDirectionContext.routeName}`
                            : ""}
                          {routePrediction.koebergEvacuationDirectionContext
                            .routeType
                            ? ` | ${routePrediction.koebergEvacuationDirectionContext.routeType}`
                            : ""}
                          {Number.isFinite(
                            routePrediction.koebergEvacuationDirectionContext
                              .distanceMeters
                          )
                            ? ` | ${Math.round(
                                routePrediction
                                  .koebergEvacuationDirectionContext
                                  .distanceMeters
                              )} m from nearest sampled route point`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {routePrediction.weather ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #bae6fd",
                  background: "#f0f9ff",
                  color: "#0c4a6e",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <strong>Live route weather</strong>

                  <StatusBadge
                    label={`${String(
                      routePrediction.weather.riskLevel || "unknown"
                    ).toUpperCase()} (${routePrediction.weather.riskScore ?? 0}/100)`}
                    tone={
                      routePrediction.weather.riskLevel === "high" ||
                      routePrediction.weather.riskLevel === "critical"
                        ? "danger"
                        : routePrediction.weather.riskLevel === "medium"
                          ? "warning"
                          : "success"
                    }
                  />
                </div>

                Provider: {routePrediction.weather.provider || "Unknown"}
                <br />
                Temperature: {routePrediction.weather.temperatureC ?? "N/A"}°C
                <br />
                Wind: {routePrediction.weather.windSpeedKph ?? "N/A"} km/h
                {routePrediction.weather.windGustKph != null
                  ? ` | Gusts: ${routePrediction.weather.windGustKph} km/h`
                  : ""}
                <br />
                Precipitation: {routePrediction.weather.precipitationMm ?? "N/A"} mm
                <br />
                Visibility: {routePrediction.weather.visibilityKm ?? "N/A"} km

                {routePrediction.weather.riskReasons?.length > 0 ? (
                  <div style={{ marginTop: 6, fontWeight: 700 }}>
                    {routePrediction.weather.riskReasons.join(" ")}
                  </div>
                ) : null}
              </div>
            ) : routePrediction.weatherError ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  background: "#fff7ed",
                  color: "#9a3412",
                  fontSize: 13,
                }}
              >
                Weather unavailable: {routePrediction.weatherError}
              </div>
            ) : null}

            {routePrediction.saferRoutes?.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <strong>Recommended safer route options</strong>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {routePrediction.saferRoutes.slice(0, 3).map((route: any) => (
                    <div key={route.index} style={{ padding: 8, borderRadius: 10, border: "1px solid #dcfce7" }}>
                      <strong>{route.label}</strong>
                      <br />
                      Profile: {String(route.routingProfile || routingProfile).toUpperCase()}
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 12,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Routing profile:
              </span>

              {(["safest", "balanced", "fastest"] as const).map(
                (profile) => {
                  const selected = routingProfile === profile;

                  return (
                    <button
                      key={profile}
                      type="button"
                      disabled={routeRerouteLoading}
                      onClick={() => setRoutingProfile(profile)}
                      style={{
                        border: selected
                          ? "1px solid #0f172a"
                          : "1px solid #cbd5e1",
                        background: selected ? "#0f172a" : "#ffffff",
                        color: selected ? "#ffffff" : "#334155",
                        borderRadius: 999,
                        padding: "5px 9px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: routeRerouteLoading
                          ? "not-allowed"
                          : "pointer",
                        opacity: routeRerouteLoading ? 0.65 : 1,
                        textTransform: "capitalize",
                      }}
                    >
                      {profile}
                    </button>
                  );
                }
              )}
            </div>

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

