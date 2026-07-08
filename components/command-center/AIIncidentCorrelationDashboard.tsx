"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type Correlation = {
  id: string;
  incidentCode: string;
  severity: string;
  status: string;
  summary: string;
  classification: string;
  confidence: number;
  vehicleName: string;
  driverName?: string | null;
  alertCount: number;
  responseEventCount: number;
  evidence: any[];
  recommendedActions: string[];
  createdAt: string;
};

function severityColor(severity: string) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

function confidenceColor(score: number) {
  if (score >= 90) return "#dc2626";
  if (score >= 75) return "#ea580c";
  return "#2563eb";
}

export default function AIIncidentCorrelationDashboard() {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCorrelations() {
    try {
      const response = await fetchWithAuth("/api/command-center/correlations", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setCorrelations(result.correlations || []);
      } else {
        setMessage(result.error || "Failed to load incident correlations.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load incident correlations.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [
      "incidents",
      "vehicle_alerts",
      "vehicle_locations",
      "road_incidents",
      "dispatch_missions",
      "vehicle_trips",
    ],
    refresh: loadCorrelations,
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
        <div style={{ color: "#4f46e5", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
          AI INCIDENT CORRELATION
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Incident Correlation Dashboard</h2>

        <div style={{ color: "#64748b", marginTop: 6 }}>
          Groups alerts, response events, and incident context into explainable operational sequences.
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading incident correlations...</div>
      ) : correlations.length === 0 ? (
        <div style={{ color: "#64748b" }}>No active correlated incidents found.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {correlations.map((item) => {
            const severity = severityColor(item.severity);
            const confidence = confidenceColor(item.confidence);

            return (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderLeft: `6px solid ${severity}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: severity, fontWeight: 900, fontSize: 12 }}>
                      {item.severity.toUpperCase()} · {item.incidentCode || "INCIDENT"}
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                      {item.classification}
                    </div>

                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {item.vehicleName} {item.driverName ? `· ${item.driverName}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: confidence, fontWeight: 900, fontSize: 24 }}>
                      {item.confidence}%
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>confidence</div>
                  </div>
                </div>

                <div style={{ color: "#475569", marginTop: 10 }}>
                  {item.summary}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Related Alerts</div>
                    <div style={{ fontWeight: 900, fontSize: 22 }}>{item.alertCount}</div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Response Events</div>
                    <div style={{ fontWeight: 900, fontSize: 22 }}>{item.responseEventCount}</div>
                  </div>
                </div>

                {item.evidence.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <strong>Evidence timeline</strong>

                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {item.evidence.slice(0, 5).map((event: any, index: number) => (
                        <div
                          key={`${event.type}-${index}`}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {new Date(event.createdAt).toLocaleTimeString()} · {event.title}
                          </div>
                          <div style={{ color: "#64748b", marginTop: 3 }}>{event.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <strong>Recommended actions</strong>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {item.recommendedActions.map((action) => (
                      <span
                        key={action}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: "#eef2ff",
                          color: "#3730a3",
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
    </div>
  );
}

