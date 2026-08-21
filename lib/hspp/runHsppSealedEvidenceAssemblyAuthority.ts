import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyDecisionPersistence,
  type RunHsppSealedEvidenceAssemblyDecisionPersistenceResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyDecisionPersistence";

import {
  HSPP_ASSEMBLY_AUTHORITY_VERSION,
  evaluateHsppAssemblyAuthority,
  type HsppAssemblyAuthorityDecision,
} from "@/lib/hspp/evaluateHsppAssemblyAuthority";

export const HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION =
  "hspp-sealed-assembly-authority-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyAuthorityInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyAuthorityResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION;

  decisionPersistenceRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION;

  authorityPolicyVersion: typeof HSPP_ASSEMBLY_AUTHORITY_VERSION;

  organizationId: string;

  assemblyId: string;

  decisionPersistence: RunHsppSealedEvidenceAssemblyDecisionPersistenceResult;

  authorityDecision: HsppAssemblyAuthorityDecision;
};

/**
 * B7490-07H SEALED assembly-authority runner.
 *
 * This boundary composes exactly:
 *
 *   B07G decision persistence
 *       ->
 *   B11F1 assembly-authority candidacy evaluation
 *
 * The exact immutable B11E persisted decision returned by B07G is
 * passed directly into evaluateHsppAssemblyAuthority().
 *
 * This runner stops immediately after authority candidacy evaluation.
 *
 * ASSESSMENT_CANDIDATE remains authority NONE and grants no:
 *
 * - CORROBORATED trust;
 * - VERIFIED trust;
 * - operational eligibility;
 * - Route Safety authority;
 * - Crowd Intelligence eligibility;
 * - ML training eligibility;
 * - ML validation eligibility;
 * - physical-world truth.
 *
 * This runner deliberately does NOT:
 *
 * - perform direct database reads or writes;
 * - load assembly members separately;
 * - build B11F2 assessment input;
 * - persist corroborated-member assessments;
 * - call applyHsppAssessmentDecision();
 * - mutate evidence trust or validation state;
 * - grant operational authority;
 * - disassemble the assembly;
 * - return evidence to the Reservoir;
 * - reconstruct or supersede an assembly;
 * - create an API route;
 * - create cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyAuthority(
  input: RunHsppSealedEvidenceAssemblyAuthorityInput,
): Promise<RunHsppSealedEvidenceAssemblyAuthorityResult> {
  const decisionPersistence =
    await runHsppSealedEvidenceAssemblyDecisionPersistence({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,
    });

  const authorityDecision = evaluateHsppAssemblyAuthority(
    decisionPersistence.persistedDecision,
  );

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION,

    decisionPersistenceRunnerVersion: decisionPersistence.runnerVersion,

    authorityPolicyVersion: authorityDecision.policyVersion,

    organizationId: decisionPersistence.organizationId,

    assemblyId: decisionPersistence.assemblyId,

    decisionPersistence,

    authorityDecision,
  };
}
