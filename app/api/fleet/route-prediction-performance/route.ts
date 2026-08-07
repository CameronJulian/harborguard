import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  calculateRoutePredictionPerformance,
  type RoutePredictionEvaluation,
} from "@/lib/fleet/calculateRoutePredictionPerformance";

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { searchParams } = new URL(req.url);

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
      parsedStart.getTime() > parsedEnd.getTime()
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

    let evaluationsQuery = supabase
      .from("route_prediction_evaluations")
      .select("classification")
      .eq("organization_id", organizationId);

    if (vehicleId) {
      evaluationsQuery =
        evaluationsQuery.eq("vehicle_id", vehicleId);
    }

    if (parsedStart) {
      evaluationsQuery =
        evaluationsQuery.gte(
          "outcome_completed_at",
          parsedStart.toISOString()
        );
    }

    if (parsedEnd) {
      evaluationsQuery =
        evaluationsQuery.lte(
          "outcome_completed_at",
          parsedEnd.toISOString()
        );
    }

    const { data, error } =
      await evaluationsQuery;

    if (error) {
      throw error;
    }

    const evaluations =
      (data || []) as RoutePredictionEvaluation[];

    const performance =
      calculateRoutePredictionPerformance(evaluations);

    return NextResponse.json({
      success: true,
      performance,
    });
  } catch (error: unknown) {
    console.error(
      "Route prediction performance error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load route prediction performance.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized" ? 401 : 500,
      }
    );
  }
}
