import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskOfflineTrainingRun,
} from "@/lib/fleet/runRouteRiskOfflineTraining";

export type PersistRouteRiskTrainingRunInput = {
  supabase: SupabaseClient;
  organizationId: string;
  run: RouteRiskOfflineTrainingRun;
};

export type PersistedRouteRiskTrainingRun = {
  id: string;
  createdAt: string;
};

function requireNonEmptyString(
  value: string,
  fieldName: string
) {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

/**
 * Persists one already-completed HarborGuard offline route-risk
 * training run as an immutable historical record.
 *
 * Persistence boundary:
 *
 * - The caller supplies the Supabase client.
 * - The caller supplies the organization identity.
 * - The completed training artifact is stored without mutation.
 * - The manifest's deterministic dataset fingerprint becomes the
 *   indexed dataset identity.
 * - This helper does not train a model.
 * - This helper does not select a threshold.
 * - This helper does not approve or activate a model.
 * - This helper does not alter live route-risk scoring.
 * - The database prevents UPDATE and DELETE of the persisted row.
 */
export async function persistRouteRiskTrainingRun({
  supabase,
  organizationId,
  run,
}: PersistRouteRiskTrainingRunInput): Promise<
  PersistedRouteRiskTrainingRun
> {
  const normalizedOrganizationId =
    requireNonEmptyString(
      organizationId,
      "organizationId"
    );

  const datasetFingerprint =
    requireNonEmptyString(
      run.manifest.datasetFingerprint,
      "run.manifest.datasetFingerprint"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from("route_risk_training_runs")
      .insert({
        organization_id:
          normalizedOrganizationId,

        run_version:
          run.runVersion,

        dataset_fingerprint:
          datasetFingerprint,

        manifest:
          run.manifest,

        model:
          run.model,

        validation_evaluation:
          run.validationEvaluation,

        test_evaluation:
          run.testEvaluation,
      })
      .select(
        "id,created_at"
      )
      .single();

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.created_at !== "string"
  ) {
    throw new Error(
      "Persisted route-risk training run did not return its immutable record identity."
    );
  }

  return {
    id:
      data.id,

    createdAt:
      data.created_at,
  };
}
