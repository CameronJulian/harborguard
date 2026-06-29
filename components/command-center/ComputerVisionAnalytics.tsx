"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type VisionEvent = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  eventType: string;
  severity: string;
  confidence: number;
  status: string;
  detectedAt: string;
  description: string;
  recommendedAction: string;
};

function severityColor(severity: string) {
  if (severity === "high") return "#dc2626";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

function formatEventType(type: string) {
  return type.replaceAll("_", " ");
}

export default function ComputerVisionAnalytics() {
  const [events, setEvents] = useState<VisionEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadVision() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/computer-vision", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load computer vision analytics.");
        return;
      }

      setSummary(result.summary);
      setEvents(result.events || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load computer vision analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVision();
    const interval = setInterval(loadVision, 30000);
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
          <div style={{ color: "#7c3aed", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            COMPUTER VISION ANALYTICS
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Camera AI Review Queue
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Reviews dashcam frames for road hazards, driver safety patterns, and future ANPR/CCTV events.
          </div>
        </div>

        <button
          type="button"
          onClick={loadVision}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#7c3aed",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Vision
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading computer vision analytics...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Analysed Cameras", summary?.analysedCameras || 0],
              ["Vision Events", summary?.visionEvents || 0],
              ["Review Required", summary?.reviewRequired || 0],
              ["High Confidence", summary?.highConfidence || 0],
              ["Avg Confidence", `${summary?.averageConfidence || 0}%`],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {events.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No computer vision events detected yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{formatEventType(event.eventType)}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {event.vehicleName}
                        {event.nickname ? ` / ${event.nickname}` : ""} · {event.cameraName}
                      </div>
                    </div>

                    <div style={{ color: severityColor(event.severity), fontWeight: 900 }}>
                      {event.severity.toUpperCase()} · {event.confidence}% confidence
                    </div>
                  </div>

                  <div style={{ color: "#475569", marginTop: 10 }}>
                    {event.description}
                  </div>

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {event.recommendedAction}
                  </div>

                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                    Detected: {new Date(event.detectedAt).toLocaleString()} · Status: {event.status.replaceAll("_", " ")}
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
