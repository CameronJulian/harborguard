import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_CANDIDATE_REGISTRATION_RPC =
  "register_route_risk_model_candidate" as const;

export type RegisterRouteRiskModelCandidateInput = {
  supabase: SupabaseClient;
  organizationId: string;
  trainingRunId: string;
};

export type RegisteredRouteRiskModelCandidate = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: string;
};

function requireNonEmptyString(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function responseRow(
  data: unknown
): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first =
      data[0];

    return (
      first &&
      typeof first === "object"
    )
      ? first as Record<string, unknown>
      : null;
  }

  return (
    data &&
    typeof data === "object"
  )
    ? data as Record<string, unknown>
    : null;
}

/**
 * Registers one already-persisted immutable HarborGuard route-risk
 * training run as a lifecycle candidate.
 *
 * Registration boundary:
 *
 * - The caller supplies the server-side Supabase client.
 * - The caller supplies the organization identity.
 * - The caller supplies an already-persisted training-run identity.
 * - Registration is delegated to the service-role-only database RPC.
 * - Repeated registration is idempotent by immutable training-run identity.
 * - This helper does not train a model.
 * - This helper does not approve or reject a candidate.
 * - This helper does not enter shadow mode.
 * - This helper does not activate or retire a model.
 * - This helper does not select a production threshold.
 * - This helper does not modify production Route Safety behavior.
 */
export async function registerRouteRiskModelCandidate({
  supabase,
  organizationId,
  trainingRunId,
}: RegisterRouteRiskModelCandidateInput): Promise<
  RegisteredRouteRiskModelCandidate
> {
  const normalizedOrganizationId =
    requireNonEmptyString(
      organizationId,
      "organizationId"
    );

  const normalizedTrainingRunId =
    requireNonEmptyString(
      trainingRunId,
      "trainingRunId"
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      ROUTE_RISK_MODEL_CANDIDATE_REGISTRATION_RPC,
      {
        p_training_run_id:
          normalizedTrainingRunId,

        p_organization_id:
          normalizedOrganizationId,
      }
    );

  if (error) {
    throw error;
  }

  const row =
    responseRow(data);

  if (
    !row ||
    typeof row.id !== "string" ||
    !row.id ||
    typeof row.organization_id !== "string" ||
    !row.organization_id ||
    typeof row.training_run_id !== "string" ||
    !row.training_run_id ||
    typeof row.lifecycle_status !== "string" ||
    !row.lifecycle_status
  ) {
    throw new Error(
      "Route-risk candidate registration returned an invalid registry record."
    );
  }

  if (
    row.organization_id !==
      normalizedOrganizationId
  ) {
    throw new Error(
      "Route-risk candidate registration returned the wrong organization."
    );
  }

  if (
    row.training_run_id !==
      normalizedTrainingRunId
  ) {
    throw new Error(
      "Route-risk candidate registration returned the wrong training run."
    );
  }

  return {
    registryId:
      row.id,

    organizationId:
      row.organization_id,

    trainingRunId:
      row.training_run_id,

    lifecycleStatus:
      row.lifecycle_status,
  };
}
