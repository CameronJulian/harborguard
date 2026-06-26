"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type ShiftSummary = {
  operationalStatus: string;
  summary: string;
  vehiclesMonitored: number;
  alertsTotal: number;
  criticalAlerts: number;
  highAlerts: number;
  sosAlerts: number;
  incidentsTotal: number;
  openIncidents: number;
  resolvedIncidents: number;
  tripsTotal: number;
  completedTrips: number;
  notificationsTotal: number;
  topAlertType: string;
  highestRiskAlert: {
    alertType: string;
    severity: string;
    message: string;
    intelligenceScore: number | null;
    behavioralRisk: string | null;
    createdAt: string | null;
  } | null;
  recommendations: string[];
};

function statusColor(status: string) {
  if (status === "Critical") return "#dc2626";
  if (status === "Elevated") return "#d97706";
  return "#16a34a";
}

export default function AIShiftSummary() {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadShiftSummary() {
    try {
      const response = await fetchWithAuth("/api/ai/shift-summary", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setSummary(result.shiftSummary || null);
      } else {
        console.error("AI shift summary failed:", result.error);
      }
    } catch (error) {
      console.error("AI shift summary load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShiftSummary();

    const interval = setInterval(loadShiftSummary, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: 22,
          marginBottom: 24,
        }}
      >
        Loading AI shift summary...
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: 22,
          marginBottom: 24,
        }}
      >
        AI shift summary unavailable.
      </div>
    );
  }

  const metrics = [
    ["Vehicles", summary.vehiclesMonitored],
    ["Alerts", summary.alertsTotal],
    ["Critical", summary.criticalAlerts],
    ["High Risk", summary.highAlerts],
    ["SOS", summary.sosAlerts],
    ["Incidents", summary.incidentsTotal],
    ["Open Incidents", summary.openIncidents],
    ["Resolved", summary.resolvedIncidents],
    ["Trips", summary.tripsTotal],
    ["Completed Trips", summary.completedTrips],
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        padding: 22,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px 0", fontSize: 24 }}>
            AI Shift Summary
          </h2>
          <div style={{ color: "#64748b" }}>
            Last 8 hours of operational activity and AI handover notes.
          </div>
        </div>

        <div
          style={{
            color: statusColor(summary.operationalStatus),
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          {summary.operationalStatus}
        </div>
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          color: "#334155",
          lineHeight: 1.6,
        }}
      >
        {summary.summary}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
              {label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Top operational pattern:</strong>{" "}
        {summary.topAlertType.replace(/_/g, " ")}
      </div>

      {summary.highestRiskAlert && (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <strong>Highest-risk event</strong>
          <div style={{ marginTop: 6 }}>
            {summary.highestRiskAlert.alertType.replace(/_/g, " ")} •{" "}
            {summary.highestRiskAlert.severity} • AI Score{" "}
            {summary.highestRiskAlert.intelligenceScore || 0}/100
          </div>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            {summary.highestRiskAlert.message}
          </div>
        </div>
      )}

      <div>
        <strong>AI handover recommendations</strong>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {summary.recommendations.map((recommendation) => (
            <div key={recommendation} style={{ color: "#334155" }}>
              ✓ {recommendation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
