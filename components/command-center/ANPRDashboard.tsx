"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type ANPRDetection = {
  id: string;
  vehicleId: string;
  plateNumber: string;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  source: string;
  confidence: number;
  status: string;
  watchlistMatch: boolean;
  detectedAt: string;
  location: string;
  recommendedAction: string;
};

function statusColor(status: string) {
  if (status === "watchlist_review") return "#dc2626";
  if (status === "verified") return "#16a34a";
  return "#d97706";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function ANPRDashboard() {
  const [detections, setDetections] = useState<ANPRDetection[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadANPR() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/anpr", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load ANPR dashboard.");
        return;
      }

      setSummary(result.summary);
      setDetections(result.detections || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load ANPR dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadANPR();
    const interval = setInterval(loadANPR, 30000);
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
          <div style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            ANPR INTELLIGENCE
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Number Plate Recognition
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Tracks detected plates, confidence scores, camera source, and watchlist review status.
          </div>
        </div>

        <button
          type="button"
          onClick={loadANPR}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#1d4ed8",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh ANPR
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading ANPR intelligence...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Scanned Plates", summary?.scannedPlates || 0],
              ["Verified", summary?.verified || 0],
              ["Review", summary?.review || 0],
              ["Watchlist", summary?.watchlist || 0],
              ["Avg Confidence", `${summary?.averageConfidence || 0}%`],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {detections.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No ANPR detections available yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {detections.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: item.watchlistMatch ? "#fef2f2" : "#f8fafc",
                    border: item.watchlistMatch ? "1px solid #fecaca" : "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ fontSize: 20 }}>{item.plateNumber}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {item.vehicleName}
                        {item.nickname ? ` / ${item.nickname}` : ""} · {item.cameraName}
                      </div>
                    </div>

                    <div style={{ color: statusColor(item.status), fontWeight: 900 }}>
                      {formatStatus(item.status).toUpperCase()} · {item.confidence}%
                    </div>
                  </div>

                  <div style={{ color: "#475569", marginTop: 10 }}>
                    Source: {item.source} · Location: {item.location}
                  </div>

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {item.recommendedAction}
                  </div>

                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                    Detected: {new Date(item.detectedAt).toLocaleString()}
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
