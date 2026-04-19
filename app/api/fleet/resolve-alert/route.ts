import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ResolveAlertBody = {
  alertId?: string;
  resolutionNotes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResolveAlertBody;

    const alertId = body.alertId;
    const resolutionNotes =
      body.resolutionNotes?.trim() || "Resolved by operations team.";

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required." },
        { status: 400 }
      );
    }

    const { data: alert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .select("id, vehicle_id, is_resolved")
      .eq("id", alertId)
      .single();

    if (alertError || !alert) {
      return NextResponse.json(
        { error: alertError?.message || "Alert not found." },
        { status: 404 }
      );
    }

    if (alert.is_resolved) {
      return NextResponse.json({
        success: true,
        message: "Alert was already resolved.",
      });
    }

    const { error: updateError } = await supabase
      .from("vehicle_alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
      })
      .eq("id", alertId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alert resolved successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve alert." },
      { status: 500 }
    );
  }
}