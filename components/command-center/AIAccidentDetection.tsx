"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type Detection = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  nickname?: string | null;
  score: number;
  riskLevel: string;
  alertType: string | null;
  severity: string | null;
  message: string | null;
  reasons: string[];
  recommendedAction: string;
  createdAt: string | null;
};

function riskColor(level: string) {
  if (level === "critical") return "#dc2626";
  if (level === "high") return "#ea580c";
  if (level === "medium") return "#d97706";
  return "#2563eb";
}

export default function AIAccidentDetection() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDetection() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/accident-detection", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load AI accident detection.");
        return;
      }

      setSummary(result.summary);
      setDetections(result.detections || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load AI accident detection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetection();
    const interval = setInterval(loadDetection, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            AI ACCIDENT DETECTION
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Collision Risk Intelligence
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Detects possible accidents from SOS alerts, critical events, harsh-stop language, incident context, and road accident intelligence.
          </div>
        </div>

        <button
          type="button"
          onClick={loadDetection}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#dc2626",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Detection
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading accident intelligence...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Monitored Alerts", summary?.monitoredAlerts || 0],
              ["Road Accidents", summary?.activeRoadAccidents || 0],
              ["Open Incidents", summary?.openIncidents || 0],
              ["Highest Score", summary?.highestScore || 0],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {detections.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No likely accident patterns detected. Fleet conditions appear stable.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {detections.map((item) => (
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
                      <strong>{item.vehicleName}</strong>
                      {item.nickname && (
                        <span style={{ color: "#64748b" }}> / {item.nickname}</span>
                      )}
                    </div>

                    <div style={{ color: riskColor(item.riskLevel), fontWeight: 900 }}>
                      {item.riskLevel.toUpperCase()} · {item.score}/99
                    </div>
                  </div>

                  <div style={{ color: "#475569", marginTop: 8 }}>
                    {item.message || "Vehicle event requires accident-risk review."}
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {item.reasons.slice(0, 3).map((reason) => (
                      <div key={reason} style={{ color: "#64748b", fontSize: 13 }}>
                        • {reason}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {item.recommendedAction}
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
