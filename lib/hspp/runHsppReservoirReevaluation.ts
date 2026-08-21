import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,
  readHsppReservoirCandidates,
  type ReadHsppReservoirCandidatesResult,
} from "@/lib/hspp/readHsppReservoirCandidates";

import {
  HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
  evaluateHsppReservoirReevaluation,
  type HsppReservoirReevaluationResult,
} from "@/lib/hspp/evaluateHsppReservoirReevaluation";

export const HSPP_RESERVOIR_REEVALUATION_RUNNER_VERSION =
  "hspp-reservoir-reevaluation-runner-v1" as const;

export type RunHsppReservoirReevaluationInput = {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
};

export type RunHsppReservoirReevaluationResult = {
  runnerVersion: typeof HSPP_RESERVOIR_REEVALUATION_RUNNER_VERSION;

  discoveryPolicyVersion: typeof HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION;

  reevaluationPolicyVersion: typeof HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION;

  organizationId: string;

  discovery: ReadHsppReservoirCandidatesResult;

  reevaluation: HsppReservoirReevaluationResult;
};

/**
 * B7490-07B bounded Lifeguard execution boundary.
 *
 * This runner deliberately composes the existing Reservoir
 * discovery and Lifeguard reevaluation primitives only.
 *
 * It does NOT:
 *
 * - create evidence assemblies;
 * - persist assembly members;
 * - persist Lifeguard decisions;
 * - modify evidence trust;
 * - apply assessments;
 * - promote Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - schedule or automatically execute Lifeguard.
 */
export async function runHsppReservoirReevaluation(
  input: RunHsppReservoirReevaluationInput,
): Promise<RunHsppReservoirReevaluationResult> {
  const discovery = await readHsppReservoirCandidates({
    supabase: input.supabase,
    organizationId: input.organizationId,
    limit: input.limit,
  });

  const reevaluation = evaluateHsppReservoirReevaluation(discovery.candidates);

  return {
    runnerVersion: HSPP_RESERVOIR_REEVALUATION_RUNNER_VERSION,

    discoveryPolicyVersion: HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

    reevaluationPolicyVersion: HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,

    organizationId: discovery.organizationId,

    discovery,

    reevaluation,
  };
}
