"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import PremiumGate from "@/components/PremiumGate";


import AppShell from "@/components/AppShell";



type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName?: string | null;
  isActive?: boolean;
  isOffline?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  speedKmh?: number | null;
  lastSeen?: string | null;
  openAlerts?: FleetAlert[];
};

type FleetAlert = {
  id?: string;
  vehicle_id?: string;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  is_resolved?: boolean;
  created_at?: string | null;
};

type DriverScore = {
  score: number;
  level: "Low" | "Medium" | "High" | "Critical";
  speedingRisk: number;
  alertRisk: number;
  offlineRisk: number;
};

type ThreatPrediction = {
  vehicleId: string;
  registrationNumber: string;
  nickname?: string | null;
  probability: number;
  level: string;
  speed: number;
  openAlerts: number;
  criticalAlerts: number;
  nearIncident: boolean;
  isOffline: boolean;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};


function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatAlertType(value?: string | null) {
  return (value || "unknown_alert").replace(/_/g, " ").toUpperCase();
}

function vehicleTitle(vehicle: FleetVehicle) {
  return vehicle.registrationNumber || vehicle.nickname || "Unknown Vehicle";
}

function vehicleSubtitle(vehicle: FleetVehicle) {
  if (vehicle.nickname && vehicle.registrationNumber) {
    return `Nickname: ${vehicle.nickname}`;
  }

  return vehicle.nickname ? `Nickname: ${vehicle.nickname}` : "Nickname: -";
}

function riskLabel(vehicle: FleetVehicle) {
  const alerts = vehicle.openAlerts || [];
  if (alerts.some((a) => a.severity === "critical")) return "Critical";
  if (alerts.length > 0) return "Alert";
  if (vehicle.isOffline) return "Offline";
  return "Normal";
}

function riskColor(label: string) {
  if (label === "Critical") return "#dc2626";
  if (label === "Alert") return "#ea580c";
  if (label === "Offline") return "#64748b";
  return "#16a34a";
}

function severityToColor(severity?: string | null) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

function calculateDriverScore(vehicle: FleetVehicle): DriverScore {
  let score = 100;

  const speed = vehicle.speedKmh || 0;
  const alerts = vehicle.openAlerts || [];

  let speedingRisk = 0;
  let alertRisk = 0;
  let offlineRisk = 0;

  // Speed penalties
  if (speed > 120) {
    score -= 35;
    speedingRisk = 35;
  } else if (speed > 100) {
    score -= 20;
    speedingRisk = 20;
  } else if (speed > 80) {
    score -= 10;
    speedingRisk = 10;
  }

  // Alert penalties
  alerts.forEach((alert) => {
    if (alert.severity === "critical") {
      score -= 30;
      alertRisk += 30;
    } else if (alert.severity === "high") {
      score -= 20;
      alertRisk += 20;
    } else if (alert.severity === "medium") {
      score -= 10;
      alertRisk += 10;
    }
  });

  // Offline penalty
  if (vehicle.isOffline) {
    score -= 15;
    offlineRisk = 15;
  }

  score = Math.max(score, 0);

  let level: DriverScore["level"] = "Low";

  if (score < 40) {
    level = "Critical";
  } else if (score < 60) {
    level = "High";
  } else if (score < 80) {
    level = "Medium";
  }

  return {
    score,
    level,
    speedingRisk,
    alertRisk,
    offlineRisk,
  };
}

function canAccessPremiumFeatures(
  status?: string | null,
  trialEndsAt?: string | null
) {
  if (status === "active") return true;

  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt) > new Date();
  }

  return false;
}

export default function RiskDashboardPage() {
	const organization = {
  subscription_status: "trialing",
  subscription_plan: "starter",
  trial_ends_at: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(),
};

const hasPremiumAccess =
  canAccessPremiumFeatures(
    organization.subscription_status,
    organization.trial_ends_at
  );

if (!hasPremiumAccess) {
  return (
    <PremiumGate
      title="Risk Intelligence Dashboard"
      description="Upgrade to HarborGuard Professional to unlock AI-powered operational risk intelligence, predictive threat analysis, and fleet anomaly detection."
      currentPlan={
        organization.subscription_plan
      }
      trialEndsAt={
        organization.trial_ends_at
      }
    />
  );
}
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  
  const [premiumAllowed, setPremiumAllowed] =
  useState(true);

const [subscriptionLoaded, setSubscriptionLoaded] =
  useState(false);
  const [predictions, setPredictions] = useState<ThreatPrediction[]>([]);
  
async function loadSubscriptionStatus() {
  try {
    const response = await fetch(
      "/api/fleet/vehicles",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      setPremiumAllowed(false);
      setSubscriptionLoaded(true);
      return;
    }

    const result = await response.json();

    const subscription =
      result.subscription;

    const allowed =
      canAccessPremiumFeatures(
        subscription?.subscription_status,
        subscription?.trial_ends_at
      );

    setPremiumAllowed(allowed);
  } catch {
    setPremiumAllowed(false);
  } finally {
    setSubscriptionLoaded(true);
  }
}
  async function loadFleet() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/fleet/live", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load fleet risk data.");
        return;
      }

      setFleet(result.fleet || []);
    } catch (err: any) {
      setMessage(err.message || "Failed to load fleet risk data.");
    } finally {
      setLoading(false);
    }
  }
  async function loadPredictions() {
  try {
    const response = await fetch("/api/fleet/predict-threats", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      return;
    }

    const sorted = (result.predictions || []).sort(
      (a: ThreatPrediction, b: ThreatPrediction) =>
        b.probability - a.probability
    );

    setPredictions(sorted);
  } catch {
    // silent fail
  }
}

  async function runRiskDetection() {
    setMessage("Running risk detection...");

    try {
      const response = await fetch("/api/fleet/detect-risks", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Risk detection failed.");
        return;
      }

      setMessage(
        `Risk detection complete. New alerts created: ${result.createdCount || 0}`
      );
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Risk detection failed.");
    }
  }

  useEffect(() => {
	  loadSubscriptionStatus();
  loadFleet();
  loadPredictions();

  const interval = setInterval(async () => {
    try {
      await fetch("/api/fleet/detect-risks", {
        method: "POST",
      });

      await loadFleet();
      await loadPredictions();
    } catch (err) {
      console.error(err);
    }
  }, 15000);

  return () => clearInterval(interval);
}, []);
const anomalyForecast = useMemo(() => {
  const avgThreat =
    predictions.length === 0
      ? 0
      : Math.round(
          predictions.reduce(
            (sum, p) => sum + p.probability,
            0
          ) / predictions.length
        );

  const projectedThreat24h = Math.min(
    100,
    Math.round(avgThreat * 1.12)
  );

  const projectedThreat72h = Math.min(
    100,
    Math.round(avgThreat * 1.28)
  );

  const projectedThreat7d = Math.min(
    100,
    Math.round(avgThreat * 1.45)
  );

  let forecastLevel = "Stable";

  if (projectedThreat7d >= 75) {
    forecastLevel = "Critical";
  } else if (projectedThreat7d >= 55) {
    forecastLevel = "Elevated";
  } else if (projectedThreat7d >= 35) {
    forecastLevel = "Moderate";
  }

  return {
    avgThreat,
    projectedThreat24h,
    projectedThreat72h,
    projectedThreat7d,
    forecastLevel,
  };
}, [predictions]);
  const summary = useMemo(() => {
    const totalVehicles = fleet.length;
    const offlineVehicles = fleet.filter((v) => v.isOffline).length;
    const vehiclesWithAlerts = fleet.filter(
      (v) => (v.openAlerts || []).length > 0
    ).length;
    const criticalVehicles = fleet.filter((v) =>
      (v.openAlerts || []).some((a) => a.severity === "critical")
    ).length;

    return {
      totalVehicles,
      normalVehicles: Math.max(
        totalVehicles - vehiclesWithAlerts - offlineVehicles,
        0
      ),
      offlineVehicles,
      vehiclesWithAlerts,
      criticalVehicles,
    };
  }, [fleet]);

  if (
  subscriptionLoaded &&
  !premiumAllowed
) {
  return (
    <AppShell>
      <PremiumGate
        title="Predictive Threat Intelligence"
        description="AI anomaly forecasting, threat prediction, behavioral scoring, and operational risk intelligence require HarborGuard Professional."
      />
    </AppShell>
  );
}

return (
  <AppShell>
	
	
	<div
  style={{
    ...cardStyle,
    padding: 28,
    marginBottom: 24,
    background:
      anomalyForecast.forecastLevel === "Critical"
        ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
        : anomalyForecast.forecastLevel === "Elevated"
        ? "linear-gradient(135deg,#9a3412,#c2410c)"
        : "linear-gradient(135deg,#0f172a,#1e293b)",
    color: "#fff",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          opacity: 0.8,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        AI ANOMALY FORECAST ENGINE
      </div>

      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {anomalyForecast.forecastLevel}
      </div>

      <div
        style={{
          marginTop: 14,
          maxWidth: 700,
          fontSize: 16,
          lineHeight: 1.6,
          opacity: 0.92,
        }}
      >
        Predictive intelligence models are forecasting
        operational threat trajectory increases over the
        next 7 days based on current fleet telemetry,
        behavioral anomalies, and incident proximity data.
      </div>
    </div>

    <div
      style={{
        textAlign: "right",
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.75,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        CURRENT AI THREAT INDEX
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {anomalyForecast.avgThreat}
      </div>

      <div
        style={{
          fontSize: 15,
          opacity: 0.85,
        }}
      >
        /100 Forecast Score
      </div>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(3,minmax(0,1fr))",
      gap: 18,
      marginTop: 28,
    }}
  >
    {[
      {
        label: "24 Hour Forecast",
        value: `${anomalyForecast.projectedThreat24h}%`,
      },
      {
        label: "72 Hour Forecast",
        value: `${anomalyForecast.projectedThreat72h}%`,
      },
      {
        label: "7 Day Forecast",
        value: `${anomalyForecast.projectedThreat7d}%`,
      },
    ].map((item, index) => (
      <div
        key={index}
        style={{
          background:
            "rgba(255,255,255,0.08)",
          border:
            "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.8,
            marginBottom: 10,
          }}
        >
          {item.label}
        </div>

        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          {item.value}
        </div>
      </div>
    ))}
  </div>
</div>
	<div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
  <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>
    AI Predictive Threat Feed
  </h2>

  {predictions.length === 0 ? (
    <div style={{ color: "#64748b" }}>
      No predictive threats detected.
    </div>
  ) : (
    <div style={{ display: "grid", gap: 14 }}>
      {predictions.slice(0, 5).map((prediction) => (
        <div
          key={prediction.vehicleId}
          style={{
            borderRadius: 16,
            padding: 18,
            border:
              prediction.level === "Critical"
                ? "2px solid #dc2626"
                : prediction.level === "High"
                ? "2px solid #ea580c"
                : "1px solid #e5e7eb",
            background:
              prediction.level === "Critical"
                ? "#fff5f5"
                : prediction.level === "High"
                ? "#fff7ed"
                : "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {prediction.registrationNumber}
              </div>

              <div style={{ color: "#64748b" }}>
                {prediction.nickname || "Fleet Vehicle"}
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Threat Probability
              </div>

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color:
                    prediction.level === "Critical"
                      ? "#dc2626"
                      : prediction.level === "High"
                      ? "#ea580c"
                      : prediction.level === "Medium"
                      ? "#d97706"
                      : "#16a34a",
                }}
              >
                {prediction.probability}%
              </div>
            </div>

            <div style={{ minWidth: 240 }}>
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Risk Factors
              </div>

              <div style={{ fontSize: 14, color: "#475569" }}>
                • Speed: {prediction.speed} km/h
              </div>

              <div style={{ fontSize: 14, color: "#475569" }}>
                • Open Alerts: {prediction.openAlerts}
              </div>

              <div style={{ fontSize: 14, color: "#475569" }}>
                • Critical Alerts: {prediction.criticalAlerts}
              </div>

              <div style={{ fontSize: 14, color: "#475569" }}>
                • Near Incident Zone:{" "}
                {prediction.nearIncident ? "Yes" : "No"}
              </div>

              <div style={{ fontSize: 14, color: "#475569" }}>
                • Offline: {prediction.isOffline ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>
          Fleet Risk Dashboard
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Live operational view of vehicles, active risks, critical alerts, and
          replay actions.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Vehicles",
            value: summary.totalVehicles,
            color: "#0f172a",
          },
          {
            label: "Normal",
            value: summary.normalVehicles,
            color: "#16a34a",
          },
          {
            label: "Offline",
            value: summary.offlineVehicles,
            color: "#64748b",
          },
          {
            label: "With Alerts",
            value: summary.vehiclesWithAlerts,
            color: "#ea580c",
          },
          {
            label: "Critical",
            value: summary.criticalVehicles,
            color: "#dc2626",
          },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={loadFleet}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#fff",
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <button
            onClick={runRiskDetection}
            style={{
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Run Risk Detection
          </button>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Auto-refreshes every 15 seconds.
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

      <div style={{ ...cardStyle, padding: 24 }}>
        <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>
          Live Risk Register
        </h2>

        {loading ? (
          <div>Loading risk data...</div>
        ) : fleet.length === 0 ? (
          <div style={{ color: "#64748b" }}>No vehicles found.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {fleet.map((vehicle) => {
				const driverScore = calculateDriverScore(vehicle);
              const label = riskLabel(vehicle);
              const color = riskColor(label);
              const alerts = vehicle.openAlerts || [];

              return (
                <div
                  key={vehicle.id}
                  style={{
                    border: `1px solid ${
                      label === "Normal" ? "#e5e7eb" : "#fecaca"
                    }`,
                    borderRadius: 16,
                    padding: 18,
                    background: label === "Critical" ? "#fff7f7" : "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr 220px",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        {vehicleTitle(vehicle)}
                      </div>

                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        {vehicleSubtitle(vehicle)}
                      </div>

                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Driver: {vehicle.driverName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>Risk</div>
                      <div style={{ fontWeight: 900, color }}>{label}</div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Speed
                      </div>
					  
					  <div>
  <div style={{ color: "#64748b", fontSize: 14 }}>
    Driver Score
  </div>

  <div
    style={{
      fontWeight: 900,
      fontSize: 22,
      color:
        driverScore.level === "Critical"
          ? "#dc2626"
          : driverScore.level === "High"
          ? "#ea580c"
          : driverScore.level === "Medium"
          ? "#d97706"
          : "#16a34a",
    }}
  >
    {driverScore.score}/100
  </div>

  <div style={{ fontSize: 12, color: "#64748b" }}>
    {driverScore.level} Risk
  </div>
</div>
                      <div style={{ fontWeight: 800 }}>
                        {vehicle.speedKmh ?? 0} km/h
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Last Seen
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {formatDateTime(vehicle.lastSeen)}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        Coords:{" "}
                        {typeof vehicle.latitude === "number" &&
                        typeof vehicle.longitude === "number"
                          ? `${vehicle.latitude}, ${vehicle.longitude}`
                          : "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Link
                        href={`/route-replay?vehicleId=${vehicle.id}&autoplay=1`}
                        style={{
                          textDecoration: "none",
                          borderRadius: 12,
                          background: "#2563eb",
                          color: "#fff",
                          padding: "10px 12px",
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        Replay
                      </Link>

                      <Link
                        href="/vehicle-alerts"
                        style={{
                          textDecoration: "none",
                          borderRadius: 12,
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          padding: "10px 12px",
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        Alerts
                      </Link>
                    </div>
                  </div>

                  {alerts.length > 0 ? (
                    <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                      {alerts.map((alert, index) => (
                        <div
                          key={alert.id || `${vehicle.id}-alert-${index}`}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <strong
                            style={{
                              color: severityToColor(alert.severity),
                            }}
                          >
                            {formatAlertType(alert.alert_type)}
                          </strong>{" "}
                          — {alert.message || "No alert message provided."}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}