import {
  createHash,
} from "crypto";

import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
  type RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  ROUTE_RISK_DATASET_SPLIT_VERSION,
  type RouteRiskTrainingDatasetSplit,
} from "@/lib/fleet/splitRouteRiskTrainingDataset";

export const ROUTE_RISK_DATASET_MANIFEST_VERSION =
  "harborguard-route-risk-dataset-manifest-v1" as const;

export type BuildRouteRiskDatasetManifestInput = {
  organizationId: string;

  startOutcomeCompletedAt?: string;
  endOutcomeCompletedAt?: string;

  generatedAt: string;

  dataset: RouteRiskTrainingDatasetSplit;
};

export type RouteRiskDatasetManifest = {
  manifestVersion:
    typeof ROUTE_RISK_DATASET_MANIFEST_VERSION;

  trainingContractVersion:
    typeof ROUTE_RISK_TRAINING_CONTRACT_VERSION;

  featureSchemaVersion:
    typeof ROUTE_RISK_FEATURE_SCHEMA_VERSION;

  labelSchemaVersion:
    typeof ROUTE_RISK_LABEL_SCHEMA_VERSION;

  splitVersion:
    typeof ROUTE_RISK_DATASET_SPLIT_VERSION;

  organizationId: string;

  window: {
    startOutcomeCompletedAt: string | null;
    endOutcomeCompletedAt: string | null;
  };

  counts: {
    total: number;
    train: number;
    validation: number;
    test: number;
  };

  datasetFingerprint: string;

  generatedAt: string;
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

function normalizeOptionalTimestamp(
  value: string | undefined,
  fieldName: string
) {
  if (value === undefined) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      "Invalid " +
        fieldName +
        ": expected a valid timestamp."
    );
  }

  return new Date(timestamp).toISOString();
}

function normalizeRequiredTimestamp(
  value: string,
  fieldName: string
) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      "Invalid " +
        fieldName +
        ": expected a valid timestamp."
    );
  }

  return new Date(timestamp).toISOString();
}

function compareExamples(
  left: RouteRiskTrainingExample,
  right: RouteRiskTrainingExample
) {
  const leftKey = [
    left.provenance.organizationId,
    left.provenance.tripId,
    left.provenance.snapshotId,
    left.provenance.outcomeId,
    left.provenance.predictionCreatedAt,
    left.provenance.outcomeCompletedAt,
  ].join("|");

  const rightKey = [
    right.provenance.organizationId,
    right.provenance.tripId,
    right.provenance.snapshotId,
    right.provenance.outcomeId,
    right.provenance.predictionCreatedAt,
    right.provenance.outcomeCompletedAt,
  ].join("|");

  return leftKey.localeCompare(rightKey);
}

function canonicalizeExample(
  splitName: "train" | "validation" | "test",
  example: RouteRiskTrainingExample
) {
  return {
    split: splitName,

    contractVersion:
      example.contractVersion,

    featureSchemaVersion:
      example.featureSchemaVersion,

    labelSchemaVersion:
      example.labelSchemaVersion,

    provenance: {
      organizationId:
        example.provenance.organizationId,

      vehicleId:
        example.provenance.vehicleId,

      tripId:
        example.provenance.tripId,

      snapshotId:
        example.provenance.snapshotId,

      outcomeId:
        example.provenance.outcomeId,

      predictionCreatedAt:
        example.provenance.predictionCreatedAt,

      outcomeCompletedAt:
        example.provenance.outcomeCompletedAt,
    },

    features: {
      overallRiskScore:
        example.features.overallRiskScore,

      threatRiskScore:
        example.features.threatRiskScore,

      weatherRiskScore:
        example.features.weatherRiskScore,

      trafficRiskScore:
        example.features.trafficRiskScore,
    },

    label: {
      observedAdverseEvent:
        example.label.observedAdverseEvent,
    },
  };
}

function validateExampleOrganization(
  example: RouteRiskTrainingExample,
  organizationId: string
) {
  if (
    example.provenance.organizationId !==
    organizationId
  ) {
    throw new Error(
      "Dataset contains an example from another organization."
    );
  }
}

export function buildRouteRiskDatasetManifest({
  organizationId,
  startOutcomeCompletedAt,
  endOutcomeCompletedAt,
  generatedAt,
  dataset,
}: BuildRouteRiskDatasetManifestInput): RouteRiskDatasetManifest {
  requireNonEmptyString(
    organizationId,
    "organizationId"
  );

  const normalizedStart =
    normalizeOptionalTimestamp(
      startOutcomeCompletedAt,
      "startOutcomeCompletedAt"
    );

  const normalizedEnd =
    normalizeOptionalTimestamp(
      endOutcomeCompletedAt,
      "endOutcomeCompletedAt"
    );

  const normalizedGeneratedAt =
    normalizeRequiredTimestamp(
      generatedAt,
      "generatedAt"
    );

  if (
    normalizedStart !== null &&
    normalizedEnd !== null &&
    Date.parse(normalizedStart) >
      Date.parse(normalizedEnd)
  ) {
    throw new Error(
      "Invalid date range: startOutcomeCompletedAt cannot be after endOutcomeCompletedAt."
    );
  }

  if (
    dataset.splitVersion !==
    ROUTE_RISK_DATASET_SPLIT_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk dataset split version."
    );
  }

  const train =
    [...dataset.train].sort(compareExamples);

  const validation =
    [...dataset.validation].sort(compareExamples);

  const test =
    [...dataset.test].sort(compareExamples);

  const allExamples = [
    ...train,
    ...validation,
    ...test,
  ];

  for (const example of allExamples) {
    validateExampleOrganization(
      example,
      organizationId
    );
  }

  const fingerprintPayload = {
    manifestVersion:
      ROUTE_RISK_DATASET_MANIFEST_VERSION,

    trainingContractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    splitVersion:
      ROUTE_RISK_DATASET_SPLIT_VERSION,

    organizationId,

    window: {
      startOutcomeCompletedAt:
        normalizedStart,

      endOutcomeCompletedAt:
        normalizedEnd,
    },

    examples: [
      ...train.map(
        (example) =>
          canonicalizeExample(
            "train",
            example
          )
      ),

      ...validation.map(
        (example) =>
          canonicalizeExample(
            "validation",
            example
          )
      ),

      ...test.map(
        (example) =>
          canonicalizeExample(
            "test",
            example
          )
      ),
    ],
  };

  const datasetFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(
          fingerprintPayload
        )
      )
      .digest("hex");

  return {
    manifestVersion:
      ROUTE_RISK_DATASET_MANIFEST_VERSION,

    trainingContractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    splitVersion:
      ROUTE_RISK_DATASET_SPLIT_VERSION,

    organizationId,

    window: {
      startOutcomeCompletedAt:
        normalizedStart,

      endOutcomeCompletedAt:
        normalizedEnd,
    },

    counts: {
      total:
        allExamples.length,

      train:
        train.length,

      validation:
        validation.length,

      test:
        test.length,
    },

    datasetFingerprint,

    generatedAt:
      normalizedGeneratedAt,
  };
}
