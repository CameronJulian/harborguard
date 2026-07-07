"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";
import MissionDetailsPanel from "@/components/dispatch/MissionDetailsPanel";

const statuses = ["Pending", "Assigned", "Accepted", "En Route", "Arrived", "In Progress", "Completed", "Cancelled"];

function nextStatus(status: string) {
  const map: Record<string, string> = {
    Pending: "Assigned",
    Assigned: "Accepted",
    Accepted: "En Route",
    "En Route": "Arrived",
    Arrived: "In Progress",
    "In Progress": "Completed",
  };

  return map[status] || null;
}

export default function MissionBoard() {
  const [missions, setMissions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  async function loadMissions() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/dispatch/missions", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load missions.");
        return;
      }

      setMissions(result.missions || []);
      setSummary(result.summary || null);
    } catch (error: any) {
      setMessage(error.message || "Failed to load missions.");
    } finally {
      setLoading(false);
    }
  }

  async function updateMission(id: string, status: string) {
    try {
      setMessage("");

      const response = await fetchWithAuth(`/api/dispatch/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to update mission.");
        return;
      }

      await loadMissions();
    } catch (error: any) {
      setMessage(error.message || "Failed to update mission.");
    }
  }

  useRealtimeRefresh({
    tables: [
      "dispatch_missions",
      "mission_timeline_events",
      "mission_messages",
      "mission_evidence",
    ],
    refresh: loadMissions,
  });

  return (
    <section style={{ padding: 22, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            MISSION MANAGEMENT
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Live Mission Board</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            Tracks dispatch missions from assignment through completion.
          </div>
        </div>

        <button onClick={loadMissions} style={{ height: "fit-content", padding: "10px 14px", borderRadius: 12, border: 0, background: "#0f766e", color: "#ffffff", fontWeight: 900, cursor: "pointer" }}>
          Refresh Missions
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading missions...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Total", summary?.total || 0],
              ["Assigned", summary?.assigned || 0],
              ["En Route", summary?.enRoute || 0],
              ["Completed", summary?.completed || 0],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)", gap: 18, alignItems: "start" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {statuses.map((status) => {
              const group = missions.filter((mission) => mission.status === status);

              return (
                <div key={status} style={{ padding: 14, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>{status} ({group.length})</div>

                  {group.length === 0 ? (
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>No missions</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {group.map((mission) => {
                        const next = nextStatus(mission.status);

                        return (
                          <div
  key={mission.id}
  onClick={() => setSelectedMissionId(mission.id)}
  style={{
    padding: 12,
    borderRadius: 14,
    background: "#ffffff",
    border: selectedMissionId === mission.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
    cursor: "pointer"
  }}
>
                            <div style={{ fontWeight: 900 }}>
                              {mission.mission_type || "dispatch"} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {mission.priority || "normal"}
                            </div>

                            <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>
                              Vehicle: {mission.vehicles?.registration_number || mission.vehicles?.nickname || mission.assigned_vehicle_id || "Unassigned"}
                            </div>

                            <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                              Incident: {mission.incidents?.incident_code || "None"}
                            </div>

                            {next && (
                              <button
                                onClick={() => updateMission(mission.id, next)}
                                style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, border: 0, background: "#0f766e", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}
                              >
                                Move to {next}
                              </button>
                            )}

                            {!["Completed", "Cancelled"].includes(mission.status) && (
                              <button
                                onClick={() => updateMission(mission.id, "Cancelled")}
                                style={{ marginTop: 8, marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontWeight: 800, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            </div>

            <MissionDetailsPanel missionId={selectedMissionId} />
          </div>
        </>
      )}
    </section>
  );
}


