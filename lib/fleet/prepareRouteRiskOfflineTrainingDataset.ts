import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildRouteRiskDatasetManifest,
  type RouteRiskDatasetManifest,
} from "@/lib/fleet/buildRouteRiskDatasetManifest";

import {
  readRouteRiskTrainingExamples,
} from "@/lib/fleet/readRouteRiskTrainingExamples";

import {
  splitRouteRiskTrainingDataset,
  type RouteRiskTrainingDatasetSplit,
} from "@/lib/fleet/splitRouteRiskTrainingDataset";

export type PrepareRouteRiskOfflineTrainingDatasetInput = {
  supabase: SupabaseClient;
  organizationId: string;

  pageSize?: number;

  startOutcomeCompletedAt?: string;
  endOutcomeCompletedAt?: string;

  generatedAt: string;
};

export type PreparedRouteRiskOfflineTrainingDataset = {
  dataset:
    RouteRiskTrainingDatasetSplit;

  manifest:
    RouteRiskDatasetManifest;

  trainingClassCounts: {
    positive: number;
    negative: number;
  };
};

/**
 * Builds the deterministic dataset evidence required before HarborGuard
 * decides whether an offline route-risk training run should execute.
 *
 * This boundary:
 *
 * - reads existing persisted prediction/outcome examples;
 * - applies the deterministic leakage-safe dataset split;
 * - builds the deterministic dataset manifest;
 * - derives training-only positive and negative class counts;
 * - performs no model optimization or evaluation;
 * - persists nothing;
 * - creates no lifecycle or production authority.
 *
 * The prepared dataset may subsequently be consumed by the offline trainer
 * so readiness assessment does not require a second database read.
 */
export async function prepareRouteRiskOfflineTrainingDataset({
  supabase,
  organizationId,
  pageSize,
  startOutcomeCompletedAt,
  endOutcomeCompletedAt,
  generatedAt,
}: PrepareRouteRiskOfflineTrainingDatasetInput): Promise<
  PreparedRouteRiskOfflineTrainingDataset
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

  const positive =
    dataset.train.reduce(
      (
        count,
        example
      ) =>
        count +
        (
          example.label
            .observedAdverseEvent
            ? 1
            : 0
        ),
      0
    );

  const negative =
    dataset.train.length -
    positive;

  return {
    dataset,
    manifest,

    trainingClassCounts: {
      positive,
      negative,
    },
  };
}
