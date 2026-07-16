import type { FleetVehicle } from "../types";

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

            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 14,
                border: "1px solid #dbeafe",
                background: "#eff6ff",
              }}
            >
              <strong style={{ color: "#1e3a8a" }}>
                Risk Fusion
              </strong>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(160px,1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {[
                  [
                    "Route Threat",
                    routePrediction.routeThreatScore,
                  ],
                  [
                    "Weather Score",
                    routePrediction.weatherRiskScore,
                  ],
                  [
                    "Weather Contribution",
                    routePrediction.weatherContribution,
                  ],
                  [
                    "Combined Risk",
                    routePrediction.combinedRiskScore,
                  ],
                ].map(([label,value]) => (
                  <div
                    key={String(label)}
                    style={{
                      background:"#fff",
                      border:"1px solid #dbeafe",
                      borderRadius:12,
                      padding:10,
                    }}
                  >
                    <div
                      style={{
                        color:"#64748b",
                        fontSize:12,
                        fontWeight:800,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop:4,
                        fontSize:24,
                        fontWeight:900,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop:12,
                  fontWeight:900,
                  color:"#1e3a8a",
                }}
              >
                Combined Level:
                {" "}
                {routePrediction.combinedRiskLevel}
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  background: "#ffffff",
                  border: "1px solid #dbeafe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <strong style={{ color: "#1e3a8a" }}>
                    Combined Risk Gauge
                  </strong>

                  <span
                    style={{
                      fontWeight: 900,
                      color:
                        routePrediction.combinedRiskLevel === "CRITICAL"
                          ? "#b91c1c"
                          : routePrediction.combinedRiskLevel === "HIGH"
                            ? "#c2410c"
                            : routePrediction.combinedRiskLevel === "MEDIUM"
                              ? "#a16207"
                              : "#166534",
                    }}
                  >
                    {routePrediction.combinedRiskScore}/100
                  </span>
                </div>

                <div
                  style={{
                    height: 16,
                    marginTop: 10,
                    overflow: "hidden",
                    borderRadius: 999,
                    background: "#e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            routePrediction.combinedRiskScore || 0
                          )
                        )
                      )}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        routePrediction.combinedRiskLevel === "CRITICAL"
                          ? "#dc2626"
                          : routePrediction.combinedRiskLevel === "HIGH"
                            ? "#ea580c"
                            : routePrediction.combinedRiskLevel === "MEDIUM"
                              ? "#ca8a04"
                              : "#16a34a",
                      transition: "width 300ms ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  {[
                    {
                      label: "Route Threat Contribution",
                      value: routePrediction.routeThreatScore || 0,
                    },
                    {
                      label: "Raw Weather Risk",
                      value: routePrediction.weatherRiskScore || 0,
                    },
                    {
                      label: "Weighted Weather Contribution",
                      value:
                        routePrediction.weatherContribution || 0,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>

                      <div
                        style={{
                          height: 8,
                          marginTop: 5,
                          overflow: "hidden",
                          borderRadius: 999,
                          background: "#e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                Number(item.value || 0)
                              )
                            )}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: "#2563eb",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {routePrediction.weatherAssessment ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #bae6fd",
                  background: "#f0f9ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ color: "#0c4a6e" }}>
                      Route Weather Assessment
                    </strong>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#475569",
                        fontSize: 13,
                      }}
                    >
                      Provider:{" "}
                      {routePrediction.weatherAssessment.provider ||
                        "Unavailable"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color:
                        routePrediction.weatherAssessment.highestRisk ===
                        "critical"
                          ? "#991b1b"
                          : routePrediction.weatherAssessment.highestRisk ===
                              "high"
                            ? "#c2410c"
                            : routePrediction.weatherAssessment.highestRisk ===
                                "medium"
                              ? "#a16207"
                              : "#166534",
                      background:
                        routePrediction.weatherAssessment.highestRisk ===
                        "critical"
                          ? "#fee2e2"
                          : routePrediction.weatherAssessment.highestRisk ===
                              "high"
                            ? "#ffedd5"
                            : routePrediction.weatherAssessment.highestRisk ===
                                "medium"
                              ? "#fef3c7"
                              : "#dcfce7",
                    }}
                  >
                    {routePrediction.weatherAssessment.highestRisk
                      ? `${routePrediction.weatherAssessment.highestRisk} weather risk`
                      : "Weather unavailable"}
                  </div>
                </div>

                {routePrediction.weatherAssessment.available ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          background: "#ffffff",
                          border: "1px solid #e0f2fe",
                        }}
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Origin
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontWeight: 900,
                            textTransform: "uppercase",
                          }}
                        >
                          {routePrediction.weatherAssessment.originRisk ||
                            "Unavailable"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          background: "#ffffff",
                          border: "1px solid #e0f2fe",
                        }}
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Destination
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontWeight: 900,
                            textTransform: "uppercase",
                          }}
                        >
                          {routePrediction.weatherAssessment
                            .destinationRisk || "Unavailable"}
                        </div>
                      </div>
                    </div>

                    {routePrediction.weatherAssessment.partial ? (
                      <div
                        style={{
                          marginTop: 10,
                          color: "#a16207",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        Partial weather data is available for this route.
                      </div>
                    ) : null}

                    {routePrediction.weatherAssessment.summary?.length >
                    0 ? (
                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        {routePrediction.weatherAssessment.summary.map(
                          (reason: string, index: number) => (
                            <div
                              key={`${reason}-${index}`}
                              style={{
                                color: "#334155",
                                fontSize: 13,
                              }}
                            >
                              - {reason}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 10,
                          color: "#166534",
                          fontSize: 13,
                        }}
                      >
                        No significant environmental hazards detected.
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#b91c1c",
                      fontSize: 13,
                    }}
                  >
                    Weather intelligence is currently unavailable.
                    {routePrediction.weatherAssessment.errors?.length >
                    0 ? (
                      <div style={{ marginTop: 6 }}>
                        {routePrediction.weatherAssessment.errors.join(
                          " "
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
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
                    <strong>{threat.title}</strong>
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
