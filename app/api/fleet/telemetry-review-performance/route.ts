import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  calculateTelemetryAlertReviewPerformance,
  TELEMETRY_ALERT_TYPES,
  type TelemetryAlertReviewEvaluation,
} from "@/lib/fleet/calculateTelemetryAlertReviewPerformance";

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { searchParams } =
      new URL(req.url);

    const vehicleId =
      searchParams.get("vehicleId");

    const start =
      searchParams.get("start");

    const end =
      searchParams.get("end");

    const parsedStart =
      start ? new Date(start) : null;

    const parsedEnd =
      end ? new Date(end) : null;

    if (
      parsedStart &&
      Number.isNaN(parsedStart.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid start date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      parsedEnd &&
      Number.isNaN(parsedEnd.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid end date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      parsedStart &&
      parsedEnd &&
      parsedStart.getTime() >
        parsedEnd.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "start must be earlier than or equal to end.",
        },
        {
          status: 400,
        }
      );
    }

    let query = supabase
      .from("vehicle_alerts")
      .select(
        "alert_type, review_outcome"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .in(
        "alert_type",
        TELEMETRY_ALERT_TYPES
      )
      .not(
        "review_outcome",
        "is",
        null
      );

    if (vehicleId) {
      query =
        query.eq(
          "vehicle_id",
          vehicleId
        );
    }

    if (parsedStart) {
      query =
        query.gte(
          "resolved_at",
          parsedStart.toISOString()
        );
    }

    if (parsedEnd) {
      query =
        query.lte(
          "resolved_at",
          parsedEnd.toISOString()
        );
    }

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    const evaluations =
      (data || []) as
        TelemetryAlertReviewEvaluation[];

    const performance =
      calculateTelemetryAlertReviewPerformance(
        evaluations
      );

    return NextResponse.json({
      success: true,
      performance,
    });
  } catch (error: unknown) {
    console.error(
      "Telemetry alert review performance error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load telemetry alert review performance.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}
