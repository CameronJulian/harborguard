import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_RETIREMENT_RPC =
  "retire_route_risk_model" as const;

export type RetireRouteRiskModelInput = {
  supabase: SupabaseClient;
  registryId: string;
  rationale: string;
};

export type RetiredRouteRiskModel = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: "retired";
  activatedAt: string;
  retiredAt: string;
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

function responseObject(
  data: unknown
): Record<string, unknown> | null {
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data as Record<string, unknown>;
  }

  if (Array.isArray(data)) {
    const first =
      data[0];

    return (
      first &&
      typeof first === "object" &&
      !Array.isArray(first)
    )
      ? first as Record<string, unknown>
      : null;
  }

  return null;
}

/**
 * Retires one explicit active HarborGuard route-risk model through the
 * controlled authenticated lifecycle RPC.
 *
 * Authority remains inside the database RPC:
 *
 * - The supplied Supabase client must carry the authenticated user session.
 * - The RPC resolves and authorizes the owner/admin lifecycle actor.
 * - The database requires the requested model to already be active.
 * - A nonblank human rationale is required.
 * - This helper does not select a replacement model.
 * - This helper does not reactivate a retired model.
 * - This helper does not perform automatic rollback.
 * - This helper does not trigger retraining.
 * - This helper does not read lifecycle state into Route Safety.
 * - This helper does not alter production Route Safety scoring or decisions.
 */
export async function retireRouteRiskModel({
  supabase,
  registryId,
  rationale,
}: RetireRouteRiskModelInput): Promise<
  RetiredRouteRiskModel
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
      ROUTE_RISK_MODEL_RETIREMENT_RPC,
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
    responseObject(data);

  if (!row) {
    throw new Error(
      "Route-risk model retirement returned an invalid response."
    );
  }

  if (
    typeof row.id !== "string" ||
    !row.id ||
    typeof row.organization_id !== "string" ||
    !row.organization_id ||
    typeof row.training_run_id !== "string" ||
    !row.training_run_id ||
    row.lifecycle_status !== "retired" ||
    typeof row.activated_at !== "string" ||
    !row.activated_at ||
    typeof row.retired_at !== "string" ||
    !row.retired_at
  ) {
    throw new Error(
      "Route-risk model retirement returned an invalid lifecycle record."
    );
  }

  if (
    row.id !== normalizedRegistryId
  ) {
    throw new Error(
      "Route-risk model retirement returned the wrong registry."
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
      "retired",

    activatedAt:
      row.activated_at,

    retiredAt:
      row.retired_at,
  };
}
