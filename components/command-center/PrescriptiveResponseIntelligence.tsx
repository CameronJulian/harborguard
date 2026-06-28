"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { subscribeCommandCenterRealtime } from "@/lib/realtime/commandCenterEvents";

type ResponsePlan = {
  id: string;
  sourceAlertId: string;
  sourceIncidentId?: string | null;
  priority: string;
  score: number;
  title: string;
  vehicleName: string;
  driverName?: string | null;
  trigger: string;
  reason: string;
  estimatedResponseMinutes: number;
  requiredResources: string[];
  steps: string[];
  status: string;
  createdAt: string;
};

type ResponseData = {
  plans: ResponsePlan[];
  summary: {
    total: number;
    critical: number;
    high: number;
    incidentLinked: number;
  };
  generatedAt: string;
};

function priorityColor(priority: string) {
  if (priority === "critical") return "#dc2626";
  if (priority === "high") return "#ea580c";
  if (priority === "medium") return "#d97706";
  return "#2563eb";
}

export default function PrescriptiveResponseIntelligence() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlans() {
    try {
      const response = await fetchWithAuth("/api/command-center/prescriptive-response", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setMessage(result.error || "Failed to load prescriptive response intelligence.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load prescriptive response intelligence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
    return subscribeCommandCenterRealtime(loadPlans);
  }, []);

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
        <div style={{ color: "#9333ea", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
          PRESCRIPTIVE RESPONSE INTELLIGENCE
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Recommended Operational Response Plans</h2>

        <div style={{ color: "#64748b", marginTop: 6 }}>
          Converts active risk, incidents, and AI predictions into prioritized dispatcher response plans.
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading response intelligence...</div>
      ) : !data ? (
        <div style={{ color: "#64748b" }}>No prescriptive response data available.</div>
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
              ["Plans", data.summary.total, "#0f172a"],
              ["Critical", data.summary.critical, "#dc2626"],
              ["High", data.summary.high, "#ea580c"],
              ["Linked", data.summary.incidentLinked, "#9333ea"],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
                <div style={{ color: String(color), fontWeight: 900, fontSize: 26 }}>{value}</div>
              </div>
            ))}
          </div>

          {data.plans.length === 0 ? (
            <div style={{ color: "#64748b" }}>No response plans required right now.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.plans.map((plan) => {
                const color = priorityColor(plan.priority);

                return (
                  <div
                    key={plan.id}
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
                          {plan.priority.toUpperCase()} · {plan.status.replace(/_/g, " ").toUpperCase()}
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                          {plan.title}
                        </div>

                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {plan.vehicleName} · Driver: {plan.driverName || "Unassigned"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ color, fontWeight: 900, fontSize: 28 }}>{plan.score}%</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>response priority</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, color: "#475569" }}>
                      Trigger: {plan.trigger}
                    </div>

                    <div style={{ marginTop: 6, color: "#475569" }}>
                      Reason: {plan.reason}
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ padding: "7px 10px", borderRadius: 999, background: "#faf5ff", color: "#6b21a8", fontSize: 12, fontWeight: 800 }}>
                        ETA {plan.estimatedResponseMinutes} min
                      </span>

                      {plan.requiredResources.map((resource) => (
                        <span
                          key={resource}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 999,
                            background: "#eef2ff",
                            color: "#3730a3",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {resource}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <strong>Response steps</strong>

                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {plan.steps.map((step, index) => (
                          <div
                            key={`${plan.id}-${index}`}
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              color: "#334155",
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}. {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
            Last generated: {new Date(data.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}
