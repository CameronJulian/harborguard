import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  calculateRoutePredictionPerformance,
  type RoutePredictionEvaluation,
} from "@/lib/fleet/calculateRoutePredictionPerformance";

export async function GET() {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { data, error } = await supabase
      .from("route_prediction_evaluations")
      .select("classification")
      .eq("organization_id", organizationId);

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
