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

type RecentVisionEvent = {
  id: string;
  vehicleId?: string | null;
  vehicleName: string;
  cameraName: string;
  provider: string;
  eventType: string;
  severity: string;
  confidence: number;
  status: string;
  description: string;
  recommendedAction: string;
  detectedAt: string;
  incidentId?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
};

type OpenIncident = {
  id: string;
  incident_code: string;
  summary: string;
  severity: string;
  status: string;
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

  const [recentVisionEvents, setRecentVisionEvents] =
    useState<RecentVisionEvent[]>([]);

  const [openIncidents, setOpenIncidents] =
    useState<OpenIncident[]>([]);

  const [reviewingEventId, setReviewingEventId] =
    useState<string | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] =
    useState("");

  const [reviewNote, setReviewNote] =
    useState("");

  const [savingReview, setSavingReview] =
    useState(false);

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

      setRecentVisionEvents(
        result.recentVisionEvents || []
      );
    } catch (error: any) {
      setMessage(error.message || "Failed to load dashcam monitoring.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOpenIncidents() {
    try {
      const response = await fetchWithAuth(
        "/api/incidents/command",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const result = await response.json();

      setOpenIncidents(
        (result.incidents || []).filter(
          (incident: OpenIncident) =>
            String(incident.status).toLowerCase() !==
            "resolved"
        )
      );
    } catch (error) {
      console.error(
        "Failed to load incidents for vision review:",
        error
      );
    }
  }

  function beginReview(event: RecentVisionEvent) {
    setReviewingEventId(event.id);
    setSelectedIncidentId(event.incidentId || "");
    setReviewNote(event.reviewNote || "");
    setMessage("");
  }

  function cancelReview() {
    setReviewingEventId(null);
    setSelectedIncidentId("");
    setReviewNote("");
  }

  async function saveVisionReview(eventId: string) {
    try {
      setSavingReview(true);
      setMessage("");

      const response = await fetchWithAuth(
        "/api/command-center/vision-events/review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            visionEventId: eventId,
            status: "reviewed",
            reviewNote,
            incidentId: selectedIncidentId || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Failed to save the vision-event review."
        );
        return;
      }

      setRecentVisionEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                ...result.event,
              }
            : event
        )
      );

      setMessage("Vision event reviewed successfully.");
      cancelReview();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save the vision-event review."
      );
    } finally {
      setSavingReview(false);
    }
  }

  useEffect(() => {
    loadDashcams();
    loadOpenIncidents();

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
          <div
            style={{
              marginBottom: 18,
              padding: 18,
              borderRadius: 18,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#7c3aed",
                    fontSize: 13,
                    fontWeight: 900,
                    marginBottom: 4,
                  }}
                >
                  RECENT AI VISION EVENTS
                </div>

                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 900,
                  }}
                >
                  Latest Dashcam Detections
                </div>

                <div
                  style={{
                    color: "#64748b",
                    marginTop: 4,
                  }}
                >
                  Recent detections produced by the active
                  HarborGuard vision provider.
                </div>
              </div>

              <div
                style={{
                  height: "fit-content",
                  padding: "7px 11px",
                  borderRadius: 999,
                  background: "#f3e8ff",
                  color: "#6d28d9",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {recentVisionEvents.length} EVENTS
              </div>
            </div>

            {recentVisionEvents.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "#f8fafc",
                  color: "#64748b",
                }}
              >
                No recent AI vision events are available.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {recentVisionEvents.map((event) => {
                  const highSeverity =
                    event.severity === "high" ||
                    event.severity === "critical";

                  const reviewRequired =
                    event.status === "review_required";

                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: 14,
                        borderRadius: 15,
                        background: highSeverity
                          ? "#fef2f2"
                          : "#f8fafc",
                        border: highSeverity
                          ? "1px solid #fecaca"
                          : "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 17,
                              fontWeight: 900,
                              textTransform: "capitalize",
                            }}
                          >
                            {event.eventType.replaceAll(
                              "_",
                              " "
                            )}
                          </div>

                          <div
                            style={{
                              color: "#64748b",
                              marginTop: 3,
                              fontSize: 13,
                            }}
                          >
                            {event.vehicleName} -{" "}
                            {event.cameraName}
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              color: highSeverity
                                ? "#dc2626"
                                : "#2563eb",
                              fontWeight: 900,
                            }}
                          >
                            {event.confidence}% confidence
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              color: reviewRequired
                                ? "#b91c1c"
                                : "#64748b",
                              fontSize: 12,
                              fontWeight: 900,
                              textTransform: "uppercase",
                            }}
                          >
                            {event.status.replaceAll(
                              "_",
                              " "
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          color: "#475569",
                        }}
                      >
                        {event.description}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#0f172a",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        Recommended action:{" "}
                        {event.recommendedAction}
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          color: "#94a3b8",
                          fontSize: 12,
                        }}
                      >
                        {new Date(
                          event.detectedAt
                        ).toLocaleString()}{" "}
                        - Provider: {event.provider}
                      </div>

                      {event.reviewedAt ? (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 12,
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <div
                            style={{
                              color: "#166534",
                              fontWeight: 900,
                            }}
                          >
                            Reviewed
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              color: "#475569",
                              fontSize: 13,
                            }}
                          >
                            {new Date(
                              event.reviewedAt
                            ).toLocaleString()}
                          </div>

                          {event.reviewNote ? (
                            <div
                              style={{
                                marginTop: 7,
                                color: "#334155",
                                fontSize: 13,
                              }}
                            >
                              Note: {event.reviewNote}
                            </div>
                          ) : null}

                          {event.incidentId ? (
                            <a
                              href={`/incidents/${event.incidentId}`}
                              style={{
                                display: "inline-block",
                                marginTop: 9,
                                color: "#2563eb",
                                fontWeight: 900,
                                textDecoration: "none",
                              }}
                            >
                              View linked incident
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => beginReview(event)}
                          disabled={
                            savingReview &&
                            reviewingEventId === event.id
                          }
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            border: "0",
                            background: event.reviewedAt
                              ? "#475569"
                              : "#7c3aed",
                            color: "#ffffff",
                            fontWeight: 900,
                            cursor: savingReview
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          {event.reviewedAt
                            ? "Update Review"
                            : "Review Event"}
                        </button>

                        {event.incidentId ? (
                          <a
                            href={`/incidents/${event.incidentId}`}
                            style={{
                              padding: "9px 12px",
                              borderRadius: 10,
                              border: "1px solid #bfdbfe",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontWeight: 900,
                              textDecoration: "none",
                            }}
                          >
                            Open Incident
                          </a>
                        ) : null}
                      </div>

                      {reviewingEventId === event.id ? (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 14,
                            borderRadius: 14,
                            background: "#ffffff",
                            border: "1px solid #ddd6fe",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              marginBottom: 10,
                            }}
                          >
                            Review Vision Event
                          </div>

                          <label
                            style={{
                              display: "grid",
                              gap: 6,
                              color: "#334155",
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            Link an existing incident
                            <select
                              value={selectedIncidentId}
                              onChange={(changeEvent) =>
                                setSelectedIncidentId(
                                  changeEvent.target.value
                                )
                              }
                              disabled={savingReview}
                              style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                            >
                              <option value="">
                                No incident link
                              </option>

                              {openIncidents.map((incident) => (
                                <option
                                  key={incident.id}
                                  value={incident.id}
                                >
                                  {incident.incident_code} -{" "}
                                  {incident.summary}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label
                            style={{
                              display: "grid",
                              gap: 6,
                              marginTop: 10,
                              color: "#334155",
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            Review note
                            <textarea
                              value={reviewNote}
                              onChange={(changeEvent) =>
                                setReviewNote(
                                  changeEvent.target.value
                                )
                              }
                              disabled={savingReview}
                              rows={3}
                              placeholder="Record the operator's findings or action taken."
                              style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                resize: "vertical",
                                fontFamily: "inherit",
                              }}
                            />
                          </label>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              marginTop: 12,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                saveVisionReview(event.id)
                              }
                              disabled={savingReview}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 10,
                                border: "0",
                                background: "#16a34a",
                                color: "#ffffff",
                                fontWeight: 900,
                                cursor: savingReview
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                            >
                              {savingReview
                                ? "Saving..."
                                : "Save Review"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelReview}
                              disabled={savingReview}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#334155",
                                fontWeight: 900,
                                cursor: savingReview
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
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
                        {camera.nickname ? ` / ${camera.nickname}` : ""} Ã‚Â· {camera.vendor}
                      </div>
                    </div>

                    <div style={{ color: statusColor(camera.status), fontWeight: 900 }}>
                      {camera.status.toUpperCase()} Ã‚Â· {camera.recording ? "REC" : "NOT RECORDING"}
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

