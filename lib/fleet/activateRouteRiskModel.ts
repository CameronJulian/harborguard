import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_ACTIVATION_RPC =
  "activate_route_risk_model" as const;

export type ActivateRouteRiskModelInput = {
  supabase: SupabaseClient;
  registryId: string;
  rationale: string;
};

export type ActivatedRouteRiskModelRecord = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: "active";
  activatedAt: string;
};

export type RetiredRouteRiskModelRecord = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus: "retired";
  retiredAt: string;
};

export type ActivatedRouteRiskModel = {
  activated: ActivatedRouteRiskModelRecord;
  retired: RetiredRouteRiskModelRecord | null;
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

function requireLifecycleRecord(
  value: unknown,
  expectedStatus:
    | "active"
    | "retired",
  timestampField:
    | "activated_at"
    | "retired_at"
):
  | ActivatedRouteRiskModelRecord
  | RetiredRouteRiskModelRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Route-risk model activation returned an invalid lifecycle record."
    );
  }

  const row =
    value as Record<string, unknown>;

  const timestamp =
    row[timestampField];

  if (
    typeof row.id !== "string" ||
    !row.id ||
    typeof row.organization_id !== "string" ||
    !row.organization_id ||
    typeof row.training_run_id !== "string" ||
    !row.training_run_id ||
    row.lifecycle_status !== expectedStatus ||
    typeof timestamp !== "string" ||
    !timestamp
  ) {
    throw new Error(
      "Route-risk model activation returned an invalid lifecycle record."
    );
  }

  if (expectedStatus === "active") {
    return {
      registryId:
        row.id,

      organizationId:
        row.organization_id,

      trainingRunId:
        row.training_run_id,

      lifecycleStatus:
        "active",

      activatedAt:
        timestamp,
    };
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

    retiredAt:
      timestamp,
  };
}

/**
 * Activates one explicit HarborGuard route-risk shadow model through the
 * controlled authenticated lifecycle RPC.
 *
 * Authority remains inside the database RPC:
 *
 * - The supplied Supabase client must carry the authenticated user session.
 * - The RPC resolves and authorizes the owner/admin lifecycle actor.
 * - The database requires the requested model to already be in shadow.
 * - A nonblank human rationale is required.
 * - The RPC atomically retires the organization's previous active model when
 *   one exists.
 * - This helper does not calculate promotion readiness.
 * - This helper does not automatically choose a model to activate.
 * - This helper does not trigger retraining.
 * - This helper does not select production thresholds.
 * - This helper does not read an active model into Route Safety.
 * - This helper does not modify production Route Safety scoring or decisions.
 */
export async function activateRouteRiskModel({
  supabase,
  registryId,
  rationale,
}: ActivateRouteRiskModelInput): Promise<
  ActivatedRouteRiskModel
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
      ROUTE_RISK_MODEL_ACTIVATION_RPC,
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
      "Route-risk model activation returned an invalid response."
    );
  }

  const activated =
    requireLifecycleRecord(
      result.activated,
      "active",
      "activated_at"
    ) as ActivatedRouteRiskModelRecord;

  if (
    activated.registryId !==
      normalizedRegistryId
  ) {
    throw new Error(
      "Route-risk model activation returned the wrong activated registry."
    );
  }

  let retired:
    RetiredRouteRiskModelRecord | null =
      null;

  if (
    result.retired !== null &&
    result.retired !== undefined
  ) {
    retired =
      requireLifecycleRecord(
        result.retired,
        "retired",
        "retired_at"
      ) as RetiredRouteRiskModelRecord;

    if (
      retired.organizationId !==
        activated.organizationId
    ) {
      throw new Error(
        "Route-risk model activation returned a retired model from the wrong organization."
      );
    }

    if (
      retired.registryId ===
        activated.registryId
    ) {
      throw new Error(
        "Route-risk model activation returned the activated model as retired."
      );
    }
  }

  return {
    activated,
    retired,
  };
}
