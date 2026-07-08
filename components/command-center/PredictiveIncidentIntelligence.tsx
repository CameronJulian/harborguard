"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type Prediction = {
  vehicleId: string;
  vehicleName: string;
  driverName?: string | null;
  score: number;
  riskLevel: string;
  prediction: string;
  activeAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  panicAlerts: number;
  openIncidentCount: number;
  activeRoadRisk: number;
  behavioralRisk: string;
  recommendedActions: string[];
};

type PredictionResponse = {
  predictions: Prediction[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
  };
  generatedAt: string;
};

function riskColor(level: string) {
  if (level === "critical") return "#dc2626";
  if (level === "high") return "#ea580c";
  if (level === "medium") return "#d97706";
  return "#2563eb";
}

export default function PredictiveIncidentIntelligence() {
  const [data, setData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPredictions() {
    try {
      const response = await fetchWithAuth("/api/command-center/predictive-incidents", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setMessage(result.error || "Failed to load predictive incident intelligence.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load predictive incident intelligence.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [
      "vehicle_alerts",
      "vehicle_locations",
      "dispatch_missions",
      "incidents",
      "road_incidents",
      "vehicle_trips",
    ],
    refresh: loadPredictions,
  });

  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        marginBottom: 24,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#0891b2", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
          PREDICTIVE INCIDENT INTELLIGENCE
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Next 15-Minute Incident Forecast</h2>

        <div style={{ color: "#64748b", marginTop: 6 }}>
          Predicts vehicles most likely to need dispatcher or supervisor intervention based on live alerts, incidents, road risk, and behavioural signals.
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading predictive intelligence...</div>
      ) : !data ? (
        <div style={{ color: "#64748b" }}>No predictive intelligence available.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              ["Vehicles", data.summary.total, "#0f172a"],
              ["Critical", data.summary.critical, "#dc2626"],
              ["High", data.summary.high, "#ea580c"],
              ["Medium", data.summary.medium, "#d97706"],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
                <div style={{ color: String(color), fontWeight: 900, fontSize: 26 }}>{value}</div>
              </div>
            ))}
          </div>

          {data.predictions.length === 0 ? (
            <div style={{ color: "#64748b" }}>No active vehicles with elevated incident risk.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.predictions.map((item) => {
                const color = riskColor(item.riskLevel);

                return (
                  <div
                    key={item.vehicleId}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderLeft: `6px solid ${color}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color, fontWeight: 900, fontSize: 12 }}>
                          {item.riskLevel.toUpperCase()} RISK FORECAST
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                          {item.vehicleName}
                        </div>

                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          Driver: {item.driverName || "Unassigned"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ color, fontWeight: 900, fontSize: 28 }}>{item.score}%</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>escalation likelihood</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, color: "#475569" }}>
                      {item.prediction}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      {[
                        ["Alerts", item.activeAlerts],
                        ["Critical", item.criticalAlerts],
                        ["High", item.highAlerts],
                        ["Panic/SOS", item.panicAlerts],
                        ["Incidents", item.openIncidentCount],
                        ["Road Risk", item.activeRoadRisk],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ padding: 10, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
                          <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <strong>Recommended actions</strong>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {item.recommendedActions.map((action) => (
                          <span
                            key={action}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 999,
                              background: "#ecfeff",
                              color: "#155e75",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
            Last forecast: {new Date(data.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}

