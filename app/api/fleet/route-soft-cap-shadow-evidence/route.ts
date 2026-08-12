import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  analyzeRouteSoftCapShadowEvidence,
  type RouteSoftCapShadowEvidenceEvaluation,
} from "@/lib/fleet/analyzeRouteSoftCapShadowEvidence";

type RouteSoftCapShadowEvidenceRow = {
  classification: unknown;
  metadata: unknown;
  outcome_completed_at: unknown;
};

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
      .select("classification, metadata, outcome_completed_at")
      .eq("organization_id", organizationId);

    if (vehicleId) {
      evaluationsQuery =
        evaluationsQuery.eq(
          "vehicle_id",
          vehicleId
        );
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

    const rows =
      (data || []) as RouteSoftCapShadowEvidenceRow[];

    const evaluations:
      RouteSoftCapShadowEvidenceEvaluation[] =
      rows.map((row) => ({
        classification: row.classification,
        metadata: row.metadata,
        outcomeCompletedAt:
          row.outcome_completed_at,
      }));

    const evidence =
      analyzeRouteSoftCapShadowEvidence(
        evaluations
      );

    return NextResponse.json({
      success: true,
      evidence,
    });
  } catch (error: unknown) {
    console.error(
      "Route soft-cap shadow evidence error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load route soft-cap shadow evidence.";

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
