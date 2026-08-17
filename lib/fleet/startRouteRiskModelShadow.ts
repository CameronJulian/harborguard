import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_SHADOW_TRANSITION_RPC =
  "start_route_risk_model_shadow" as const;

export type StartRouteRiskModelShadowInput = {
  supabase: SupabaseClient;
  registryId: string;
  rationale: string;
};

export type StartedRouteRiskModelShadow = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: "shadow";
  shadowStartedAt: string;
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
 * Starts the explicit shadow lifecycle phase for one already-approved
 * HarborGuard route-risk model.
 *
 * Authority remains inside the database RPC:
 *
 * - The supplied Supabase client must carry the authenticated user session.
 * - The RPC resolves and authorizes the lifecycle actor.
 * - The database requires the model to already be approved.
 * - A nonblank human rationale is required.
 * - This helper does not approve a candidate.
 * - This helper does not perform shadow inference.
 * - This helper does not write shadow predictions.
 * - This helper does not activate or retire a model.
 * - This helper does not select production thresholds.
 * - This helper does not modify production Route Safety behavior.
 */
export async function startRouteRiskModelShadow({
  supabase,
  registryId,
  rationale,
}: StartRouteRiskModelShadowInput): Promise<
  StartedRouteRiskModelShadow
> {
  const normalizedRegistryId =
    requireNonEmptyString(
      registryId,
      "registryId"
    );

  const normalizedRationale =
    requireNonEmptyString(
      rationale,
      "rationale"
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      ROUTE_RISK_MODEL_SHADOW_TRANSITION_RPC,
      {
        p_registry_id:
          normalizedRegistryId,

        p_rationale:
          normalizedRationale,
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
    row.lifecycle_status !== "shadow" ||
    typeof row.shadow_started_at !== "string" ||
    !row.shadow_started_at
  ) {
    throw new Error(
      "Route-risk shadow transition returned an invalid registry record."
    );
  }

  if (
    row.id !==
      normalizedRegistryId
  ) {
    throw new Error(
      "Route-risk shadow transition returned the wrong registry."
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
      "shadow",

    shadowStartedAt:
      row.shadow_started_at,
  };
}
