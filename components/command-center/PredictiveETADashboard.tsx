"use client";

import { useState } from "react";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";
import { fetchWithAuth } from "@/lib/auth-fetch";

type ETAPrediction = {
  tripId: string;
  vehicle: string;
  remainingDistanceKm: number;
  currentSpeed: number;
  estimatedArrival: string;
  predictedDelayMinutes: number;
  confidence: number;
  recommendation: string;
};

function delayColor(delay: number) {
  if (delay >= 20) return "#dc2626";
  if (delay >= 10) return "#d97706";
  return "#16a34a";
}

export default function PredictiveETADashboard() {
  const [predictions, setPredictions] = useState<ETAPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPredictions() {
    try {
      const response = await fetchWithAuth("/api/fleet/predict-eta", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setPredictions(result.predictions || []);
      } else {
        console.error("Predictive ETA failed:", result.error);
      }
    } catch (error) {
      console.error("Predictive ETA load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [
      "vehicle_locations",
      "vehicle_trips",
      "route_assignments",
      "vehicles",
    ],
    refresh: loadPredictions,
    pollingMs: 60000,
  });

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
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: 24 }}>
          Predictive ETA Intelligence
        </h2>
        <div style={{ color: "#64748b" }}>
          AI-estimated arrival delays for active trips.
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading ETA predictions...</div>
      ) : predictions.length === 0 ? (
        <div style={{ color: "#64748b" }}>
          No active ETA predictions available.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {predictions.slice(0, 5).map((prediction) => (
            <div
              key={prediction.tripId}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 14,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong>{prediction.vehicle}</strong>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    ETA: {new Date(prediction.estimatedArrival).toLocaleString()}
                  </div>
                </div>

                <div
                  style={{
                    color: delayColor(prediction.predictedDelayMinutes),
                    fontWeight: 900,
                  }}
                >
                  {prediction.predictedDelayMinutes} min delay
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Distance</div>
                  <strong>{prediction.remainingDistanceKm} km</strong>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Speed</div>
                  <strong>{prediction.currentSpeed} km/h</strong>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Confidence</div>
                  <strong>{prediction.confidence}%</strong>
                </div>
              </div>

              <div style={{ marginTop: 10, color: "#334155" }}>
                Recommendation: {prediction.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

