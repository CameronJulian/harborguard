"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  status: "active" | "watching";
  matches: number;
};

type AutomationResponse = {
  rules: AutomationRule[];
  actionable: any[];
  summary: {
    totalAlerts: number;
    actionableAlerts: number;
    activeRules: number;
    actionCounts: Record<string, number>;
  };
  generatedAt: string;
};

function actionLabel(action: string) {
  return action.replace(/_/g, " ");
}

export default function MissionAutomationRules() {
  const [data, setData] = useState<AutomationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAutomation() {
    try {
      const response = await fetchWithAuth("/api/command-center/automation", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setMessage(result.error || "Failed to load automation rules.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load automation rules.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: ["vehicle_alerts", "incidents", "dispatch_missions"],
    refresh: loadAutomation,
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
        <div style={{ color: "#7c3aed", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
          MISSION AUTOMATION
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Automation Rules Engine</h2>

        <div style={{ color: "#64748b", marginTop: 6 }}>
          Evaluates live alerts against autonomous response rules before dispatcher escalation.
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading automation rules...</div>
      ) : !data ? (
        <div style={{ color: "#64748b" }}>No automation data available.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              ["Alerts Checked", data.summary.totalAlerts],
              ["Actionable", data.summary.actionableAlerts],
              ["Active Rules", data.summary.activeRules],
              ["Rules", data.rules.length],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {data.rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: rule.status === "active" ? "#fef2f2" : "#f8fafc",
                  border: rule.status === "active" ? "1px solid #fecaca" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{rule.name}</div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>Trigger: {rule.trigger}</div>
                  </div>

                  <div style={{ color: rule.status === "active" ? "#dc2626" : "#2563eb", fontWeight: 900 }}>
                    {rule.status.toUpperCase()} · {rule.matches}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {rule.actions.map((action) => (
                    <span
                      key={action}
                      style={{
                        padding: "6px 9px",
                        borderRadius: 999,
                        background: "#ede9fe",
                        color: "#5b21b6",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {actionLabel(action)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {data.actionable.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <strong>Current automation candidates</strong>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {data.actionable.slice(0, 5).map((item: any) => (
                  <div key={item.alertId} style={{ padding: 12, borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                    <div style={{ fontWeight: 900 }}>
                      {item.vehicleName} · {item.severity}
                    </div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{item.message}</div>
                    <div style={{ color: "#9a3412", marginTop: 6 }}>
                      Actions: {(item.evaluation.actions || []).map(actionLabel).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
            Last evaluated: {new Date(data.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}



