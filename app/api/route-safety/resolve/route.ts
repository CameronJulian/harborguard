import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

/*
 * Customer Increment #7
 * ---------------------
 * "No longer there" is intentionally separate from /verify.
 *
 * /verify means the driver confirms the hazard still exists.
 * /resolve means the live hazard is no longer present.
 *
 * Resolution preserves the route_safety_alerts row for audit/history,
 * removes it from active queries through status="resolved", and does not
 * manufacture positive route intelligence.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const body = await req.json();

    const alertId =
      typeof body?.alertId === "string"
        ? body.alertId.trim()
        : "";

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required." },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabase
        .from("route_safety_alerts")
        .update({
          status: "resolved",
        })
        .eq(
          "organization_id",
          organizationId
        )
        .eq("id", alertId)
        .eq("status", "active")
        .select("*")
        .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Active route safety alert not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: data,
      historicalIntelligenceChanged: false,
      roadRiskAggregated: false,
    });
  }
  catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unauthorized",
      },
      { status: 401 }
    );
  }
}