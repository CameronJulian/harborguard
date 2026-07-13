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
type AutomaticVisionResult = {
  cameraId: string;
  status: "analysed" | "skipped" | "failed";
  detections?: number;
  message?: string;
};

type AutomaticVision = {
  enabled: boolean;
  maximumPerRefresh: number;
  candidates: number;
  results: AutomaticVisionResult[];
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
  const [automaticVision, setAutomaticVision] =
    useState<AutomaticVision | null>(null);
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
      setAutomaticVision(
        result.automaticVision || null
      );
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

          {automaticVision ? (
            <div
              style={{
                marginBottom: 18,
                padding: 18,
                borderRadius: 18,
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#0f766e",
                      fontSize: 13,
                      fontWeight: 900,
                      marginBottom: 4,
                    }}
                  >
                    AUTOMATIC AI ANALYSIS
                  </div>

                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 900,
                    }}
                  >
                    Dashcam Vision Pipeline
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    New provider snapshots are automatically
                    analysed and saved as vision events.
                  </div>
                </div>

                <div
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    background: automaticVision.enabled
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: automaticVision.enabled
                      ? "#166534"
                      : "#b91c1c",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {automaticVision.enabled
                    ? "ENABLED"
                    : "DISABLED"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 10,
                  marginBottom:
                    automaticVision.results?.length > 0
                      ? 14
                      : 0,
                }}
              >
                {[
                  [
                    "Active Provider",
                    summary?.provider || "Unknown",
                  ],
                  [
                    "Snapshot Candidates",
                    automaticVision.candidates || 0,
                  ],
                  [
                    "Maximum Per Refresh",
                    automaticVision.maximumPerRefresh || 0,
                  ],
                  [
                    "Latest Results",
                    automaticVision.results?.length || 0,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "#ffffff",
                      border: "1px solid #ccfbf1",
                    }}
                  >
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize:
                          String(value).length > 14
                            ? 18
                            : 25,
                        lineHeight: 1.15,
                        fontWeight: 900,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {automaticVision.results?.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {automaticVision.results.map(
                    (result, index) => {
                      const success =
                        result.status === "analysed";

                      const skipped =
                        result.status === "skipped";

                      const background = success
                        ? "#ecfdf5"
                        : skipped
                        ? "#eff6ff"
                        : "#fef2f2";

                      const border = success
                        ? "#a7f3d0"
                        : skipped
                        ? "#bfdbfe"
                        : "#fecaca";

                      const color = success
                        ? "#166534"
                        : skipped
                        ? "#1d4ed8"
                        : "#b91c1c";

                      return (
                        <div
                          key={`${result.cameraId}-${index}`}
                          style={{
                            padding: 11,
                            borderRadius: 12,
                            background,
                            border: `1px solid ${border}`,
                            color,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong>
                              {result.status === "analysed"
                                ? "Analysis completed"
                                : result.status === "skipped"
                                ? "Analysis skipped"
                                : "Analysis failed"}
                            </strong>

                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 900,
                                textTransform: "uppercase",
                              }}
                            >
                              {result.status}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                            }}
                          >
                            Camera: {result.cameraId}
                          </div>

                          {typeof result.detections ===
                          "number" ? (
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 13,
                              }}
                            >
                              Detections saved:{" "}
                              {result.detections}
                            </div>
                          ) : null}

                          {result.message ? (
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 13,
                              }}
                            >
                              {result.message}
                            </div>
                          ) : null}
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  No snapshot analysis was required during
                  the latest refresh.
                </div>
              )}
            </div>
          ) : null}
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

