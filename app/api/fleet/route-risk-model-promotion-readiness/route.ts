import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

import {
  analyzeRouteRiskModelPromotionEvidence,
  type RouteRiskModelPromotionPredictionEvidence,
} from "@/lib/fleet/analyzeRouteRiskModelPromotionEvidence";

import {
  analyzeRouteRiskShadowModelHealth,
  type RouteRiskShadowModelHealthEvaluation,
} from "@/lib/fleet/analyzeRouteRiskShadowModelHealth";

import {
  assessRouteRiskShadowModelHealthEvidence,
} from "@/lib/fleet/assessRouteRiskShadowModelHealthEvidence";

import {
  assessRouteRiskModelPromotionReadiness,
} from "@/lib/fleet/assessRouteRiskModelPromotionReadiness";

import {
  readRouteRiskModelPromotionReadinessPolicy,
} from "@/lib/fleet/readRouteRiskModelPromotionReadinessPolicy";

type ShadowPredictionRow = {
  id: unknown;
  production_snapshot_id: unknown;
  model_registry_id: unknown;
  training_run_id: unknown;
  created_at: unknown;
};

type ProductionSnapshotRow = {
  id: unknown;
  vehicle_id: unknown;
  trip_id: unknown;
};

type CompletedOutcomeRow = {
  id: unknown;
  vehicle_id: unknown;
  trip_id: unknown;
  completed_at: unknown;
};

type ShadowEvaluationIdentityRow = {
  id: unknown;
  shadow_prediction_id: unknown;
};

type ModelHealthRow = {
  predicted_probability: unknown;
  observed_adverse_event: unknown;
};

function parseRequiredIdentity(
  value: string | null,
  fieldName: string
):
  | { value: string; error: null }
  | { value: null; error: string } {
  const normalized =
    value?.trim() || "";

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

  const date =
    new Date(value);

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

function validTimestamp(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function mapModelHealthRows(
  rows: ModelHealthRow[]
): RouteRiskShadowModelHealthEvaluation[] {
  return rows.map((row) => ({
    predictedProbability:
      row.predicted_probability,

    observedAdverseEvent:
      row.observed_adverse_event,
  }));
}

/**
 * Returns descriptive promotion-readiness evidence for one exact
 * route-risk shadow model candidate.
 *
 * HUMAN REVIEW INPUT ONLY.
 *
 * This endpoint does not:
 * - approve or reject a candidate;
 * - enter shadow mode;
 * - activate or retire a model;
 * - trigger retraining;
 * - choose production thresholds;
 * - modify production Route Safety behavior.
 */
export async function GET(req: Request) {
  try {
    const {
      supabase,
      organizationId,
    } =
      await requireOrganization();

    const { searchParams } =
      new URL(req.url);

    const modelRegistryId =
      parseRequiredIdentity(
        searchParams.get(
          "modelRegistryId"
        ),
        "modelRegistryId"
      );

    if (modelRegistryId.error) {
      return NextResponse.json(
        {
          error:
            modelRegistryId.error,
        },
        {
          status: 400,
        }
      );
    }

    const trainingRunId =
      parseRequiredIdentity(
        searchParams.get(
          "trainingRunId"
        ),
        "trainingRunId"
      );

    if (trainingRunId.error) {
      return NextResponse.json(
        {
          error:
            trainingRunId.error,
        },
        {
          status: 400,
        }
      );
    }

    const validatedModelRegistryId =
      modelRegistryId.value;

    if (validatedModelRegistryId === null) {
      return NextResponse.json(
        {
          error:
            "modelRegistryId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const validatedTrainingRunId =
      trainingRunId.value;

    if (validatedTrainingRunId === null) {
      return NextResponse.json(
        {
          error:
            "trainingRunId is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    /*
     * Confirm that the exact candidate belongs to the authenticated
     * organization and is currently a shadow candidate.
     *
     * SELECT only. No lifecycle mutation authority exists here.
     */
    const {
      data: registryRow,
      error: registryError,
    } =
      await supabase
        .from(
          "route_risk_model_registry"
        )
        .select(
          "id, training_run_id, lifecycle_status"
        )
        .eq(
          "id",
          validatedModelRegistryId
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "training_run_id",
          validatedTrainingRunId
        )
        .maybeSingle();

    if (registryError) {
      throw registryError;
    }

    if (!registryRow) {
      return NextResponse.json(
        {
          error:
            "Route-risk model candidate not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      registryRow.lifecycle_status !==
      "shadow"
    ) {
      return NextResponse.json(
        {
          error:
            "Route-risk model candidate is not in shadow lifecycle status.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Read every persisted shadow prediction for this exact candidate.
     */
    const {
      data: predictionData,
      error: predictionError,
    } =
      await supabase
        .from(
          "route_risk_shadow_predictions"
        )
        .select(
          "id, production_snapshot_id, model_registry_id, training_run_id, created_at"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "model_registry_id",
          validatedModelRegistryId
        )
        .eq(
          "training_run_id",
          validatedTrainingRunId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    if (predictionError) {
      throw predictionError;
    }

    const predictionRows =
      (predictionData || []) as
        ShadowPredictionRow[];

    const snapshotIds =
      Array.from(
        new Set(
          predictionRows
            .map(
              (row) =>
                nonBlankString(
                  row.production_snapshot_id
                )
            )
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        )
      );

    let snapshotRows:
      ProductionSnapshotRow[] = [];

    if (snapshotIds.length > 0) {
      const {
        data: snapshotData,
        error: snapshotError,
      } =
        await supabase
          .from(
            "route_prediction_snapshots"
          )
          .select(
            "id, vehicle_id, trip_id"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .in(
            "id",
            snapshotIds
          );

      if (snapshotError) {
        throw snapshotError;
      }

      snapshotRows =
        (snapshotData || []) as
          ProductionSnapshotRow[];
    }

    const snapshotById =
      new Map<
        string,
        {
          vehicleId: string;
          tripId: string;
        }
      >();

    for (const row of snapshotRows) {
      const id =
        nonBlankString(row.id);

      const vehicleId =
        nonBlankString(
          row.vehicle_id
        );

      const tripId =
        nonBlankString(
          row.trip_id
        );

      if (
        id &&
        vehicleId &&
        tripId
      ) {
        snapshotById.set(
          id,
          {
            vehicleId,
            tripId,
          }
        );
      }
    }

    const tripIds =
      Array.from(
        new Set(
          Array.from(
            snapshotById.values()
          ).map(
            (snapshot) =>
              snapshot.tripId
          )
        )
      );

    let outcomeRows:
      CompletedOutcomeRow[] = [];

    if (tripIds.length > 0) {
      const {
        data: outcomeData,
        error: outcomeError,
      } =
        await supabase
          .from(
            "route_prediction_outcomes"
          )
          .select(
            "id, vehicle_id, trip_id, completed_at"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .in(
            "trip_id",
            tripIds
          );

      if (outcomeError) {
        throw outcomeError;
      }

      outcomeRows =
        (outcomeData || []) as
          CompletedOutcomeRow[];
    }

    const outcomeByTripId =
      new Map<
        string,
        {
          vehicleId: string;
          completedAt: string;
        }
      >();

    for (const row of outcomeRows) {
      const vehicleId =
        nonBlankString(
          row.vehicle_id
        );

      const tripId =
        nonBlankString(
          row.trip_id
        );

      const completedAt =
        validTimestamp(
          row.completed_at
        );

      if (
        vehicleId &&
        tripId &&
        completedAt
      ) {
        outcomeByTripId.set(
          tripId,
          {
            vehicleId,
            completedAt,
          }
        );
      }
    }

    const shadowPredictionIds =
      predictionRows
        .map(
          (row) =>
            nonBlankString(
              row.id
            )
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        );

    let evaluationIdentityRows:
      ShadowEvaluationIdentityRow[] =
        [];

    if (
      shadowPredictionIds.length > 0
    ) {
      const {
        data: evaluationIdentityData,
        error: evaluationIdentityError,
      } =
        await supabase
          .from(
            "route_risk_shadow_evaluations"
          )
          .select(
            "id, shadow_prediction_id"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .eq(
            "model_registry_id",
            validatedModelRegistryId
          )
          .eq(
            "training_run_id",
            validatedTrainingRunId
          )
          .in(
            "shadow_prediction_id",
            shadowPredictionIds
          );

      if (evaluationIdentityError) {
        throw evaluationIdentityError;
      }

      evaluationIdentityRows =
        (evaluationIdentityData || []) as
          ShadowEvaluationIdentityRow[];
    }

    const evaluationIdByPredictionId =
      new Map<string, string>();

    for (
      const row of
      evaluationIdentityRows
    ) {
      const evaluationId =
        nonBlankString(row.id);

      const shadowPredictionId =
        nonBlankString(
          row.shadow_prediction_id
        );

      if (
        evaluationId &&
        shadowPredictionId
      ) {
        evaluationIdByPredictionId.set(
          shadowPredictionId,
          evaluationId
        );
      }
    }

    /*
     * Only completed journeys are eligible for the promotion-evidence
     * denominator. A missing evaluation remains represented by a null
     * evaluationId so coverage is descriptive rather than silently
     * excluding unevaluated eligible predictions.
     */
    const promotionPredictions:
      RouteRiskModelPromotionPredictionEvidence[] =
        [];

    for (const row of predictionRows) {
      const shadowPredictionId =
        nonBlankString(row.id);

      const productionSnapshotId =
        nonBlankString(
          row.production_snapshot_id
        );

      const rowModelRegistryId =
        nonBlankString(
          row.model_registry_id
        );

      const rowTrainingRunId =
        nonBlankString(
          row.training_run_id
        );

      const predictionCreatedAt =
        validTimestamp(
          row.created_at
        );

      if (
        !shadowPredictionId ||
        !productionSnapshotId ||
        !rowModelRegistryId ||
        !rowTrainingRunId ||
        !predictionCreatedAt
      ) {
        continue;
      }

      const snapshot =
        snapshotById.get(
          productionSnapshotId
        );

      if (!snapshot) {
        continue;
      }

      const outcome =
        outcomeByTripId.get(
          snapshot.tripId
        );

      if (!outcome) {
        continue;
      }

      /*
       * Fail closed on inconsistent trip/vehicle provenance.
       */
      if (
        outcome.vehicleId !==
        snapshot.vehicleId
      ) {
        continue;
      }

      promotionPredictions.push({
        shadowPredictionId,

        modelRegistryId:
          rowModelRegistryId,

        trainingRunId:
          rowTrainingRunId,

        vehicleId:
          snapshot.vehicleId,

        predictionCreatedAt,

        outcomeCompletedAt:
          outcome.completedAt,

        evaluationId:
          evaluationIdByPredictionId.get(
            shadowPredictionId
          ) ?? null,
      });
    }

    const promotionEvidence =
      analyzeRouteRiskModelPromotionEvidence({
        modelRegistryId:
          validatedModelRegistryId,

        trainingRunId:
          validatedTrainingRunId,

        predictions:
          promotionPredictions,
      });

    const readModelHealthWindow =
      async (
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
              validatedModelRegistryId
            )
            .eq(
              "training_run_id",
              validatedTrainingRunId
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

        return mapModelHealthRows(
          (data || []) as
            ModelHealthRow[]
        );
      };

    const [
      referenceEvaluations,
      recentEvaluations,
    ] =
      await Promise.all([
        readModelHealthWindow(
          referenceStart.date,
          referenceEnd.date
        ),

        readModelHealthWindow(
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

    const modelHealthEvidence =
      assessRouteRiskShadowModelHealthEvidence(
        modelHealth
      );

    const policy =
      readRouteRiskModelPromotionReadinessPolicy();

    const readiness =
      assessRouteRiskModelPromotionReadiness({
        promotionEvidence,
        modelHealthEvidence,
        policy,
      });

    return NextResponse.json({
      success: true,

      semantics:
        "HUMAN_REVIEW_INPUT_ONLY_NO_ACTIVATION_AUTHORITY",

      modelIdentity: {
        modelRegistryId:
          validatedModelRegistryId,

        trainingRunId:
          validatedTrainingRunId,
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

      promotionEvidence,

      modelHealth,

      modelHealthEvidence,

      readiness,
    });
  } catch (error: unknown) {
    console.error(
      "Route-risk model promotion-readiness error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to assess route-risk model promotion readiness.";

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
