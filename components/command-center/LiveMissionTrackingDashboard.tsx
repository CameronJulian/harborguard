"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { subscribeCommandCenterTables } from "@/lib/realtime/commandCenterEvents";

type TrackingItem = {
  missionId: string;
  vehicle: string;
  status: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  destination: { lat: number; lng: number };
  remainingMeters: number;
  remainingKm: number;
  plannedDistanceMeters: number;
  progressPercent: number;
  etaMinutes: number;
  arrivalRadiusMeters: number;
  arrived: boolean;
  autoTransition: string | null;
  lastSeen: string;
};

function statusColor(status: string) {
  if (status === "Arrived") return "#16a34a";
  if (status === "En Route") return "#2563eb";
  if (status === "In Progress") return "#7c3aed";
  return "#ea580c";
}

export default function LiveMissionTrackingDashboard() {
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTracking() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/dispatch/tracking", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load live mission tracking.");
        return;
      }

      setTracking(result.tracking || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load live mission tracking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracking();

    const interval = setInterval(loadTracking, 15000);
    const unsubscribe = subscribeCommandCenterTables(["vehicle_locations", "dispatch_missions", "route_assignments", "vehicle_trips"], loadTracking);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    const moving = tracking.filter((item) => item.speedKmh >= 5).length;
    const arrived = tracking.filter((item) => item.arrived).length;
    const autoTransitions = tracking.filter((item) => item.autoTransition).length;
    const avgEta =
      tracking.length > 0
        ? Math.round(tracking.reduce((sum, item) => sum + item.etaMinutes, 0) / tracking.length)
        : 0;

    return {
      total: tracking.length,
      moving,
      arrived,
      autoTransitions,
      avgEta,
    };
  }, [tracking]);

  return (
    <section style={{ padding: 22, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#7c3aed", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            LIVE MISSION TRACKING
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Mission Progress Dashboard</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            Tracks live ETA, distance, progress, arrival detection, and automatic mission transitions.
          </div>
        </div>

        <button
          type="button"
          onClick={loadTracking}
          disabled={loading}
          style={{ height: "fit-content", padding: "10px 14px", borderRadius: 12, border: 0, background: "#7c3aed", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Refreshing..." : "Refresh Tracking"}
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[
          ["Active", stats.total],
          ["Moving", stats.moving],
          ["Avg ETA", `${stats.avgEta} min`],
          ["Arrived", stats.arrived],
          ["Auto Updates", stats.autoTransitions],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading live mission tracking...</div>
      ) : tracking.length === 0 ? (
        <div style={{ color: "#64748b" }}>No active missions currently being tracked.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {tracking.map((item) => {
            const color = statusColor(item.status);

            return (
              <div key={item.missionId} style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.vehicle || "Unknown vehicle"}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      Mission #{item.missionId.slice(0, 8)}
                    </div>
                  </div>

                  <div style={{ color, fontWeight: 900 }}>{item.status}</div>
                </div>

                <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${item.progressPercent}%`, height: "100%", background: color }} />
                </div>

                <div style={{ color: "#334155", fontSize: 14, display: "grid", gap: 5 }}>
                  <div>Progress: <strong>{item.progressPercent}%</strong></div>
                  <div>Remaining: <strong>{item.remainingKm} km</strong></div>
                  <div>ETA: <strong>{item.etaMinutes} min</strong></div>
                  <div>Speed: <strong>{item.speedKmh} km/h</strong></div>
                  <div>Destination: {item.destination.lat}, {item.destination.lng}</div>
                  <div>Last seen: {item.lastSeen ? new Date(item.lastSeen).toLocaleString() : "Unknown"}</div>
                </div>

                {item.arrived && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#ecfdf5", color: "#15803d", fontWeight: 900 }}>
                    Vehicle is within arrival radius.
                  </div>
                )}

                {item.autoTransition && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#f5f3ff", color: "#6d28d9", fontWeight: 900 }}>
                    Auto-transitioned to {item.autoTransition}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


