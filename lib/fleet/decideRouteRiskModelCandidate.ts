import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const ROUTE_RISK_MODEL_CANDIDATE_DECISION_RPC =
  "decide_route_risk_model_candidate" as const;

export type RouteRiskModelCandidateDecision =
  | "approved"
  | "rejected";

export type DecideRouteRiskModelCandidateInput = {
  supabase: SupabaseClient;
  registryId: string;
  decision: RouteRiskModelCandidateDecision;
  rationale: string;
};

export type DecidedRouteRiskModelCandidate = {
  registryId: string;
  organizationId: string;
  trainingRunId: string;
  lifecycleStatus:
    | "approved"
    | "rejected";
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

function requireDecision(
  decision: RouteRiskModelCandidateDecision
): RouteRiskModelCandidateDecision {
  if (
    decision !== "approved" &&
    decision !== "rejected"
  ) {
    throw new Error(
      "decision must be approved or rejected."
    );
  }

  return decision;
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
 * Applies one explicit authenticated human lifecycle decision to one
 * already-registered HarborGuard route-risk model candidate.
 *
 * Authority remains inside the database RPC:
 *
 * - The supplied Supabase client must carry the authenticated user session.
 * - The RPC resolves the actor from auth.uid().
 * - The RPC resolves organization and role from profiles.
 * - Only an owner/admin in the candidate organization may decide.
 * - Approval and rejection are explicit caller choices.
 * - A nonblank human rationale is required.
 * - This helper does not inspect or override database evidence gates.
 * - This helper does not enter shadow mode.
 * - This helper does not activate or retire a model.
 * - This helper does not select production performance thresholds.
 * - This helper does not modify production Route Safety behavior.
 */
export async function decideRouteRiskModelCandidate({
  supabase,
  registryId,
  decision,
  rationale,
}: DecideRouteRiskModelCandidateInput): Promise<
  DecidedRouteRiskModelCandidate
> {
  const normalizedRegistryId =
    requireNonEmptyString(
      registryId,
      "registryId"
    );

  const normalizedDecision =
    requireDecision(
      decision
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
      ROUTE_RISK_MODEL_CANDIDATE_DECISION_RPC,
      {
        p_registry_id:
          normalizedRegistryId,

        p_decision:
          normalizedDecision,

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
    (
      row.lifecycle_status !== "approved" &&
      row.lifecycle_status !== "rejected"
    )
  ) {
    throw new Error(
      "Route-risk candidate decision returned an invalid registry record."
    );
  }

  if (
    row.id !==
      normalizedRegistryId
  ) {
    throw new Error(
      "Route-risk candidate decision returned the wrong registry."
    );
  }

  if (
    row.lifecycle_status !==
      normalizedDecision
  ) {
    throw new Error(
      "Route-risk candidate decision returned the wrong lifecycle status."
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
