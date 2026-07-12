"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/auth-fetch";

type Dashcam = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  vendor: string;
  status: "online" | "offline" | "warning";
  recording: boolean;
  storageUsedPercent: number;
  lastHeartbeat: string | null;
  lastClipAt: string | null;
  latestClipLabel: string | null;
  aiEvents: string[];
};

function statusColor(status: string) {
  if (status === "online") return "#16a34a";
  if (status === "warning") return "#d97706";
  return "#dc2626";
}

function formatDate(value?: string | null) {
  if (!value) return "No signal";
  return new Date(value).toLocaleString();
}

export default function DashcamMonitoring() {
  const [cameras, setCameras] = useState<Dashcam[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashcams() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/dashcam", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load dashcam monitoring.");
        return;
      }

      setSummary(result.summary);
      setCameras(result.cameras || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load dashcam monitoring.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashcams();

    const interval = setInterval(loadDashcams, 30000);

    const channel = supabase
      .channel("dashcam-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dashcam_events",
        },
        () => {
          loadDashcams();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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
          <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            DASHCAM MONITORING
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Vehicle Camera Health
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Monitors dashcam connectivity, recording state, storage usage, and latest evidence clips.
          </div>
        </div>

        <button
          type="button"
          onClick={loadDashcams}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#0f766e",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Cameras
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading dashcam monitoring...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Total Cameras", summary?.totalCameras || 0],
              ["Online", summary?.online || 0],
              ["Warning", summary?.warning || 0],
              ["Offline", summary?.offline || 0],
              ["Recording", summary?.recording || 0],
              ["Provider", summary?.provider || "mock"],
              ["Source", "Provider API"],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {cameras.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No dashcams registered yet. Cameras will appear here once vehicles are linked to dashcam devices.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {cameras.slice(0, 8).map((camera) => (
                <div
                  key={camera.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{camera.cameraName}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {camera.vehicleName}
                        {camera.nickname ? ` / ${camera.nickname}` : ""} Â· {camera.vendor}
                      </div>
                    </div>

                    <div style={{ color: statusColor(camera.status), fontWeight: 900 }}>
                      {camera.status.toUpperCase()} Â· {camera.recording ? "REC" : "NOT RECORDING"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
                    <div>
                      <strong>Last heartbeat</strong>
                      <div style={{ color: "#64748b" }}>{formatDate(camera.lastHeartbeat)}</div>
                    </div>

                    <div>
                      <strong>Latest clip</strong>
                      <div style={{ color: "#64748b" }}>
                        {camera.latestClipLabel || "No clip available"}
                      </div>
                    </div>

                    <div>
                      <strong>Storage</strong>
                      <div style={{ color: "#64748b" }}>{camera.storageUsedPercent}% used</div>
                    </div>
                  </div>

                  {camera.aiEvents.length > 0 && (
                    <div style={{ marginTop: 12, color: "#d97706", fontWeight: 800 }}>
                      {camera.aiEvents.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}


