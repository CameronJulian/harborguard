"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type MissionTask = {
  id: string;
  sourceId: string;
  sourceType: string;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  title: string;
  detail: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  recommendedAction: string;
  createdAt: string;
};

function priorityColor(priority: string) {
  if (priority === "critical") return "#dc2626";
  if (priority === "high") return "#ea580c";
  if (priority === "medium") return "#d97706";
  return "#2563eb";
}

function priorityLabel(priority: string) {
  return priority.toUpperCase();
}

export default function FleetMissionQueue() {
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadQueue() {
    try {
      const response = await fetchWithAuth("/api/command-center/mission-queue", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setTasks(result.tasks || []);
      } else {
        setMessage(result.error || "Failed to load mission queue.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load mission queue.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: ["vehicle_alerts", "incidents", "road_incidents"],
    refresh: loadQueue,
  });

  const stats = useMemo(() => {
    return {
      critical: tasks.filter((task) => task.priority === "critical").length,
      high: tasks.filter((task) => task.priority === "high").length,
      medium: tasks.filter((task) => task.priority === "medium").length,
      total: tasks.length,
    };
  }, [tasks]);

  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#2563eb", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            FLEET MISSION QUEUE
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>Dispatcher Action Queue</h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Converts alerts, incidents, and road intelligence into prioritized operational tasks.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            ["Total", stats.total, "#0f172a"],
            ["Critical", stats.critical, "#dc2626"],
            ["High", stats.high, "#ea580c"],
            ["Medium", stats.medium, "#d97706"],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ minWidth: 84, padding: 10, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
              <div style={{ color: String(color), fontSize: 22, fontWeight: 900 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 12 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading mission queue...</div>
      ) : tasks.length === 0 ? (
        <div style={{ color: "#64748b" }}>No active mission tasks. Fleet operations appear stable.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {tasks.map((task) => {
            const color = priorityColor(task.priority);

            return (
              <div
                key={task.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderLeft: `6px solid ${color}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color, fontWeight: 900, fontSize: 12 }}>
                      {priorityLabel(task.priority)} · {task.sourceType.replace(/_/g, " ").toUpperCase()}
                    </div>

                    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>
                      {task.title}
                    </div>

                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {task.detail}
                    </div>

                    {task.driverName && (
                      <div style={{ color: "#475569", marginTop: 4 }}>
                        Driver: {task.driverName}
                      </div>
                    )}
                  </div>

                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 12,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e3a8a",
                    fontWeight: 700,
                  }}
                >
                  Recommended action: {task.recommendedAction}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



