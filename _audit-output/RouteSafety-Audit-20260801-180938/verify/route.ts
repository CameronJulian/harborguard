import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();

    if (!body.alertId) {
      return NextResponse.json(
        { error: "alertId is required." },
        { status: 400 }
      );
    }

    const verifiedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("route_safety_alerts")
      .update({
        verification_status: "verified",
        verified_at: verifiedAt,
      })
      .eq("organization_id", organizationId)
      .eq("id", body.alertId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const {
      data: routeIntelligence,
      error: intelligenceError,
    } = await supabase
      .from("route_intelligence")
      .upsert(
        {
          organization_id: organizationId,
          source: "route_safety",
          source_record_id: String(data.id),
          event_type: data.type,
          severity: data.severity || null,
          confidence: null,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          road_name: null,
          route_segment: null,
          weather_risk: null,
          traffic_risk: null,
          verified: true,
          verification_count: 1,
          metadata: {
            title: data.title,
            description: data.description || null,
            providerSource: data.source || null,
            radiusMeters: data.radius_meters || null,
            verificationStatus: "verified",
            verifiedAt,
            expiresAt: data.expires_at || null,
            suggestedRoute: data.suggested_route || null,
          },
          updated_at: verifiedAt,
        },
        {
          onConflict: "organization_id,source,source_record_id",
        }
      )
      .select("id")
      .single();

    if (intelligenceError) {
      console.error(
        "[Route Safety Verification] Failed to store historical intelligence:",
        intelligenceError.message
      );

      return NextResponse.json(
        {
          error:
            "The alert was verified, but its historical intelligence record could not be stored.",
          alert: data,
        },
        { status: 500 }
      );
    }
    const { error: aggregationError } = await supabase.rpc(
      "aggregate_road_risk_intelligence",
      {
        p_organization_id: organizationId,
        p_route_intelligence_id: routeIntelligence.id,
        p_event_type: data.type,
        p_latitude: Number(data.latitude),
        p_longitude: Number(data.longitude),
        p_event_at: verifiedAt,
      }
    );

    if (aggregationError) {
      console.error(
        "[Route Safety Verification] Failed to aggregate road risk intelligence:",
        aggregationError.message
      );

      return NextResponse.json(
        {
          error:
            "The alert was verified and stored historically, but road-risk aggregation failed.",
          alert: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: data,
      historicalIntelligenceStored: true,
      roadRiskAggregated: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
