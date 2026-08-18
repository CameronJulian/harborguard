import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskShadowModelArtifact,
} from "@/lib/fleet/readRouteRiskShadowModelArtifact";

import type {
  RouteRiskLogisticPrediction,
  RouteRiskLogisticPredictionFeatures,
} from "@/lib/fleet/scoreRouteRiskLogisticModel";

export type PersistRouteRiskShadowPredictionInput = {
  supabase: SupabaseClient;
  productionSnapshotId: string;
  artifact: RouteRiskShadowModelArtifact;
  features: RouteRiskLogisticPredictionFeatures;
  prediction: RouteRiskLogisticPrediction;
  metadata?: Record<string, unknown>;
};

export type PersistedRouteRiskShadowPrediction = {
  id: string;
  organizationId: string;
  productionSnapshotId: string;
  modelRegistryId: string;
  trainingRunId: string;
  evidenceCycleId: string;
  featureSchemaVersion: string;
  trainingContractVersion: string;
  labelSchemaVersion: string;
  algorithmVersion: string;
  runVersion: string;
  datasetFingerprint: string;
  overallRiskScore: number;
  threatRiskScore: number;
  weatherRiskScore: number;
  trafficRiskScore: number;
  predictedProbability: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PersistRouteRiskShadowPredictionResult = {
  status:
    | "created"
    | "existing";
  prediction: PersistedRouteRiskShadowPrediction;
};

type ShadowPredictionRow = {
  id: unknown;
  organization_id: unknown;
  production_snapshot_id: unknown;
  model_registry_id: unknown;
  training_run_id: unknown;
  evidence_cycle_id: unknown;
  feature_schema_version: unknown;
  training_contract_version: unknown;
  label_schema_version: unknown;
  algorithm_version: unknown;
  run_version: unknown;
  dataset_fingerprint: unknown;
  overall_risk_score: unknown;
  threat_risk_score: unknown;
  weather_risk_score: unknown;
  traffic_risk_score: unknown;
  predicted_probability: unknown;
  metadata: unknown;
  created_at: unknown;
};

const SHADOW_PREDICTION_SELECT =
  "id, organization_id, production_snapshot_id, model_registry_id, training_run_id, evidence_cycle_id, feature_schema_version, training_contract_version, label_schema_version, algorithm_version, run_version, dataset_fingerprint, overall_risk_score, threat_risk_score, weather_risk_score, traffic_risk_score, predicted_probability, metadata, created_at";

function requireNonBlankString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-blank string.`
    );
  }

  return value;
}

function requireDatasetFingerprint(
  value: unknown
): string {
  const fingerprint =
    requireNonBlankString(
      value,
      "datasetFingerprint"
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      fingerprint
    )
  ) {
    throw new Error(
      "Invalid datasetFingerprint."
    );
  }

  return fingerprint;
}

function requireFiniteNumber(
  value: unknown,
  fieldName: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite number.`
    );
  }

  return value;
}

function requireRiskScore(
  value: unknown,
  fieldName: string
): number {
  const score =
    requireFiniteNumber(
      value,
      fieldName
    );

  if (
    score < 0 ||
    score > 100
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a score between 0 and 100.`
    );
  }

  return score;
}

function requireProbability(
  value: unknown
): number {
  const probability =
    requireFiniteNumber(
      value,
      "prediction.predictedProbability"
    );

  if (
    probability < 0 ||
    probability > 1
  ) {
    throw new Error(
      "Invalid prediction.predictedProbability: expected a probability between 0 and 1."
    );
  }

  return probability;
}

function requireMetadata(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid metadata: expected an object."
    );
  }

  return value as Record<string, unknown>;
}

function parsePersistedRow(
  value: unknown
): PersistedRouteRiskShadowPrediction {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid persisted route-risk shadow prediction response."
    );
  }

  const row =
    value as ShadowPredictionRow;

  return {
    id:
      requireNonBlankString(
        row.id,
        "persisted prediction id"
      ),
    organizationId:
      requireNonBlankString(
        row.organization_id,
        "persisted prediction organization_id"
      ),
    productionSnapshotId:
      requireNonBlankString(
        row.production_snapshot_id,
        "persisted prediction production_snapshot_id"
      ),
    modelRegistryId:
      requireNonBlankString(
        row.model_registry_id,
        "persisted prediction model_registry_id"
      ),
    trainingRunId:
      requireNonBlankString(
        row.training_run_id,
        "persisted prediction training_run_id"
      ),
    evidenceCycleId:
      requireNonBlankString(
        row.evidence_cycle_id,
        "persisted prediction evidence_cycle_id"
      ),
    featureSchemaVersion:
      requireNonBlankString(
        row.feature_schema_version,
        "persisted prediction feature_schema_version"
      ),
    trainingContractVersion:
      requireNonBlankString(
        row.training_contract_version,
        "persisted prediction training_contract_version"
      ),
    labelSchemaVersion:
      requireNonBlankString(
        row.label_schema_version,
        "persisted prediction label_schema_version"
      ),
    algorithmVersion:
      requireNonBlankString(
        row.algorithm_version,
        "persisted prediction algorithm_version"
      ),
    runVersion:
      requireNonBlankString(
        row.run_version,
        "persisted prediction run_version"
      ),
    datasetFingerprint:
      requireDatasetFingerprint(
        row.dataset_fingerprint
      ),
    overallRiskScore:
      requireRiskScore(
        row.overall_risk_score,
        "persisted prediction overall_risk_score"
      ),
    threatRiskScore:
      requireRiskScore(
        row.threat_risk_score,
        "persisted prediction threat_risk_score"
      ),
    weatherRiskScore:
      requireRiskScore(
        row.weather_risk_score,
        "persisted prediction weather_risk_score"
      ),
    trafficRiskScore:
      requireRiskScore(
        row.traffic_risk_score,
        "persisted prediction traffic_risk_score"
      ),
    predictedProbability:
      requireProbability(
        row.predicted_probability
      ),
    metadata:
      requireMetadata(
        row.metadata
      ),
    createdAt:
      requireNonBlankString(
        row.created_at,
        "persisted prediction created_at"
      ),
  };
}

function assertPersistedIdentity(
  persisted: PersistedRouteRiskShadowPrediction,
  expected: {
    organizationId: string;
    productionSnapshotId: string;
    modelRegistryId: string;
    trainingRunId: string;
    evidenceCycleId: string;
  }
) {
  if (
    persisted.organizationId !==
    expected.organizationId
  ) {
    throw new Error(
      "Persisted route-risk shadow prediction organization identity mismatch."
    );
  }

  if (
    persisted.productionSnapshotId !==
    expected.productionSnapshotId
  ) {
    throw new Error(
      "Persisted route-risk shadow prediction snapshot identity mismatch."
    );
  }

  if (
    persisted.modelRegistryId !==
    expected.modelRegistryId
  ) {
    throw new Error(
      "Persisted route-risk shadow prediction registry identity mismatch."
    );
  }

  if (
    persisted.trainingRunId !==
    expected.trainingRunId
  ) {
    throw new Error(
      "Persisted route-risk shadow prediction training-run identity mismatch."
    );
  }

  if (
    persisted.evidenceCycleId !==
    expected.evidenceCycleId
  ) {
    throw new Error(
      "Persisted route-risk shadow prediction evidence-cycle identity mismatch."
    );
  }
}

/**
 * Persists immutable HarborGuard route-risk shadow inference evidence.
 *
 * Important boundaries:
 *
 * - The caller supplies the trusted Supabase client.
 * - Model identity/version values are derived only from the validated
 *   RouteRiskShadowModelArtifact.
 * - Prediction-time feature values are persisted explicitly.
 * - This helper performs no model scoring.
 * - This helper performs no lifecycle mutation.
 * - This helper performs no Route Safety integration.
 * - A retry for the same production snapshot/model registry pair is
 *   idempotent: PostgreSQL 23505 is resolved by reading the existing row.
 * - All other persistence errors fail closed.
 */
export async function persistRouteRiskShadowPrediction({
  supabase,
  productionSnapshotId,
  artifact,
  features,
  prediction,
  metadata = {},
}: PersistRouteRiskShadowPredictionInput): Promise<
  PersistRouteRiskShadowPredictionResult
> {
  const normalizedProductionSnapshotId =
    requireNonBlankString(
      productionSnapshotId,
      "productionSnapshotId"
    );

  const organizationId =
    requireNonBlankString(
      artifact.organizationId,
      "artifact.organizationId"
    );

  const modelRegistryId =
    requireNonBlankString(
      artifact.registryId,
      "artifact.registryId"
    );

  const trainingRunId =
    requireNonBlankString(
      artifact.trainingRunId,
      "artifact.trainingRunId"
    );

  const runVersion =
    requireNonBlankString(
      artifact.runVersion,
      "artifact.runVersion"
    );

  const datasetFingerprint =
    requireDatasetFingerprint(
      artifact.datasetFingerprint
    );

  const algorithmVersion =
    requireNonBlankString(
      artifact.model.algorithmVersion,
      "artifact.model.algorithmVersion"
    );

  const trainingContractVersion =
    requireNonBlankString(
      artifact.model.trainingContractVersion,
      "artifact.model.trainingContractVersion"
    );

  const featureSchemaVersion =
    requireNonBlankString(
      artifact.model.featureSchemaVersion,
      "artifact.model.featureSchemaVersion"
    );

  const labelSchemaVersion =
    requireNonBlankString(
      artifact.model.labelSchemaVersion,
      "artifact.model.labelSchemaVersion"
    );

  const overallRiskScore =
    requireRiskScore(
      features.overallRiskScore,
      "features.overallRiskScore"
    );

  const threatRiskScore =
    requireRiskScore(
      features.threatRiskScore,
      "features.threatRiskScore"
    );

  const weatherRiskScore =
    requireRiskScore(
      features.weatherRiskScore,
      "features.weatherRiskScore"
    );

  const trafficRiskScore =
    requireRiskScore(
      features.trafficRiskScore,
      "features.trafficRiskScore"
    );

  const predictedProbability =
    requireProbability(
      prediction.predictedProbability
    );

  const normalizedMetadata =
    requireMetadata(
      metadata
    );

  /*
   * Resolve the single currently open evidence cycle for the exact
   * organization/model/training artifact identity.
   *
   * The cycle schema permits at most one open cycle per model registry.
   * Prediction persistence fails closed if that prerequisite is absent.
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
        modelRegistryId
      )
      .eq(
        "training_run_id",
        trainingRunId
      )
      .is(
        "ended_at",
        null
      )
      .maybeSingle();

  if (openEvidenceCycleError) {
    throw new Error(
      "Failed to resolve open evidence cycle for route-risk shadow prediction: " +
        openEvidenceCycleError.message
    );
  }

  if (!openEvidenceCycleRow) {
    throw new Error(
      "Route-risk shadow prediction requires an open evidence cycle for the exact model artifact identity."
    );
  }

  const evidenceCycleId =
    requireNonBlankString(
      openEvidenceCycleRow.id,
      "open evidence cycle id"
    );

  const expectedIdentity = {
    organizationId,
    productionSnapshotId:
      normalizedProductionSnapshotId,
    modelRegistryId,
    trainingRunId,
    evidenceCycleId,
  };

  const {
    data: insertedRow,
    error: insertError,
  } =
    await supabase
      .from(
        "route_risk_shadow_predictions"
      )
      .insert({
        organization_id:
          organizationId,

        production_snapshot_id:
          normalizedProductionSnapshotId,

        model_registry_id:
          modelRegistryId,

        training_run_id:
          trainingRunId,

        evidence_cycle_id:
          evidenceCycleId,

        feature_schema_version:
          featureSchemaVersion,

        training_contract_version:
          trainingContractVersion,

        label_schema_version:
          labelSchemaVersion,

        algorithm_version:
          algorithmVersion,

        run_version:
          runVersion,

        dataset_fingerprint:
          datasetFingerprint,

        overall_risk_score:
          overallRiskScore,

        threat_risk_score:
          threatRiskScore,

        weather_risk_score:
          weatherRiskScore,

        traffic_risk_score:
          trafficRiskScore,

        predicted_probability:
          predictedProbability,

        metadata:
          normalizedMetadata,
      })
      .select(
        SHADOW_PREDICTION_SELECT
      )
      .single();

  if (!insertError) {
    const persisted =
      parsePersistedRow(
        insertedRow
      );

    assertPersistedIdentity(
      persisted,
      expectedIdentity
    );

    return {
      status: "created",
      prediction:
        persisted,
    };
  }

  if (insertError.code !== "23505") {
    throw new Error(
      "Failed to persist route-risk shadow prediction: " +
        insertError.message
    );
  }

  const {
    data: existingRow,
    error: existingError,
  } =
    await supabase
      .from(
        "route_risk_shadow_predictions"
      )
      .select(
        SHADOW_PREDICTION_SELECT
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "production_snapshot_id",
        normalizedProductionSnapshotId
      )
      .eq(
        "model_registry_id",
        modelRegistryId
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      "Failed to read existing route-risk shadow prediction after duplicate insert: " +
        existingError.message
    );
  }

  if (!existingRow) {
    throw new Error(
      "Route-risk shadow prediction duplicate was reported but the existing row could not be found."
    );
  }

  const persisted =
    parsePersistedRow(
      existingRow
    );

  assertPersistedIdentity(
    persisted,
    expectedIdentity
  );

  return {
    status: "existing",
    prediction:
      persisted,
  };
}
