import { NextResponse } from "next/server";

import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";

const DEFAULT_LATITUDE = -33.9249;
const DEFAULT_LONGITUDE = 18.4241;
const DEFAULT_RADIUS_METERS = 10000;

function parseCoordinate(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return null;
  }

  return parsed;
}

function parseRadius(value: string | null) {
  if (value === null || value.trim() === "") {
    return DEFAULT_RADIUS_METERS;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 100 ||
    parsed > 100000
  ) {
    return null;
  }

  return Math.round(parsed);
}

export async function GET(request: Request) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { searchParams } = new URL(request.url);

    const latitude = parseCoordinate(
      searchParams.get("latitude"),
      DEFAULT_LATITUDE,
      -90,
      90
    );

    const longitude = parseCoordinate(
      searchParams.get("longitude"),
      DEFAULT_LONGITUDE,
      -180,
      180
    );

    const radiusMeters = parseRadius(
      searchParams.get("radiusMeters")
    );

    if (
      latitude === null ||
      longitude === null ||
      radiusMeters === null
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid latitude, longitude, or radiusMeters.",
        },
        { status: 400 }
      );
    }

    const trafficResult: any =
      await buildTrafficIntelligence(
        supabase,
        organizationId,
        {
          latitude,
          longitude,
          radiusMeters,
        }
      );

    const flow = Array.isArray(trafficResult?.flow)
      ? trafficResult.flow
      : [];

    const serviceSummary =
      trafficResult?.summary || {};

    const averageCongestion =
      serviceSummary.averageCongestion ??
      (flow.length > 0
        ? Math.round(
            flow.reduce(
              (sum: number, item: any) =>
                sum +
                Number(item.congestion || 0),
              0
            ) / flow.length
          )
        : 0);

    const averageDelay =
      serviceSummary.averageDelay ??
      (flow.length > 0
        ? Math.round(
            flow.reduce(
              (sum: number, item: any) =>
                sum +
                Number(item.delayMinutes || 0),
              0
            ) / flow.length
          )
        : 0);

    return NextResponse.json({
      success: true,

      summary: {
        ...serviceSummary,

        corridors:
          serviceSummary.corridors ??
          flow.length,

        critical:
          serviceSummary.critical ??
          flow.filter(
            (item: any) =>
              item.riskLevel === "critical"
          ).length,

        high:
          serviceSummary.high ??
          flow.filter(
            (item: any) =>
              item.riskLevel === "high"
          ).length,

        averageCongestion,
        averageDelay,

        rawCount:
          serviceSummary.rawCount ??
          trafficResult?.rawCount ??
          flow.length,

        latitude,
        longitude,
        radiusMeters,
      },

      flow,

      incidents:
        trafficResult?.incidents || [],

      generatedAt:
        trafficResult?.generatedAt ||
        new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load traffic intelligence.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}
