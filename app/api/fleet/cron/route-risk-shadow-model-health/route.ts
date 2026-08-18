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
  deriveRouteRiskShadowModelHealthScheduledWindows,
} from "@/lib/fleet/deriveRouteRiskShadowModelHealthScheduledWindows";

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

function nonBlankString(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
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
 * - derives deterministic completed-UTC-day reference/recent evidence windows from explicit server-side policy;
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

    const scheduledWindows =
      deriveRouteRiskShadowModelHealthScheduledWindows();

    const {
      referenceStart,
      referenceEnd,

      recentStart,
      recentEnd,
    } =
      scheduledWindows;
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

    /*
     * Resolve the single currently open evidence cycle for the exact
     * shadow artifact selected from registry state.
     *
     * Scheduled model-health observations must describe the current
     * shadow episode only and must not mix historical/re-validation cycles.
     */
    const {
      data: openEvidenceCycleRow,
      error: openEvidenceCycleError,
    } =
      await supabase
        .from(
          "route_risk_shadow_evidence_cycles"
        )
        .select(
          "id"
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
        .is(
          "ended_at",
          null
        )
        .maybeSingle();

    if (openEvidenceCycleError) {
      throw openEvidenceCycleError;
    }

    const evidenceCycleId =
      nonBlankString(
        openEvidenceCycleRow?.id
      );

    if (!evidenceCycleId) {
      return NextResponse.json(
        {
          success: true,

          status:
            "no_open_evidence_cycle",

          organizationId,

          modelIdentity: {
            modelRegistryId:
              artifact.registryId,

            trainingRunId:
              artifact.trainingRunId,
          },

          persisted:
            false,
        }
      );
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
          .eq(
            "evidence_cycle_id",
            evidenceCycleId
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
          referenceStart,
          referenceEnd
        ),

        readWindow(
          recentStart,
          recentEnd
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
          referenceStart,

        referenceEnd:
          referenceEnd,

        recentStart:
          recentStart,

        recentEnd:
          recentEnd,

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

        evidenceCycleId,
      },

      windowPolicy: {
        version:
          scheduledWindows.policyVersion,

        anchorUtcDayStart:
          scheduledWindows.anchorUtcDayStart.toISOString(),
      },

      windows: {
        reference: {
          start:
            referenceStart.toISOString(),

          end:
            referenceEnd.toISOString(),
        },

        recent: {
          start:
            recentStart.toISOString(),

          end:
            recentEnd.toISOString(),
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
