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

    let evaluationsQuery = supabase
      .from("route_prediction_evaluations")
      .select("classification")
      .eq("organization_id", organizationId);

    if (vehicleId) {
      evaluationsQuery =
        evaluationsQuery.eq("vehicle_id", vehicleId);
    }

    if (start) {
      evaluationsQuery =
        evaluationsQuery.gte(
          "outcome_completed_at",
          start
        );
    }

    if (end) {
      evaluationsQuery =
        evaluationsQuery.lte(
          "outcome_completed_at",
          end
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
