"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

function nextStatus(status: string) {
  const map: Record<string, string> = {
    Assigned: "Accepted",
    Accepted: "En Route",
    "En Route": "Arrived",
    Arrived: "In Progress",
    "In Progress": "Completed",
  };

  return map[status] || null;
}

function actionLabel(status: string) {
  const map: Record<string, string> = {
    Assigned: "Accept Mission",
    Accepted: "Start Journey",
    "En Route": "Mark Arrived",
    Arrived: "Start Work",
    "In Progress": "Complete Mission",
  };

  return map[status] || "Update Mission";
}

export default function DriverMissionConsole({ vehicleId }: { vehicleId: string }) {
  const [mission, setMission] = useState<any | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMission() {
    if (!vehicleId) {
      setMission(null);
      setMissions([]);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetchWithAuth(`/api/mobile/missions?vehicleId=${vehicleId}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load mission.");
        return;
      }

      setMission(result.currentMission || null);
      setMissions(result.missions || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load mission.");
    } finally {
      setLoading(false);
    }
  }

  async function updateMission(status: string) {
    if (!mission?.id) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetchWithAuth(`/api/dispatch/missions/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to update mission.");
        return;
      }

      setMessage(`Mission updated to ${status}.`);
      await loadMission();
    } catch (error: any) {
      setMessage(error.message || "Failed to update mission.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMission();
    const interval = setInterval(loadMission, 30000);
    return () => clearInterval(interval);
  }, [vehicleId]);

  const next = mission ? nextStatus(mission.status) : null;
  const route = mission?.route_data?.selectedRoute;

  return (
    <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ color: "#2563eb", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            DRIVER MISSION CONSOLE
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Current Mission</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            Accept, start, arrive, and complete assigned dispatch missions.
          </div>
        </div>

        <button
          type="button"
          onClick={loadMission}
          disabled={loading}
          style={{ height: "fit-content", padding: "10px 14px", borderRadius: 12, border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && <div style={{ color: message.includes("updated") ? "#16a34a" : "#dc2626", marginBottom: 12, fontWeight: 700 }}>{message}</div>}

      {!vehicleId ? (
        <div style={{ color: "#64748b" }}>Select a vehicle to load driver missions.</div>
      ) : loading && !mission ? (
        <div style={{ color: "#64748b" }}>Loading driver mission...</div>
      ) : !mission ? (
        <div style={{ color: "#64748b" }}>No active mission assigned to this vehicle.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ padding: 16, borderRadius: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  {mission.mission_type || "Dispatch Mission"}
                </div>
                <div style={{ color: "#475569", marginTop: 6 }}>
                  Priority: <strong>{String(mission.priority || "normal").toUpperCase()}</strong>
                </div>
                <div style={{ color: "#475569", marginTop: 4 }}>
                  Status: <strong>{mission.status}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right", color: "#1d4ed8", fontWeight: 900 }}>
                Mission #{String(mission.id).slice(0, 8)}
              </div>
            </div>

            <div style={{ marginTop: 14, color: "#334155" }}>
              Incident: {mission.incidents?.incident_code || "None linked"}
              {mission.incidents?.severity ? ` · ${mission.incidents.severity}` : ""}
            </div>

            <div style={{ marginTop: 6, color: "#334155" }}>
              Destination: {mission.destination_lat}, {mission.destination_lng}
            </div>

            {route && (
              <div style={{ marginTop: 6, color: "#334155" }}>
                Route: {route.label || "Selected route"} · {route.duration || "ETA unavailable"}
              </div>
            )}

            {mission.notes && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #dbeafe" }}>
                <strong>Notes:</strong> {mission.notes}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {next && (
                <button
                  type="button"
                  onClick={() => updateMission(next)}
                  disabled={loading}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#16a34a", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {actionLabel(mission.status)}
                </button>
              )}

              {!["Completed", "Cancelled"].includes(mission.status) && (
                <button
                  type="button"
                  onClick={() => updateMission("Cancelled")}
                  disabled={loading}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  Unable To Complete
                </button>
              )}
            </div>
          </div>

          {missions.length > 1 && (
            <div style={{ color: "#64748b", fontSize: 14 }}>
              {missions.length - 1} additional active mission(s) assigned to this vehicle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
