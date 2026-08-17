import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  analyzeRouteRiskShadowModelHealth,
  type RouteRiskShadowModelHealthEvaluation,
} from "@/lib/fleet/analyzeRouteRiskShadowModelHealth";

import {
  assessRouteRiskShadowModelHealthEvidence,
} from "@/lib/fleet/assessRouteRiskShadowModelHealthEvidence";

type RouteRiskShadowModelHealthRow = {
  predicted_probability: unknown;
  observed_adverse_event: unknown;
};

function parseRequiredDate(
  value: string | null,
  fieldName: string
):
  | { ok: true; date: Date }
  | { ok: false; error: string } {
  if (!value) {
    return {
      ok: false,
      error: `${fieldName} is required.`,
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: `Invalid ${fieldName} date.`,
    };
  }

  return {
    ok: true,
    date,
  };
}

function parseRequiredIdentity(
  value: string | null,
  fieldName: string
):
  | { value: string; error: null }
  | { value: null; error: string } {
  const normalized = value?.trim() || "";

  if (!normalized) {
    return {
      value: null,
      error: `${fieldName} is required.`,
    };
  }

  return {
    value: normalized,
    error: null,
  };
}

function mapEvaluations(
  rows: RouteRiskShadowModelHealthRow[]
): RouteRiskShadowModelHealthEvaluation[] {
  return rows.map((row) => ({
    predictedProbability:
      row.predicted_probability,
    observedAdverseEvent:
      row.observed_adverse_event,
  }));
}

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { searchParams } = new URL(req.url);

    const modelRegistryId =
      parseRequiredIdentity(
        searchParams.get("modelRegistryId"),
        "modelRegistryId"
      );

    if (modelRegistryId.error) {
      return NextResponse.json(
        { error: modelRegistryId.error },
        { status: 400 }
      );
    }

    const trainingRunId =
      parseRequiredIdentity(
        searchParams.get("trainingRunId"),
        "trainingRunId"
      );

    if (trainingRunId.error) {
      return NextResponse.json(
        { error: trainingRunId.error },
        { status: 400 }
      );
    }

    const referenceStart =
      parseRequiredDate(
        searchParams.get("referenceStart"),
        "referenceStart"
      );

    if (!referenceStart.ok) {
      return NextResponse.json(
        { error: referenceStart.error },
        { status: 400 }
      );
    }

    const referenceEnd =
      parseRequiredDate(
        searchParams.get("referenceEnd"),
        "referenceEnd"
      );

    if (!referenceEnd.ok) {
      return NextResponse.json(
        { error: referenceEnd.error },
        { status: 400 }
      );
    }

    const recentStart =
      parseRequiredDate(
        searchParams.get("recentStart"),
        "recentStart"
      );

    if (!recentStart.ok) {
      return NextResponse.json(
        { error: recentStart.error },
        { status: 400 }
      );
    }

    const recentEnd =
      parseRequiredDate(
        searchParams.get("recentEnd"),
        "recentEnd"
      );

    if (!recentEnd.ok) {
      return NextResponse.json(
        { error: recentEnd.error },
        { status: 400 }
      );
    }

    if (
      referenceStart.date.getTime() >
      referenceEnd.date.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "referenceStart must be earlier than or equal to referenceEnd.",
        },
        { status: 400 }
      );
    }

    if (
      recentStart.date.getTime() >
      recentEnd.date.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "recentStart must be earlier than or equal to recentEnd.",
        },
        { status: 400 }
      );
    }

    if (
      referenceEnd.date.getTime() >
      recentStart.date.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "referenceEnd must be earlier than or equal to recentStart.",
        },
        { status: 400 }
      );
    }

    const readWindow = async (
      start: Date,
      end: Date
    ): Promise<
      RouteRiskShadowModelHealthEvaluation[]
    > => {
      const { data, error } =
        await supabase
          .from("route_risk_shadow_evaluations")
          .select(
            "predicted_probability, observed_adverse_event"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .eq(
            "model_registry_id",
            modelRegistryId.value
          )
          .eq(
            "training_run_id",
            trainingRunId.value
          )
          .gte(
            "outcome_completed_at",
            start.toISOString()
          )
          .lte(
            "outcome_completed_at",
            end.toISOString()
          )
          .order(
            "outcome_completed_at",
            { ascending: true }
          );

      if (error) {
        throw error;
      }

      return mapEvaluations(
        (data || []) as RouteRiskShadowModelHealthRow[]
      );
    };

    const [
      referenceEvaluations,
      recentEvaluations,
    ] = await Promise.all([
      readWindow(
        referenceStart.date,
        referenceEnd.date
      ),
      readWindow(
        recentStart.date,
        recentEnd.date
      ),
    ]);

    const modelHealth =
      analyzeRouteRiskShadowModelHealth({
        reference: referenceEvaluations,
        recent: recentEvaluations,
      });

    const evidenceAssessment =
      assessRouteRiskShadowModelHealthEvidence(
        modelHealth
      );

    return NextResponse.json({
      success: true,

      modelIdentity: {
        modelRegistryId:
          modelRegistryId.value,
        trainingRunId:
          trainingRunId.value,
      },

      windows: {
        reference: {
          start:
            referenceStart.date.toISOString(),
          end:
            referenceEnd.date.toISOString(),
        },

        recent: {
          start:
            recentStart.date.toISOString(),
          end:
            recentEnd.date.toISOString(),
        },
      },

      modelHealth,
      evidenceAssessment,
    });
  } catch (error: unknown) {
    console.error(
      "Route-risk shadow model-health error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load route-risk shadow model-health evidence.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}
