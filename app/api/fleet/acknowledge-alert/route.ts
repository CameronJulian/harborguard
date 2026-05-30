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

    const { alertId } = await req.json();

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId required" },
        { status: 400 }
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


