import { NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";

type AlertReviewOutcome =
  | "confirmed"
  | "false_positive"
  | "inconclusive";

const VALID_REVIEW_OUTCOMES = new Set<AlertReviewOutcome>([
  "confirmed",
  "false_positive",
  "inconclusive",
]);

type ResolveAlertBody = {
  alertId?: string;
  resolutionNotes?: string;
  reviewOutcome?: AlertReviewOutcome;
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator", "manager"]);

    const body = (await req.json()) as ResolveAlertBody;

    const alertId = body.alertId;
    const resolutionNotes =
      body.resolutionNotes?.trim() || "Resolved by operations team.";
    const reviewOutcome = body.reviewOutcome;

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required." },
        { status: 400 }
      );
    }

    if (
      !reviewOutcome ||
      !VALID_REVIEW_OUTCOMES.has(reviewOutcome)
    ) {
      return NextResponse.json(
        {
          error:
            "reviewOutcome must be confirmed, false_positive, or inconclusive.",
        },
        { status: 400 }
      );
    }

    const { data: alert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .select("id, vehicle_id, is_resolved, organization_id")
      .eq("id", alertId)
      .eq("organization_id", organizationId)
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
        review_outcome: reviewOutcome,
      })
      .eq("id", alertId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const { error: timelineError } = await supabase
      .from("emergency_response_events")
      .insert({
        vehicle_alert_id: alertId,
        event_type: "resolved",
        note: resolutionNotes,
        created_by: null,
      });

    if (timelineError) {
      console.error("Emergency response timeline resolve insert failed:", timelineError);
      return NextResponse.json(
        { error: timelineError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alert resolved successfully.",
    });
  } catch (err: any) {
    const message = err.message || "Failed to resolve alert.";
    const status =
      message === "Unauthorized" ? 401 :
      message === "Permission denied" ? 403 :
      500;

    return NextResponse.json({ error: message }, { status });
  }
}


