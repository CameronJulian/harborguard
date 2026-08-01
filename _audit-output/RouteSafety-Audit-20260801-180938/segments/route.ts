import { NextRequest, NextResponse } from "next/server";

import { requireOrganization } from "@/lib/server-auth";

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;

function parseNumber(
  value: string | null,
  fallback: number
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { searchParams } = new URL(req.url);

    const minimumRisk = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          parseNumber(searchParams.get("minimumRisk"), 1)
        )
      )
    );

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Math.round(
          parseNumber(
            searchParams.get("limit"),
            DEFAULT_LIMIT
          )
        )
      )
    );

    const { data, error } = await supabase
      .from("road_risk_segments")
      .select(
        [
          "id",
          "road_name",
          "route_segment",
          "segment_key",
          "latitude",
          "longitude",
          "radius_meters",
          "risk_score",
          "collision_count",
          "crime_count",
          "roadblock_count",
          "traffic_signal_count",
          "other_event_count",
          "road_closure_count",
          "roadworks_count",
          "congestion_count",
          "lane_closure_count",
          "weather_hazard_count",
          "flooding_count",
          "vehicle_breakdown_count",
          "road_hazard_count",
          "protest_count",
          "verification_count",
          "last_event_at",
          "updated_at",
        ].join(",")
      )
      .eq("organization_id", organizationId)
      .gte("risk_score", minimumRisk)
      .order("risk_score", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      segments: data || [],
      count: data?.length || 0,
      minimumRisk,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load road risk segments.",
      },
      { status: 401 }
    );
  }
}
