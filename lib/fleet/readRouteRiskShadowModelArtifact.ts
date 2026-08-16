import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  parseRouteRiskLogisticBaselineModel,
} from "@/lib/fleet/parseRouteRiskLogisticBaselineModel";

import type {
  RouteRiskLogisticBaselineModel,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

export type ReadRouteRiskShadowModelArtifactInput = {
  supabase: SupabaseClient;
  organizationId: string;
};

export type RouteRiskShadowModelArtifact = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  shadowStartedAt: string;
  runVersion: string;
  datasetFingerprint: string;
  trainingRunCreatedAt: string;
  model: RouteRiskLogisticBaselineModel;
};

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
      "training run dataset_fingerprint"
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      fingerprint
    )
  ) {
    throw new Error(
      "Invalid training run dataset_fingerprint."
    );
  }

  return fingerprint;
}

/**
 * Reads the currently shadowed route-risk model artifact for one
 * organization.
 *
 * Absence is returned as null so callers can safely skip shadow inference.
 * Multiple shadow rows are treated as invalid lifecycle state and fail
 * closed rather than choosing one implicitly.
 *
 * This helper:
 * - performs SELECT operations only;
 * - explicitly scopes every query to organizationId;
 * - performs no scoring;
 * - performs no persistence;
 * - performs no lifecycle mutation;
 * - performs no Route Safety integration.
 */
export async function readRouteRiskShadowModelArtifact({
  supabase,
  organizationId,
}: ReadRouteRiskShadowModelArtifactInput): Promise<
  RouteRiskShadowModelArtifact | null
> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const {
    data: registryRows,
    error: registryError,
  } =
    await supabase
      .from(
        "route_risk_model_registry"
      )
      .select(
        "id, organization_id, training_run_id, lifecycle_status, shadow_started_at"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "lifecycle_status",
        "shadow"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(2);

  if (registryError) {
    throw new Error(
      "Failed to read route-risk shadow model registry: " +
        registryError.message
    );
  }

  if (!Array.isArray(registryRows)) {
    throw new Error(
      "Invalid route-risk shadow registry response."
    );
  }

  if (registryRows.length === 0) {
    return null;
  }

  if (registryRows.length > 1) {
    throw new Error(
      "Invalid route-risk lifecycle state: multiple shadow models exist for the organization."
    );
  }

  const registryRow =
    registryRows[0];

  if (
    !registryRow ||
    typeof registryRow !== "object"
  ) {
    throw new Error(
      "Invalid route-risk shadow registry row."
    );
  }

  const registryId =
    requireNonBlankString(
      registryRow.id,
      "registry.id"
    );

  const registryOrganizationId =
    requireNonBlankString(
      registryRow.organization_id,
      "registry.organization_id"
    );

  if (
    registryOrganizationId !==
    normalizedOrganizationId
  ) {
    throw new Error(
      "Route-risk shadow registry organization mismatch."
    );
  }

  if (
    registryRow.lifecycle_status !==
    "shadow"
  ) {
    throw new Error(
      "Route-risk registry row is not in shadow lifecycle status."
    );
  }

  const trainingRunId =
    requireNonBlankString(
      registryRow.training_run_id,
      "registry.training_run_id"
    );

  const shadowStartedAt =
    requireNonBlankString(
      registryRow.shadow_started_at,
      "registry.shadow_started_at"
    );

  const {
    data: trainingRun,
    error: trainingRunError,
  } =
    await supabase
      .from(
        "route_risk_training_runs"
      )
      .select(
        "id, organization_id, run_version, dataset_fingerprint, model, created_at"
      )
      .eq(
        "id",
        trainingRunId
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .maybeSingle();

  if (trainingRunError) {
    throw new Error(
      "Failed to read immutable route-risk training artifact: " +
        trainingRunError.message
    );
  }

  if (!trainingRun) {
    throw new Error(
      "Route-risk shadow model training artifact is unavailable."
    );
  }

  const resolvedTrainingRunId =
    requireNonBlankString(
      trainingRun.id,
      "training run id"
    );

  if (
    resolvedTrainingRunId !==
    trainingRunId
  ) {
    throw new Error(
      "Route-risk training artifact identity mismatch."
    );
  }

  const trainingOrganizationId =
    requireNonBlankString(
      trainingRun.organization_id,
      "training run organization_id"
    );

  if (
    trainingOrganizationId !==
    normalizedOrganizationId
  ) {
    throw new Error(
      "Route-risk training artifact organization mismatch."
    );
  }

  const runVersion =
    requireNonBlankString(
      trainingRun.run_version,
      "training run_version"
    );

  const datasetFingerprint =
    requireDatasetFingerprint(
      trainingRun.dataset_fingerprint
    );

  const trainingRunCreatedAt =
    requireNonBlankString(
      trainingRun.created_at,
      "training run created_at"
    );

  const model =
    parseRouteRiskLogisticBaselineModel(
      trainingRun.model
    );

  return {
    registryId,
    organizationId:
      normalizedOrganizationId,
    trainingRunId,
    shadowStartedAt,
    runVersion,
    datasetFingerprint,
    trainingRunCreatedAt,
    model,
  };
}
