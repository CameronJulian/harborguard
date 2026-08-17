import {
  createClient,
} from "@supabase/supabase-js";

import {
  NextResponse,
} from "next/server";

import {
  analyzeRouteRiskShadowModelHealth,
  type RouteRiskShadowModelHealthEvaluation,
} from "@/lib/fleet/analyzeRouteRiskShadowModelHealth";

import {
  assessRouteRiskShadowModelHealthEvidence,
} from "@/lib/fleet/assessRouteRiskShadowModelHealthEvidence";

import {
  persistRouteRiskShadowModelHealthObservation,
} from "@/lib/fleet/persistRouteRiskShadowModelHealthObservation";

import {
  readRouteRiskShadowModelArtifact,
} from "@/lib/fleet/readRouteRiskShadowModelArtifact";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

type RouteRiskShadowModelHealthRow = {
  predicted_probability: unknown;
  observed_adverse_event: unknown;
};

function errorMessage(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null
      ? JSON.stringify(error)
      : String(
          error ||
            "Route-risk shadow model-health observation failed."
        );
}

function parseRequiredDate(
  value: string | null,
  fieldName: string
):
  | { ok: true; date: Date }
  | { ok: false; error: string } {
  if (!value) {
    return {
      ok: false,
      error:
        `${fieldName} is required.`,
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      ok: false,
      error:
        `Invalid ${fieldName} date.`,
    };
  }

  return {
    ok: true,
    date,
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

/**
 * Protected machine-side boundary for recording one immutable descriptive
 * route-risk shadow model-health observation.
 *
 * This endpoint:
 *
 * - requires HarborGuard cron authorization;
 * - uses a non-persistent service-role Supabase client;
 * - uses a server-controlled organization ID;
 * - resolves the organization's current shadow model from registry state;
 * - requires explicit reference/recent evidence windows;
 * - reads immutable shadow evaluations;
 * - calculates descriptive model-health evidence;
 * - persists one immutable observation;
 * - does not establish statistical sufficiency;
 * - does not classify model health or drift;
 * - does not trigger retraining;
 * - does not approve or activate a model;
 * - does not modify production Route Safety;
 * - is not automatically scheduled by this implementation.
 */
export async function GET(
  request: Request
) {
  try {
    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error:
            "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized cron request.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase service-role configuration is incomplete.",
        },
        {
          status: 500,
        }
      );
    }

    const organizationId =
      process.env
        .ROUTE_RISK_MODEL_HEALTH_ORGANIZATION_ID
        ?.trim();

    if (!organizationId) {
      return NextResponse.json(
        {
          error:
            "ROUTE_RISK_MODEL_HEALTH_ORGANIZATION_ID is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const referenceStart =
      parseRequiredDate(
        searchParams.get(
          "referenceStart"
        ),
        "referenceStart"
      );

    if (!referenceStart.ok) {
      return NextResponse.json(
        {
          error:
            referenceStart.error,
        },
        {
          status: 400,
        }
      );
    }

    const referenceEnd =
      parseRequiredDate(
        searchParams.get(
          "referenceEnd"
        ),
        "referenceEnd"
      );

    if (!referenceEnd.ok) {
      return NextResponse.json(
        {
          error:
            referenceEnd.error,
        },
        {
          status: 400,
        }
      );
    }

    const recentStart =
      parseRequiredDate(
        searchParams.get(
          "recentStart"
        ),
        "recentStart"
      );

    if (!recentStart.ok) {
      return NextResponse.json(
        {
          error:
            recentStart.error,
        },
        {
          status: 400,
        }
      );
    }

    const recentEnd =
      parseRequiredDate(
        searchParams.get(
          "recentEnd"
        ),
        "recentEnd"
      );

    if (!recentEnd.ok) {
      return NextResponse.json(
        {
          error:
            recentEnd.error,
        },
        {
          status: 400,
        }
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data: organization,
      error: organizationError,
    } =
      await supabase
        .from(
          "organizations"
        )
        .select("id")
        .eq(
          "id",
          organizationId
        )
        .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      return NextResponse.json(
        {
          error:
            "ROUTE_RISK_MODEL_HEALTH_ORGANIZATION_ID does not match an organization.",
        },
        {
          status: 500,
        }
      );
    }

    const artifact =
      await readRouteRiskShadowModelArtifact({
        supabase,
        organizationId,
      });

    if (!artifact) {
      return NextResponse.json({
        success: true,

        status:
          "no_shadow_model",

        organizationId,

        persisted:
          false,
      });
    }

    const readWindow = async (
      start: Date,
      end: Date
    ): Promise<
      RouteRiskShadowModelHealthEvaluation[]
    > => {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "route_risk_shadow_evaluations"
          )
          .select(
            "predicted_probability, observed_adverse_event"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .eq(
            "model_registry_id",
            artifact.registryId
          )
          .eq(
            "training_run_id",
            artifact.trainingRunId
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
            {
              ascending: true,
            }
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
    ] =
      await Promise.all([
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
        reference:
          referenceEvaluations,

        recent:
          recentEvaluations,
      });

    const evidenceAssessment =
      assessRouteRiskShadowModelHealthEvidence(
        modelHealth
      );

    const persisted =
      await persistRouteRiskShadowModelHealthObservation({
        supabase,

        organizationId,

        modelRegistryId:
          artifact.registryId,

        trainingRunId:
          artifact.trainingRunId,

        referenceStart:
          referenceStart.date,

        referenceEnd:
          referenceEnd.date,

        recentStart:
          recentStart.date,

        recentEnd:
          recentEnd.date,

        modelHealth,
        evidenceAssessment,
      });

    return NextResponse.json({
      success: true,

      status:
        persisted.status,

      organizationId,

      modelIdentity: {
        modelRegistryId:
          artifact.registryId,

        trainingRunId:
          artifact.trainingRunId,
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

      observation: {
        id:
          persisted.observation.id,

        createdAt:
          persisted.observation.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[route-risk shadow model-health cron]",
      error
    );

    return NextResponse.json(
      {
        error:
          errorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}
