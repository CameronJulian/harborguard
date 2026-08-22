import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  evaluateHsppCorroboratedOperationalAuthority,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "@/lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-operational-authority-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic B11F6 retry identity.
     *
     * Q3 passes this value unchanged into Q2.
     * Q3 does not generate, normalize or reinterpret it.
     */
    assessedAt: string;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION;

    corroboratedAssessmentPersistenceRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION;

    authorityPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult["targetMemberOrdinal"];

    corroboratedAssessmentPersistence: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult;

    authorityDecision: HsppCorroboratedOperationalAuthorityDecision;
  };

/**
 * Extract the exact B11F6 persisted assessment returned by Q2.
 *
 * This preparation does not reconstruct, clone, normalize,
 * re-evaluate or mutate the persisted assessment.
 *
 * B11G2 remains the sole authority-candidacy policy.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(
  corroboratedAssessmentPersistence: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult,
): RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult["persistedAssessment"] {
  if (
    !corroboratedAssessmentPersistence ||
    typeof corroboratedAssessmentPersistence !== "object"
  ) {
    throw new Error(
      "B7490-07Q3 requires one completed B7490-07Q2 persistence run.",
    );
  }

  const persistedAssessment =
    corroboratedAssessmentPersistence.persistedAssessment;

  if (!persistedAssessment || typeof persistedAssessment !== "object") {
    throw new Error(
      "B7490-07Q3 requires the exact persisted B11F6 assessment returned by Q2.",
    );
  }

  return persistedAssessment;
}

/**
 * B7490-07Q3 SEALED assembly corroborated operational-authority runner.
 *
 * This boundary composes exactly:
 *
 *   existing B7490-07Q2 corroborated-assessment persistence
 *       ->
 *   existing B11G2 operational-authority candidacy evaluation
 *
 * Q3 passes Q2's exact persistedAssessment object into B11G2.
 *
 * The complete Q2 result and complete B11G2 decision are retained
 * as provenance in the Q3 result.
 *
 * assessedAt remains caller-controlled and is passed unchanged to Q2.
 *
 * This runner stops immediately after B11G2 candidacy evaluation.
 *
 * OPERATIONAL_AUTHORITY_CANDIDATE is not an operational grant.
 *
 * This runner deliberately does NOT:
 *
 * - call B07P directly;
 * - call B11F6 directly;
 * - reconstruct persistedAssessment;
 * - call applyHsppAssessmentDecision;
 * - generate or canonicalize assessedAt;
 * - persist the B11G2 result;
 * - create authority-candidate storage;
 * - grant operational authority;
 * - enable operational use;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training eligibility;
 * - grant validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - perform direct database access;
 * - create API, UI, cron, queue, retry or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(
  input: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult> {
  const corroboratedAssessmentPersistence =
    await runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,

      assessedAt: input.assessedAt,
    });

  const persistedAssessment =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(
      corroboratedAssessmentPersistence,
    );

  const authorityDecision =
    evaluateHsppCorroboratedOperationalAuthority(persistedAssessment);

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION,

    corroboratedAssessmentPersistenceRunnerVersion:
      corroboratedAssessmentPersistence.runnerVersion,

    authorityPolicyVersion: authorityDecision.policyVersion,

    organizationId: corroboratedAssessmentPersistence.organizationId,

    assemblyId: corroboratedAssessmentPersistence.assemblyId,

    targetMemberOrdinal: corroboratedAssessmentPersistence.targetMemberOrdinal,

    corroboratedAssessmentPersistence,

    authorityDecision,
  };
}
