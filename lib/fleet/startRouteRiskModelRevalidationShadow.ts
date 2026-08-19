import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_REVALIDATION_SHADOW_RPC =
  "start_route_risk_model_revalidation_shadow" as const;

export type StartRouteRiskModelRevalidationShadowInput = {
  supabase: SupabaseClient;
  registryId: string;
  rationale: string;
};

export type StartedRouteRiskModelRevalidationShadow = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: "shadow";
  shadowStartedAt: string;

  previousActivatedAt: string;
  previousRetiredAt: string;

  evidenceCycleId: string;
  evidenceCycleNumber: number;
  evidenceCycleKind: "revalidation_shadow";
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
 * Starts a controlled revalidation shadow episode for one explicitly chosen
 * retired HarborGuard route-risk model.
 *
 * Authority remains inside the authenticated database RPC.
 *
 * This helper:
 *
 * - requires explicit registry identity and human rationale;
 * - preserves previous activation and retirement provenance;
 * - creates no automatic rollback;
 * - does not reactivate the model;
 * - does not select another model;
 * - does not trigger retraining;
 * - does not calculate promotion readiness;
 * - does not select production thresholds;
 * - does not modify production Route Safety behavior.
 */
export async function startRouteRiskModelRevalidationShadow({
  supabase,
  registryId,
  rationale,
}: StartRouteRiskModelRevalidationShadowInput): Promise<
  StartedRouteRiskModelRevalidationShadow
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
      ROUTE_RISK_MODEL_REVALIDATION_SHADOW_RPC,
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

  const result =
    responseObject(data);

  if (!result) {
    throw new Error(
      "Route-risk revalidation shadow transition returned an invalid response."
    );
  }

  const registry =
    responseObject(
      result.registry
    );

  const evidenceCycle =
    responseObject(
      result.evidenceCycle
    );

  if (
    !registry ||
    typeof registry.id !== "string" ||
    !registry.id ||
    typeof registry.organization_id !== "string" ||
    !registry.organization_id ||
    typeof registry.training_run_id !== "string" ||
    !registry.training_run_id ||
    registry.lifecycle_status !== "shadow" ||
    typeof registry.shadow_started_at !== "string" ||
    !registry.shadow_started_at ||
    typeof registry.activated_at !== "string" ||
    !registry.activated_at ||
    typeof registry.retired_at !== "string" ||
    !registry.retired_at
  ) {
    throw new Error(
      "Route-risk revalidation shadow transition returned an invalid registry record."
    );
  }

  if (
    registry.id !==
      normalizedRegistryId
  ) {
    throw new Error(
      "Route-risk revalidation shadow transition returned the wrong registry."
    );
  }

  if (
    !evidenceCycle ||
    typeof evidenceCycle.id !== "string" ||
    !evidenceCycle.id ||
    evidenceCycle.model_registry_id !==
      registry.id ||
    evidenceCycle.training_run_id !==
      registry.training_run_id ||
    evidenceCycle.organization_id !==
      registry.organization_id ||
    evidenceCycle.cycle_kind !==
      "revalidation_shadow" ||
    typeof evidenceCycle.cycle_number !==
      "number" ||
    !Number.isInteger(
      evidenceCycle.cycle_number
    ) ||
    evidenceCycle.cycle_number <= 1
  ) {
    throw new Error(
      "Route-risk revalidation shadow transition returned an invalid evidence cycle."
    );
  }

  return {
    registryId:
      registry.id,

    organizationId:
      registry.organization_id,

    trainingRunId:
      registry.training_run_id,

    lifecycleStatus:
      "shadow",

    shadowStartedAt:
      registry.shadow_started_at,

    previousActivatedAt:
      registry.activated_at,

    previousRetiredAt:
      registry.retired_at,

    evidenceCycleId:
      evidenceCycle.id,

    evidenceCycleNumber:
      evidenceCycle.cycle_number,

    evidenceCycleKind:
      "revalidation_shadow",
  };
}
