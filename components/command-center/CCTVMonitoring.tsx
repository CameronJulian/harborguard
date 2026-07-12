"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/auth-fetch";

type CCTVCamera = {
  id: string;
  cameraName: string;
  vendor: string;
  location: string;
  linkedVehicleId: string;
  linkedVehicle: string;
  status: string;
  recording: boolean;
  motionDetected: boolean;
  aiEventCount: number;
  personCount: number;
  vehicleCount: number;
  latencyMs: number | null;
  lastFrameAt: string | null;
  lastEvent: string;
  recommendedAction: string;
};

function statusColor(status: string) {
  if (status === "online") return "#16a34a";
  if (status === "warning") return "#d97706";
  return "#dc2626";
}

function formatDate(value?: string | null) {
  if (!value) return "No recent frame";
  return new Date(value).toLocaleString();
}

export default function CCTVMonitoring() {
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCCTV() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/cctv", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load CCTV monitoring.");
        return;
      }

      setSummary(result.summary);
      setCameras(result.cameras || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load CCTV monitoring.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCCTV();

    const interval = setInterval(loadCCTV, 30000);

    const channel = supabase
      .channel("cctv-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cctv_events",
        },
        () => {
          loadCCTV();
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
          <div style={{ color: "#111827", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            CCTV MONITORING
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Surveillance Camera Operations
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Monitors CCTV camera health, motion events, AI detections, recording status, and corridor coverage.
          </div>
        </div>

        <button
          type="button"
          onClick={loadCCTV}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#111827",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh CCTV
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading CCTV monitoring...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Total", summary?.totalCameras || 0],
              ["Online", summary?.online || 0],
              ["Warning", summary?.warning || 0],
              ["Offline", summary?.offline || 0],
              ["Motion", summary?.motionEvents || 0],
              ["AI Events", summary?.aiEvents || 0],
              ["Provider", summary?.provider || "mock"],
              ["Source", "Persisted DB"],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {cameras.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No CCTV cameras configured yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {cameras.slice(0, 8).map((camera) => (
                <div
                  key={camera.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: camera.status === "offline" ? "#fef2f2" : "#f8fafc",
                    border: camera.status === "offline" ? "1px solid #fecaca" : "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{camera.cameraName}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {camera.location} Â· {camera.vendor} Â· Linked vehicle: {camera.linkedVehicle}
                      </div>
                    </div>

                    <div style={{ color: statusColor(camera.status), fontWeight: 900 }}>
                      {camera.status.toUpperCase()} Â· {camera.recording ? "REC" : "NO REC"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 }}>
                    <div>
                      <strong>Last frame</strong>
                      <div style={{ color: "#64748b" }}>{formatDate(camera.lastFrameAt)}</div>
                    </div>

                    <div>
                      <strong>Latency</strong>
                      <div style={{ color: "#64748b" }}>{camera.latencyMs ? `${camera.latencyMs}ms` : "Offline"}</div>
                    </div>

                    <div>
                      <strong>AI detections</strong>
                      <div style={{ color: "#64748b" }}>
                        {camera.aiEventCount} events Â· {camera.personCount} people Â· {camera.vehicleCount} vehicles
                      </div>
                    </div>
                  </div>

                  <div style={{ color: "#475569", marginTop: 10 }}>
                    Last event: {camera.lastEvent}
                  </div>

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {camera.recommendedAction}
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


