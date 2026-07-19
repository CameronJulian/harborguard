import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

type ReviewRequest = {
  visionEventId?: unknown;
  incidentId?: unknown;
  reviewNote?: unknown;
  status?: unknown;
};

const ALLOWED_STATUSES = new Set([
  "reviewed",
  "review_required",
  "monitoring",
]);

function optionalTrimmedString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed || null;
}

export async function POST(req: Request) {
  try {
    const {
      supabase,
      organizationId,
      user,
    } = await requireOrganization();

    const body = (await req.json()) as ReviewRequest;

    const visionEventId =
      optionalTrimmedString(body.visionEventId);

    const incidentId =
      optionalTrimmedString(body.incidentId);

    const reviewNote =
      optionalTrimmedString(body.reviewNote);

    const requestedStatus =
      optionalTrimmedString(body.status) ||
      "reviewed";

    if (!visionEventId) {
      return NextResponse.json(
        { error: "visionEventId is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.has(requestedStatus)) {
      return NextResponse.json(
        {
          error:
            "status must be reviewed, review_required, or monitoring.",
        },
        { status: 400 }
      );
    }

    const {
      data: existingEvent,
      error: eventLookupError,
    } = await supabase
      .from("vision_events")
      .select(`
        id,
        organization_id,
        incident_id,
        status,
        reviewed_at,
        reviewed_by,
        review_note
      `)
      .eq("id", visionEventId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (eventLookupError) {
      throw eventLookupError;
    }

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Vision event not found." },
        { status: 404 }
      );
    }

    if (incidentId) {
      const {
        data: incident,
        error: incidentLookupError,
      } = await supabase
        .from("incidents")
        .select("id, incident_code")
        .eq("id", incidentId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (incidentLookupError) {
        throw incidentLookupError;
      }

      if (!incident) {
        return NextResponse.json(
          {
            error:
              "The selected incident was not found in this organization.",
          },
          { status: 404 }
        );
      }
    }

    const reviewedAt =
      requestedStatus === "reviewed"
        ? new Date().toISOString()
        : null;

    const reviewedBy =
      requestedStatus === "reviewed"
        ? user.id
        : null;

    const {
      data: updatedEvent,
      error: updateError,
    } = await supabase
      .from("vision_events")
      .update({
        status: requestedStatus,
        incident_id: incidentId,
        reviewed_at: reviewedAt,
        reviewed_by: reviewedBy,
        review_note: reviewNote,
      })
      .eq("id", visionEventId)
      .eq("organization_id", organizationId)
      .select(`
        id,
        vehicle_id,
        vehicle_name,
        camera_name,
        provider,
        event_type,
        severity,
        confidence,
        status,
        description,
        recommended_action,
        raw_response,
        detected_at,
        latitude,
        longitude,
        location_recorded_at,
        incident_id,
        reviewed_at,
        reviewed_by,
        review_note
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    if (requestedStatus === "reviewed") {
      const { error: intelligenceError } = await supabase
        .from("route_intelligence")
        .upsert(
          {
            organization_id: organizationId,
            source: "vision_event",
            source_record_id: updatedEvent.id,
            event_type: updatedEvent.event_type,
            severity: updatedEvent.severity,
            confidence: Number(updatedEvent.confidence || 0),
            latitude: updatedEvent.latitude,
            longitude: updatedEvent.longitude,
            verified: true,
            verification_count: 1,
            metadata: {
              vehicleId: updatedEvent.vehicle_id,
              vehicleName: updatedEvent.vehicle_name,
              cameraName: updatedEvent.camera_name,
              provider: updatedEvent.provider,
              description: updatedEvent.description,
              recommendedAction:
                updatedEvent.recommended_action,
              rawResponse: updatedEvent.raw_response,
              detectedAt: updatedEvent.detected_at,
              locationRecordedAt:
                updatedEvent.location_recorded_at,
              incidentId: updatedEvent.incident_id,
              reviewedAt: updatedEvent.reviewed_at,
              reviewedBy: updatedEvent.reviewed_by,
              reviewNote: updatedEvent.review_note,
            },
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "organization_id,source,source_record_id",
          }
        );

      if (intelligenceError) {
        throw intelligenceError;
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        vehicleId: updatedEvent.vehicle_id,
        vehicleName:
          updatedEvent.vehicle_name ||
          "Unknown vehicle",
        cameraName:
          updatedEvent.camera_name ||
          "Unknown camera",
        provider:
          updatedEvent.provider || "unknown",
        eventType:
          updatedEvent.event_type,
        severity:
          updatedEvent.severity,
        confidence:
          Number(updatedEvent.confidence || 0),
        status:
          updatedEvent.status,
        description:
          updatedEvent.description,
        recommendedAction:
          updatedEvent.recommended_action,
        detectedAt:
          updatedEvent.detected_at,
        incidentId:
          updatedEvent.incident_id,
        reviewedAt:
          updatedEvent.reviewed_at,
        reviewedBy:
          updatedEvent.reviewed_by,
        reviewNote:
          updatedEvent.review_note,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to review vision event.";

    const status =
      message === "Unauthorized"
        ? 401
        : message === "Organization not found."
        ? 403
        : message === "Subscription inactive"
        ? 403
        : 500;

    console.error(
      "[vision-events review POST]",
      message
    );

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}