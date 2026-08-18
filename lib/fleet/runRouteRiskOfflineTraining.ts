import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskDatasetManifest,
} from "@/lib/fleet/buildRouteRiskDatasetManifest";

import {
  evaluateRouteRiskLogisticBaseline,
  type RouteRiskLogisticEvaluationResult,
} from "@/lib/fleet/evaluateRouteRiskLogisticBaseline";

import {
  prepareRouteRiskOfflineTrainingDataset,
  type PreparedRouteRiskOfflineTrainingDataset,
} from "@/lib/fleet/prepareRouteRiskOfflineTrainingDataset";

import {
  trainRouteRiskLogisticBaseline,
  type RouteRiskLogisticBaselineModel,
  type TrainRouteRiskLogisticBaselineOptions,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

export const ROUTE_RISK_OFFLINE_TRAINING_RUN_VERSION =
  "harborguard-route-risk-offline-training-run-v1" as const;

export type RunRouteRiskOfflineTrainingInput = {
  supabase: SupabaseClient;
  organizationId: string;

  pageSize?: number;

  startOutcomeCompletedAt?: string;
  endOutcomeCompletedAt?: string;

  generatedAt: string;

  evaluationThreshold: number;

  training?:
    TrainRouteRiskLogisticBaselineOptions;
};

export type RunPreparedRouteRiskOfflineTrainingInput = {
  prepared:
    PreparedRouteRiskOfflineTrainingDataset;

  evaluationThreshold: number;

  training?:
    TrainRouteRiskLogisticBaselineOptions;
};

export type RouteRiskOfflineTrainingRun = {
  runVersion:
    typeof ROUTE_RISK_OFFLINE_TRAINING_RUN_VERSION;

  manifest:
    RouteRiskDatasetManifest;

  model:
    RouteRiskLogisticBaselineModel;

  validationEvaluation:
    RouteRiskLogisticEvaluationResult;

  testEvaluation:
    RouteRiskLogisticEvaluationResult;
};

/**
 * Executes model optimization and evaluation against one already-prepared,
 * immutable-in-memory route-risk training dataset.
 *
 * This boundary deliberately performs no database reads and no persistence.
 * The caller may therefore prepare evidence, assess retraining readiness,
 * and invoke optimization only when that policy boundary permits training.
 *
 * It:
 *
 * - trains only on prepared.dataset.train;
 * - evaluates validation and test independently;
 * - uses the caller-supplied evaluation threshold for both evaluations;
 * - returns the exact prepared manifest unchanged.
 *
 * It does NOT:
 *
 * - read training examples;
 * - rebuild or resplit the dataset;
 * - persist a training run;
 * - register or mutate model lifecycle state;
 * - activate or retire a model;
 * - modify Route Safety behavior.
 */
export function runPreparedRouteRiskOfflineTraining({
  prepared,
  evaluationThreshold,
  training,
}: RunPreparedRouteRiskOfflineTrainingInput): RouteRiskOfflineTrainingRun {
  const {
    dataset,
    manifest,
  } =
    prepared;

  const model =
    trainRouteRiskLogisticBaseline(
      dataset.train,
      training
    );

  const validationEvaluation =
    evaluateRouteRiskLogisticBaseline({
      model,
      examples:
        dataset.validation,
      threshold:
        evaluationThreshold,
    });

  const testEvaluation =
    evaluateRouteRiskLogisticBaseline({
      model,
      examples:
        dataset.test,
      threshold:
        evaluationThreshold,
    });

  return {
    runVersion:
      ROUTE_RISK_OFFLINE_TRAINING_RUN_VERSION,

    manifest,

    model,

    validationEvaluation,

    testEvaluation,
  };
}

/**
 * Executes HarborGuard's reproducible offline route-risk training pipeline.
 *
 * Composition boundary:
 *
 * - Reads existing persisted prediction/outcome examples.
 * - Applies the deterministic leakage-safe dataset split.
 * - Builds the deterministic dataset manifest.
 * - Delegates optimization/evaluation to the prepared-dataset boundary.
 * - generatedAt remains caller-supplied.
 * - Supabase remains caller-supplied.
 * - No model persistence, registry update, threshold selection,
 *   production activation, or live route scoring occurs here.
 */
export async function runRouteRiskOfflineTraining({
  supabase,
  organizationId,
  pageSize,
  startOutcomeCompletedAt,
  endOutcomeCompletedAt,
  generatedAt,
  evaluationThreshold,
  training,
}: RunRouteRiskOfflineTrainingInput): Promise<
  RouteRiskOfflineTrainingRun
> {
  const prepared =
    await prepareRouteRiskOfflineTrainingDataset({
      supabase,
      organizationId,
      pageSize,
      startOutcomeCompletedAt,
      endOutcomeCompletedAt,
      generatedAt,
    });

  return runPreparedRouteRiskOfflineTraining({
    prepared,
    evaluationThreshold,
    training,
  });
}
