import {
  createHash,
} from "crypto";

import type {
  RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

export const ROUTE_RISK_DATASET_SPLIT_VERSION =
  "harborguard-route-risk-split-v1" as const;

export const ROUTE_RISK_DATASET_SPLIT_RATIOS = {
  train: 80,
  validation: 10,
  test: 10,
} as const;

export type RouteRiskDatasetSplitName =
  | "train"
  | "validation"
  | "test";

export type RouteRiskTrainingDatasetSplit = {
  splitVersion:
    typeof ROUTE_RISK_DATASET_SPLIT_VERSION;

  ratios:
    typeof ROUTE_RISK_DATASET_SPLIT_RATIOS;

  train:
    RouteRiskTrainingExample[];

  validation:
    RouteRiskTrainingExample[];

  test:
    RouteRiskTrainingExample[];
};

function requireNonEmptyString(
  value: string,
  fieldName: string
) {
  if (value.trim().length === 0) {
    throw new Error(
      "Invalid " +
        fieldName +
        ": expected a non-empty string."
    );
  }

  return value;
}

function buildLeakageGroupKey(
  example: RouteRiskTrainingExample
) {
  const organizationId =
    requireNonEmptyString(
      example.provenance.organizationId,
      "organizationId"
    );

  const tripId =
    requireNonEmptyString(
      example.provenance.tripId,
      "tripId"
    );

  const vehicleId =
    example.provenance.vehicleId;

  if (vehicleId !== null) {
    requireNonEmptyString(
      vehicleId,
      "vehicleId"
    );

    return [
      organizationId,
      "vehicle:" + vehicleId,
    ].join("|");
  }

  return [
    organizationId,
    "trip:" + tripId,
  ].join("|");
}

function deriveAssignmentBucket(
  leakageGroupKey: string
) {
  const digest =
    createHash("sha256")
      .update(
        [
          ROUTE_RISK_DATASET_SPLIT_VERSION,
          leakageGroupKey,
        ].join("|")
      )
      .digest();

  return digest.readUInt32BE(0) % 100;
}

function splitNameFromBucket(
  bucket: number
): RouteRiskDatasetSplitName {
  if (
    bucket <
    ROUTE_RISK_DATASET_SPLIT_RATIOS.train
  ) {
    return "train";
  }

  if (
    bucket <
    ROUTE_RISK_DATASET_SPLIT_RATIOS.train +
      ROUTE_RISK_DATASET_SPLIT_RATIOS.validation
  ) {
    return "validation";
  }

  return "test";
}

function compareExamples(
  left: RouteRiskTrainingExample,
  right: RouteRiskTrainingExample
) {
  const byOutcome =
    left.provenance.outcomeCompletedAt.localeCompare(
      right.provenance.outcomeCompletedAt
    );

  if (byOutcome !== 0) {
    return byOutcome;
  }

  const byOrganization =
    left.provenance.organizationId.localeCompare(
      right.provenance.organizationId
    );

  if (byOrganization !== 0) {
    return byOrganization;
  }

  const byTrip =
    left.provenance.tripId.localeCompare(
      right.provenance.tripId
    );

  if (byTrip !== 0) {
    return byTrip;
  }

  return left.provenance.snapshotId.localeCompare(
    right.provenance.snapshotId
  );
}

/**
 * Deterministically separates HarborGuard route-risk training examples
 * into train, validation and test sets while protecting against
 * known vehicle-level leakage.
 *
 * Known vehicles are grouped by organization and vehicle.
 * Null-vehicle examples fall back to organization and trip.
 * Assignment is versioned and SHA-256 based.
 * Input examples are not mutated.
 */
export function splitRouteRiskTrainingDataset(
  examples: readonly RouteRiskTrainingExample[]
): RouteRiskTrainingDatasetSplit {
  const train:
    RouteRiskTrainingExample[] = [];

  const validation:
    RouteRiskTrainingExample[] = [];

  const test:
    RouteRiskTrainingExample[] = [];

  for (const example of examples) {
    const leakageGroupKey =
      buildLeakageGroupKey(
        example
      );

    const bucket =
      deriveAssignmentBucket(
        leakageGroupKey
      );

    const split =
      splitNameFromBucket(
        bucket
      );

    if (split === "train") {
      train.push(example);
      continue;
    }

    if (split === "validation") {
      validation.push(example);
      continue;
    }

    test.push(example);
  }

  train.sort(compareExamples);
  validation.sort(compareExamples);
  test.sort(compareExamples);

  return {
    splitVersion:
      ROUTE_RISK_DATASET_SPLIT_VERSION,

    ratios:
      ROUTE_RISK_DATASET_SPLIT_RATIOS,

    train,
    validation,
    test,
  };
}
