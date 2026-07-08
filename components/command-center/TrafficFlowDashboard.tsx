"use client";

import { useState } from "react";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";
import { fetchWithAuth } from "@/lib/auth-fetch";

type TrafficFlow = {
  id: string;
  road: string;
  currentSpeed: number;
  freeFlowSpeed: number;
  congestion: number;
  delayMinutes: number;
  confidence: number;
  riskLevel: string;
  source: string;
  recommendedAction: string;
};

function flowColor(congestion: number) {
  if (congestion >= 70) return "#dc2626";
  if (congestion >= 40) return "#ea580c";
  if (congestion >= 20) return "#d97706";
  return "#16a34a";
}

export default function TrafficFlowDashboard() {
  const [flow, setFlow] = useState<TrafficFlow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTrafficFlow() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/traffic-flow", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load traffic flow.");
        return;
      }

      setSummary(result.summary);
      setFlow(result.flow || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load traffic flow.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [
      "traffic_flow",
      "road_incidents",
      "route_assignments",
      "vehicle_locations",
    ],
    refresh: loadTrafficFlow,
    pollingMs: 30000,
  });

  return (
    <section
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#2563eb", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            LIVE TRAFFIC FLOW
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            HERE Flow Intelligence
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Monitors corridor speeds, congestion, delay impact, and route-flow confidence.
          </div>
        </div>

        <button
          type="button"
          onClick={loadTrafficFlow}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Flow
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading traffic flow...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Corridors", summary?.corridors || 0],
              ["Critical", summary?.critical || 0],
              ["High", summary?.high || 0],
              ["Avg Congestion", `${summary?.averageCongestion || 0}%`],
              ["Avg Delay", `${summary?.averageDelay || 0} min`],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {flow.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No traffic flow data available yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {flow.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{item.road}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {item.currentSpeed} km/h current · {item.freeFlowSpeed} km/h free flow
                      </div>
                    </div>

                    <div style={{ color: flowColor(item.congestion), fontWeight: 900 }}>
                      {item.congestion}% congested · {item.delayMinutes} min delay
                    </div>
                  </div>

                  <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginTop: 12 }}>
                    <div
                      style={{
                        width: `${item.congestion}%`,
                        height: "100%",
                        background: flowColor(item.congestion),
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {item.recommendedAction}
                  </div>

                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                    Confidence: {Math.round(item.confidence * 100)}% · Source: {item.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

