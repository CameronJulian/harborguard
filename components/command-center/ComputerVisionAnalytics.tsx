"use client";

import {
  useState,
  type ChangeEvent,
} from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type VisionEvent = {
  id: string;
  vehicleId: string | null;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  eventType: string;
  severity: string;
  confidence: number;
  status: string;
  detectedAt: string;
  description: string;
  recommendedAction: string;
  provider?: string | null;
};

type VisionAnalysisResponse = {
  success?: boolean;
  provider?: string;
  detections?: Array<{
    label: string;
    confidence: number;
    severity: string;
    description: string;
    recommendedAction: string;
  }>;
  error?: string;
};

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function severityColor(severity: string) {
  if (severity === "high") return "#dc2626";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

function formatEventType(type: string) {
  return type.replaceAll("_", " ");
}

export default function ComputerVisionAnalytics() {
  const [events, setEvents] = useState<VisionEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);

  const [message, setMessage] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");

  const [cameraName, setCameraName] = useState(
    "Command Center Camera"
  );

  const [vehicleName, setVehicleName] = useState("");

  const [frameDataUrl, setFrameDataUrl] =
    useState<string | null>(null);

  const [frameName, setFrameName] = useState("");

  async function loadVision() {
    try {
      setMessage("");

      const response = await fetchWithAuth(
        "/api/command-center/computer-vision",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Failed to load computer vision analytics."
        );
        return;
      }

      setSummary(result.summary);
      setEvents(result.events || []);
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load computer vision analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFrameSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setAnalysisMessage("");

    if (!file) {
      setFrameDataUrl(null);
      setFrameName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFrameDataUrl(null);
      setFrameName("");
      setAnalysisMessage(
        "Please choose a valid image file."
      );
      event.currentTarget.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFrameDataUrl(null);
      setFrameName("");
      setAnalysisMessage(
        "The selected image is larger than 8 MB."
      );
      event.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");

      if (!result.startsWith("data:image/")) {
        setAnalysisMessage(
          "The selected file could not be read as an image."
        );
        return;
      }

      setFrameDataUrl(result);
      setFrameName(file.name);
    };

    reader.onerror = () => {
      setFrameDataUrl(null);
      setFrameName("");
      setAnalysisMessage(
        "Failed to read the selected image."
      );
    };

    reader.readAsDataURL(file);
  }

  async function analyseSelectedFrame() {
    if (!frameDataUrl) {
      setAnalysisMessage(
        "Choose an image before starting analysis."
      );
      return;
    }

    if (!cameraName.trim()) {
      setAnalysisMessage(
        "Enter a camera name before starting analysis."
      );
      return;
    }

    try {
      setAnalysing(true);
      setAnalysisMessage("Analyzing image with AI...");

      const response = await fetchWithAuth(
        "/api/command-center/computer-vision",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cameraName: cameraName.trim(),
            vehicleName:
              vehicleName.trim() || "Unassigned vehicle",
            frameBase64: frameDataUrl,
          }),
        }
      );

      const result =
        (await response.json()) as VisionAnalysisResponse;

      if (!response.ok) {
        setAnalysisMessage(
          result.error || "Computer vision analysis failed."
        );
        return;
      }

      const detectionCount =
        result.detections?.length || 0;

      setAnalysisMessage(
        `${detectionCount} detection${
          detectionCount === 1 ? "" : "s"
        } saved using ${result.provider || "the active provider"}.`
      );

      await loadVision();
    } catch (error: unknown) {
      setAnalysisMessage(
        error instanceof Error
          ? error.message
          : "Computer vision analysis failed."
      );
    } finally {
      setAnalysing(false);
    }
  }

  useRealtimeRefresh({
    tables: ["vision_events"],
    refresh: loadVision,
    pollingMs: 30000,
  });

  return (
    <section
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow:
          "0 12px 32px rgba(15, 23, 42, 0.08)",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              color: "#7c3aed",
              fontSize: 13,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            COMPUTER VISION ANALYTICS
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Camera AI Review Queue
          </h2>

          <div
            style={{
              color: "#64748b",
              marginTop: 6,
            }}
          >
            Submit real dashcam, CCTV, fleet, or road-safety
            images for AI analysis.
          </div>
        </div>

        <button
          type="button"
          onClick={loadVision}
          disabled={loading}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#7c3aed",
            color: "#ffffff",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.65 : 1,
          }}
        >
          Refresh Vision
        </button>
      </div>

      <div
        style={{
          background: "#faf5ff",
          border: "1px solid #ddd6fe",
          borderRadius: 18,
          marginBottom: 20,
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          Analyze a Camera Frame
        </div>

        <div
          style={{
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          The selected image will be sent to the configured
          vision provider and detections will be stored in the
          vision event history.
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 6,
              color: "#334155",
              fontWeight: 800,
            }}
          >
            Camera name
            <input
              value={cameraName}
              onChange={(event) =>
                setCameraName(event.target.value)
              }
              disabled={analysing}
              placeholder="Example: Depot Gate Camera 1"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                font: "inherit",
                padding: "11px 12px",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 6,
              color: "#334155",
              fontWeight: 800,
            }}
          >
            Vehicle name
            <input
              value={vehicleName}
              onChange={(event) =>
                setVehicleName(event.target.value)
              }
              disabled={analysing}
              placeholder="Optional vehicle name"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                font: "inherit",
                padding: "11px 12px",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 6,
              color: "#334155",
              fontWeight: 800,
            }}
          >
            Camera image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFrameSelection}
              disabled={analysing}
            />
          </label>
        </div>

        {frameName ? (
          <div
            style={{
              color: "#6d28d9",
              fontSize: 13,
              fontWeight: 800,
              marginTop: 14,
            }}
          >
            Selected image: {frameName}
          </div>
        ) : null}

        {frameDataUrl ? (
          <div style={{ marginTop: 14 }}>
            <img
              src={frameDataUrl}
              alt="Selected vision frame"
              style={{
                border: "1px solid #ddd6fe",
                borderRadius: 14,
                display: "block",
                maxHeight: 280,
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={analyseSelectedFrame}
            disabled={
              analysing ||
              !frameDataUrl ||
              !cameraName.trim()
            }
            style={{
              background: "#7c3aed",
              border: "0",
              borderRadius: 12,
              color: "#ffffff",
              cursor:
                analysing ||
                !frameDataUrl ||
                !cameraName.trim()
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 900,
              opacity:
                analysing ||
                !frameDataUrl ||
                !cameraName.trim()
                  ? 0.6
                  : 1,
              padding: "11px 16px",
            }}
          >
            {analysing
              ? "Analyzing Frame..."
              : "Analyze Frame"}
          </button>

          {frameDataUrl ? (
            <button
              type="button"
              disabled={analysing}
              onClick={() => {
                setFrameDataUrl(null);
                setFrameName("");
                setAnalysisMessage("");
              }}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                color: "#334155",
                cursor: analysing
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 800,
                padding: "10px 14px",
              }}
            >
              Clear Image
            </button>
          ) : null}
        </div>

        {analysisMessage ? (
          <div
            style={{
              color: analysisMessage
                .toLowerCase()
                .includes("failed")
                ? "#dc2626"
                : "#475569",
              fontWeight: 700,
              marginTop: 14,
            }}
          >
            {analysisMessage}
          </div>
        ) : null}
      </div>

      {message ? (
        <div
          style={{
            color: "#dc2626",
            marginBottom: 14,
          }}
        >
          {message}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: "#64748b" }}>
          Loading computer vision analytics...
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              [
                "Analysed Cameras",
                summary?.analysedCameras || 0,
              ],
              [
                "Vision Events",
                summary?.visionEvents || 0,
              ],
              [
                "Review Required",
                summary?.reviewRequired || 0,
              ],
              [
                "High Confidence",
                summary?.highConfidence || 0,
              ],
              [
                "Avg Confidence",
                `${summary?.averageConfidence || 0}%`,
              ],
              [
                "Provider",
                summary?.providerStatus?.provider ||
                  summary?.provider ||
                  "mock",
              ],
              [
                "Vision Model",
                summary?.providerStatus?.model ||
                  "Not applicable",
              ],
              [
                "Provider Service",
                summary?.providerStatus?.serviceAvailable
                  ? "Available"
                  : "Unavailable",
              ],
              [
                "Model Installed",
                summary?.providerStatus?.modelInstalled === null ||
                summary?.providerStatus?.modelInstalled === undefined
                  ? "Not applicable"
                  : summary.providerStatus.modelInstalled
                  ? "Yes"
                  : "No",
              ],
              [
                "Model State",
                summary?.providerStatus?.modelLoaded === null ||
                summary?.providerStatus?.modelLoaded === undefined
                  ? "Not applicable"
                  : summary.providerStatus.modelLoaded
                  ? "Loaded"
                  : "On demand",
              ],
              [
                "Execution",
                summary?.providerStatus?.execution ||
                  "Unknown",
              ],
              ["Storage", "Persisted DB"],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize:
                      String(value).length > 14
                        ? 22
                        : 30,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    marginTop: 4,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                  title={String(value)}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {summary?.providerStatus?.message ? (
            <div
              style={{
                padding: 14,
                marginBottom: 18,
                borderRadius: 14,
                background:
                  summary.providerStatus.serviceAvailable
                    ? "#ecfdf5"
                    : "#fef2f2",
                border:
                  summary.providerStatus.serviceAvailable
                    ? "1px solid #a7f3d0"
                    : "1px solid #fecaca",
                color:
                  summary.providerStatus.serviceAvailable
                    ? "#166534"
                    : "#b91c1c",
                fontWeight: 800,
              }}
            >
              Vision provider status:{" "}
              {summary.providerStatus.message}
            </div>
          ) : null}
          {events.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No computer vision events detected yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>
                        {formatEventType(event.eventType)}
                      </strong>

                      <div
                        style={{
                          color: "#64748b",
                          marginTop: 4,
                        }}
                      >
                        {event.vehicleName}
                        {event.nickname
                          ? ` / ${event.nickname}`
                          : ""}{" "}
                        - {event.cameraName}
                      </div>
                    </div>

                    <div
                      style={{
                        color: severityColor(
                          event.severity
                        ),
                        fontWeight: 900,
                      }}
                    >
                      {event.severity.toUpperCase()} -{" "}
                      {event.confidence}% confidence
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#475569",
                      marginTop: 10,
                    }}
                  >
                    {event.description}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#0f172a",
                      fontWeight: 800,
                    }}
                  >
                    Recommended action:{" "}
                    {event.recommendedAction}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    Detected:{" "}
                    {new Date(
                      event.detectedAt
                    ).toLocaleString()}{" "}
                    - Status:{" "}
                    {event.status.replaceAll("_", " ")}
                    {event.provider
                      ? ` - Provider: ${event.provider}`
                      : ""}
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

