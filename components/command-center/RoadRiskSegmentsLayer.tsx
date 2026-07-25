"use client";

import { useEffect, useState } from "react";
import { Circle, Popup } from "react-leaflet";

import { fetchWithAuth } from "@/lib/auth-fetch";

type RoadRiskSegment = {
  id: string;
  road_name?: string | null;
  route_segment?: string | null;
  segment_key?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  risk_score: number;
  collision_count: number;
  crime_count: number;
  roadblock_count: number;
  traffic_signal_count: number;
  other_event_count: number;
  verification_count: number;
  last_event_at?: string | null;
  updated_at?: string | null;
};

type RoadRiskSegmentsLayerProps = {
  enabled?: boolean;
  minimumRisk?: number;
};

function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function riskColor(riskScore: number) {
  if (riskScore >= 81) return "#991b1b";
  if (riskScore >= 61) return "#dc2626";
  if (riskScore >= 41) return "#ea580c";
  if (riskScore >= 21) return "#ca8a04";

  return "#16a34a";
}

function formatLabel(value?: string | null) {
  if (!value) return null;

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) return "No recent event recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export default function RoadRiskSegmentsLayer({
  enabled = true,
  minimumRisk = 1,
}: RoadRiskSegmentsLayerProps) {
  const [segments, setSegments] = useState<
    RoadRiskSegment[]
  >([]);
  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!enabled) {
      setSegments([]);
      return;
    }

    const controller = new AbortController();

    async function loadSegments() {
      try {
        setError(null);

        const response = await fetchWithAuth(
          `/api/route-safety/segments?minimumRisk=${minimumRisk}&limit=250`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to load road risk segments."
          );
        }

        setSegments(result.segments || []);
      } catch (loadError: any) {
        if (loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError.message ||
            "Failed to load road risk segments."
        );
      }
    }

    loadSegments();

    return () => controller.abort();
  }, [enabled, minimumRisk]);

  if (!enabled) return null;

  return (
    <>
      {segments
        .filter((segment) =>
          isValidCoordinate(
            segment.latitude,
            segment.longitude
          )
        )
        .map((segment) => {
          const riskScore = Number(
            segment.risk_score || 0
          );

          const color = riskColor(riskScore);

          return (
            <Circle
              key={segment.id}
              center={[
                Number(segment.latitude),
                Number(segment.longitude),
              ]}
              radius={Math.max(
                25,
                Number(segment.radius_meters || 100)
              )}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.2,
                opacity: 0.9,
                weight:
                  riskScore >= 80
                    ? 4
                    : riskScore >= 50
                      ? 3
                      : 2,
              }}
            >
              <Popup>
                <div style={{ minWidth: 240 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    {segment.road_name ||
                      formatLabel(
                        segment.route_segment
                      ) ||
                      "Road Risk Segment"}
                  </div>

                  {segment.route_segment ? (
                    <div style={{ marginBottom: 8 }}>
                      {formatLabel(
                        segment.route_segment
                      )}
                    </div>
                  ) : null}

                  <div>
                    <strong>Risk score:</strong>{" "}
                    {riskScore}/100
                  </div>

                  <div>
                    <strong>Crime events:</strong>{" "}
                    {segment.crime_count || 0}
                  </div>

                  <div>
                    <strong>Collisions:</strong>{" "}
                    {segment.collision_count || 0}
                  </div>

                  <div>
                    <strong>Roadblocks:</strong>{" "}
                    {segment.roadblock_count || 0}
                  </div>

                  <div>
                    <strong>Traffic signals:</strong>{" "}
                    {segment.traffic_signal_count || 0}
                  </div>

                  <div>
                    <strong>Other events:</strong>{" "}
                    {segment.other_event_count || 0}
                  </div>

                  <div>
                    <strong>Verifications:</strong>{" "}
                    {segment.verification_count || 0}
                  </div>

                  <div>
                    <strong>Risk radius:</strong>{" "}
                    {segment.radius_meters || 100}m
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <strong>Last event:</strong>
                    <br />
                    {formatDate(segment.last_event_at)}
                  </div>

                  {error ? (
                    <div
                      style={{
                        color: "#dc2626",
                        marginTop: 8,
                      }}
                    >
                      {error}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Circle>
          );
        })}
    </>
  );
}
