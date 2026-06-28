"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type CommandAssistant = {
  fleetStatus: string;
  confidence: number;
  monitoredVehicles: number;
  openAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  sosAlerts: number;
  openIncidents: number;
  activeRoadThreats: number;
  highestRisk: any | null;
  recommendations: string[];
  generatedAt: string;
};

function statusColor(status: string) {
  if (status === "Critical") return "#ef4444";
  if (status === "Elevated") return "#f59e0b";
  return "#22c55e";
}

export default function AICommandAssistant() {
  const [assistant, setAssistant] = useState<CommandAssistant | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAssistant() {
    try {
      const response = await fetchWithAuth("/api/command-center/assistant", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setAssistant(result.assistant || null);
      }
    } catch (error) {
      console.error("AI Command Assistant load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssistant();
    const interval = setInterval(loadAssistant, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 22, borderRadius: 22, background: "#0f172a", color: "#cbd5e1", marginBottom: 24 }}>
        Loading AI Command Assistant...
      </div>
    );
  }

  if (!assistant) return null;

  const color = statusColor(assistant.fleetStatus);

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 24,
        background: "linear-gradient(135deg,#020617,#0f172a,#1e3a8a)",
        color: "#ffffff",
        marginBottom: 24,
        boxShadow: "0 18px 45px rgba(15,23,42,0.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#93c5fd", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            AI COMMAND ASSISTANT
          </div>

          <h2 style={{ margin: 0, fontSize: 32 }}>Operational Command Briefing</h2>

          <div style={{ color: "#cbd5e1", marginTop: 8 }}>
            Live decision-support summary built from fleet health, alerts, incidents, road intelligence, and dispatcher recommendations.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color, fontWeight: 900, fontSize: 22 }}>
            {assistant.fleetStatus}
          </div>
          <div style={{ color: "#cbd5e1", marginTop: 4 }}>
            Confidence {assistant.confidence}%
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 12,
          marginTop: 22,
        }}
      >
        {[
          ["Vehicles", assistant.monitoredVehicles],
          ["Open Alerts", assistant.openAlerts],
          ["Critical", assistant.criticalAlerts],
          ["High", assistant.highAlerts],
          ["SOS", assistant.sosAlerts],
          ["Incidents", assistant.openIncidents],
          ["Road Threats", assistant.activeRoadThreats],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              padding: 14,
              borderRadius: 16,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>{label}</div>
            <div style={{ fontWeight: 900, fontSize: 26 }}>{value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(15,23,42,0.7)",
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div style={{ color: "#93c5fd", fontWeight: 900, marginBottom: 8 }}>
            HIGHEST RISK UNIT
          </div>

          {assistant.highestRisk ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {assistant.highestRisk.registrationNumber}
              </div>

              <div style={{ color: "#cbd5e1", marginTop: 4 }}>
                Driver: {assistant.highestRisk.driverName || "Unassigned"}
              </div>

              <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                {String(assistant.highestRisk.alertType || "alert").replace(/_/g, " ")} · {assistant.highestRisk.severity}
              </div>

              <div style={{ color: "#bfdbfe", marginTop: 8 }}>
                Threat Score: {assistant.highestRisk.intelligenceScore}/100
              </div>
            </>
          ) : (
            <div style={{ color: "#cbd5e1" }}>No active high-risk vehicle detected.</div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(15,23,42,0.7)",
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div style={{ color: "#93c5fd", fontWeight: 900, marginBottom: 8 }}>
            RECOMMENDED COMMAND ACTIONS
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {assistant.recommendations.map((recommendation) => (
              <div key={recommendation} style={{ color: "#e0f2fe" }}>
                ✓ {recommendation}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 18 }}>
        Last updated: {new Date(assistant.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
