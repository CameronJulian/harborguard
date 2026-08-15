import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildRouteRiskDatasetManifest,
  type RouteRiskDatasetManifest,
} from "@/lib/fleet/buildRouteRiskDatasetManifest";

import {
  evaluateRouteRiskLogisticBaseline,
  type RouteRiskLogisticEvaluationResult,
} from "@/lib/fleet/evaluateRouteRiskLogisticBaseline";

import {
  readRouteRiskTrainingExamples,
} from "@/lib/fleet/readRouteRiskTrainingExamples";

import {
  splitRouteRiskTrainingDataset,
} from "@/lib/fleet/splitRouteRiskTrainingDataset";

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
 * Executes HarborGuard's reproducible offline route-risk
 * training pipeline.
 *
 * Composition boundary:
 *
 * - Reads existing persisted prediction/outcome examples.
 * - Applies the deterministic leakage-safe dataset split.
 * - Builds the deterministic dataset manifest.
 * - Trains only on dataset.train.
 * - Evaluates validation and test independently.
 * - Uses the same caller-supplied evaluation threshold for both.
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
  const examples =
    await readRouteRiskTrainingExamples({
      supabase,
      organizationId,
      pageSize,
      startOutcomeCompletedAt,
      endOutcomeCompletedAt,
    });

  const dataset =
    splitRouteRiskTrainingDataset(
      examples
    );

  const manifest =
    buildRouteRiskDatasetManifest({
      organizationId,
      startOutcomeCompletedAt,
      endOutcomeCompletedAt,
      generatedAt,
      dataset,
    });

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
