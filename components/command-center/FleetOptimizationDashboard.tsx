"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type Candidate = {
  vehicleId: string;
  vehicleName: string;
  score: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  openAlerts: number;
  activeTrip: boolean;
  recommendation: string;
};

function scoreColor(score: number) {
  if (score >= 85) return "#16a34a";
  if (score >= 70) return "#2563eb";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export default function FleetOptimizationDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOptimization() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/fleet/optimization", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load Fleet Optimization.");
        return;
      }

      setSummary(result.summary || null);
      setCandidates(result.candidates || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load Fleet Optimization.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOptimization();
    const interval = setInterval(loadOptimization, 30000);
    return () => clearInterval(interval);
  }, []);

  const best = summary?.bestCandidate;

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
            FLEET OPTIMIZATION ENGINE
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Dispatch Candidate Ranking
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Ranks available vehicles using fleet health, live location, active trips, alerts, and traffic intelligence.
          </div>
        </div>

        <button
          type="button"
          onClick={loadOptimization}
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
          Refresh Optimization
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading fleet optimization...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Candidates", summary?.totalCandidates || 0],
              ["Available", summary?.available || 0],
              ["Busy", summary?.busy || 0],
              ["Offline", summary?.offline || 0],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {best && (
            <div style={{ padding: 16, borderRadius: 18, background: "#f5f3ff", border: "1px solid #ddd6fe", marginBottom: 14 }}>
              <div style={{ color: "#6d28d9", fontWeight: 900, marginBottom: 6 }}>BEST DISPATCH CANDIDATE</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{best.vehicleName}</strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {best.recommendation}
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor(best.score) }}>
                  {best.score}/100
                </div>
              </div>
            </div>
          )}

          {candidates.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No optimization candidates available.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {candidates.slice(0, 8).map((item, index) => (
                <div
                  key={item.vehicleId}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>#{index + 1} {item.vehicleName}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        Status: {item.status} · Speed: {item.speedKmh} km/h · Alerts: {item.openAlerts} · Active trip: {item.activeTrip ? "Yes" : "No"}
                      </div>
                    </div>

                    <div style={{ color: scoreColor(item.score), fontWeight: 900 }}>
                      {item.score}/100
                    </div>
                  </div>

                  <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginTop: 12 }}>
                    <div
                      style={{
                        width: `${item.score}%`,
                        height: "100%",
                        background: scoreColor(item.score),
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommendation: {item.recommendation}
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
