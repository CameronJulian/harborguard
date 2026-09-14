import { NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } =
      await requireOrganization();

    requireRole(role, [
      "owner",
      "admin",
      "operator",
      "manager",
    ]);

    const contentType =
      req.headers.get("content-type") || "";

    const mediaType =
      contentType
        .split(";", 1)[0]
        .trim()
        .toLowerCase();

    if (mediaType !== "application/json") {
      return NextResponse.json(
        {
          error:
            "Content-Type application/json is required.",
        },
        {
          status: 415,
        }
      );
    }

    const { alertId } = await req.json();

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId required" },
        { status: 400 }
      );
    }

    const { data: ownedAlert, error: alertLookupError } =
      await supabase
        .from("vehicle_alerts")
        .select("id")
        .eq("id", alertId)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (alertLookupError) {
      console.error(
        "ACKNOWLEDGE ALERT OWNERSHIP LOOKUP ERROR:",
        alertLookupError
      );

      return NextResponse.json(
        { error: "Unable to verify alert ownership." },
        { status: 500 }
      );
    }

    if (!ownedAlert) {
      return NextResponse.json(
        { error: "Alert not found." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("emergency_response_events")
      .insert({
        vehicle_alert_id: alertId,
        event_type: "acknowledged",
        note: "Alert acknowledged by operator.",

      });

    if (error) {
      console.error("ACKNOWLEDGE ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


