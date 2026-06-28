"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { subscribeCommandCenterRealtime } from "@/lib/realtime/commandCenterEvents";

type Escalation = {
  id: string;
  sourceId: string;
  sourceType: string;
  priority: string;
  status: string;
  title: string;
  detail: string;
  vehicleName?: string | null;
  driverName?: string | null;
  recommendedDecision: string;
  ageMinutes: number;
  slaMinutes: number;
  slaStatus: "within_sla" | "warning" | "breached";
  createdAt: string;
};

type EscalationResponse = {
  escalations: Escalation[];
  summary: {
    total: number;
    critical: number;
    high: number;
    breached: number;
    warning: number;
  };
  generatedAt: string;
};

function priorityColor(priority: string) {
  if (priority === "critical") return "#dc2626";
  if (priority === "high") return "#ea580c";
  return "#2563eb";
}

function slaColor(status: string) {
  if (status === "breached") return "#dc2626";
  if (status === "warning") return "#d97706";
  return "#16a34a";
}

function slaLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

export default function SupervisorEscalationCenter() {
  const [data, setData] = useState<EscalationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadEscalations() {
    try {
      const response = await fetchWithAuth("/api/command-center/escalations", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setMessage(result.error || "Failed to load supervisor escalations.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load supervisor escalations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEscalations();
    return subscribeCommandCenterRealtime(loadEscalations);
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
        <div style={{ color: "#be123c", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
          SUPERVISOR ESCALATION
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Supervisor Escalation Center</h2>

        <div style={{ color: "#64748b", marginTop: 6 }}>
          Tracks critical approvals, SLA risk, and supervisor decisions for high-priority fleet events.
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading supervisor escalations...</div>
      ) : !data ? (
        <div style={{ color: "#64748b" }}>No escalation data available.</div>
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
              ["Total", data.summary.total, "#0f172a"],
              ["Critical", data.summary.critical, "#dc2626"],
              ["High", data.summary.high, "#ea580c"],
              ["SLA Breached", data.summary.breached, "#dc2626"],
              ["SLA Warning", data.summary.warning, "#d97706"],
            ].map(([label, value, color]) => (
              <div
                key={String(label)}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
                <div style={{ color: String(color), fontSize: 26, fontWeight: 900 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {data.escalations.length === 0 ? (
            <div style={{ color: "#64748b" }}>No supervisor escalations pending.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.escalations.map((item) => {
                const color = priorityColor(item.priority);
                const sla = slaColor(item.slaStatus);

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderLeft: `6px solid ${color}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color, fontWeight: 900, fontSize: 12 }}>
                          {item.priority.toUpperCase()} · {item.sourceType.replace(/_/g, " ").toUpperCase()}
                        </div>

                        <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>
                          {item.title}
                        </div>

                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {item.detail}
                        </div>

                        {item.driverName && (
                          <div style={{ color: "#475569", marginTop: 4 }}>
                            Driver: {item.driverName}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: sla, fontWeight: 900 }}>
                          {slaLabel(item.slaStatus)}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                          {item.ageMinutes}m / {item.slaMinutes}m
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 12,
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#9f1239",
                        fontWeight: 700,
                      }}
                    >
                      Recommended decision: {item.recommendedDecision}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
            Last checked: {new Date(data.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}

