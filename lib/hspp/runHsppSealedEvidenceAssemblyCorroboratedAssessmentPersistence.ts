import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedAssessment,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessment";

import {
  HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
  persistHsppCorroboratedMemberAssessment,
  type HsppPersistedCorroboratedMemberAssessment,
  type PersistHsppCorroboratedMemberAssessmentInput,
} from "@/lib/hspp/persistHsppCorroboratedMemberAssessment";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-assessment-persistence-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic B11F6 retry identity.
     *
     * This runner does not generate, normalize or reinterpret
     * the timestamp. B11F6 remains the canonical authority.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistencePreparation =
  Pick<
    PersistHsppCorroboratedMemberAssessmentInput,
    "corroborationDecision" | "assessment" | "assessedAt"
  >;

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION;

    corroboratedAssessmentRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION;

    memberCorroborationRunnerVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationRunnerVersion"];

    memberCorroborationPolicyVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationPolicyVersion"];

    corroboratedAssessmentPolicyVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["corroboratedAssessmentPolicyVersion"];

    persistenceVersion: typeof HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["targetMemberOrdinal"];

    corroboratedAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;

    persistedAssessment: HsppPersistedCorroboratedMemberAssessment;
  };

/**
 * Project one completed B07P result into the exact B11F6 input.
 *
 * This preparation performs no trust evaluation and no persistence.
 * It preserves the exact B11F4 decision and B11F5 assessment objects
 * produced by B07P and passes through the caller-owned assessedAt.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
  corroboratedAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
  assessedAt: string,
): HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistencePreparation {
  if (
    !corroboratedAssessmentRun ||
    typeof corroboratedAssessmentRun !== "object"
  ) {
    throw new Error(
      "B7490-07Q2 requires one completed B07P corroborated-assessment run.",
    );
  }

  const corroborationDecision =
    corroboratedAssessmentRun.memberCorroborationDecision;

  if (!corroborationDecision || typeof corroborationDecision !== "object") {
    throw new Error(
      "B7490-07Q2 requires the exact B11F4 decision produced by B07P.",
    );
  }

  const assessment = corroboratedAssessmentRun.corroboratedAssessment;

  if (!assessment || typeof assessment !== "object") {
    throw new Error(
      "B7490-07Q2 requires the exact B11F5 assessment produced by B07P.",
    );
  }

  return {
    corroborationDecision,

    assessment,

    assessedAt,
  };
}

/**
 * B7490-07Q2 SEALED assembly corroborated-assessment persistence runner.
 *
 * This boundary composes exactly:
 *
 *   existing B07P corroborated-assessment runner
 *       ->
 *   existing B11F6 controlled corroborated persistence
 *
 * The exact B11F4 decision and B11F5 assessment returned by B07P are
 * handed to B11F6 without reconstruction or reinterpretation.
 *
 * assessedAt remains caller-controlled. This runner deliberately does
 * not generate wall-clock retry identity.
 *
 * The runner stops immediately after B11F6 persistence.
 *
 * It deliberately does NOT:
 *
 * - rerun B11F4;
 * - independently rerun B11F5;
 * - call applyHsppAssessmentDecision directly;
 * - implement direct Supabase table persistence;
 * - generate assessedAt internally;
 * - evaluate B11G2 operational-authority candidacy;
 * - grant operational authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - grant VERIFIED trust;
 * - establish physical-world certainty;
 * - create API, UI, cron, queue, retry or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
  input: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult> {
  const corroboratedAssessmentRun =
    await runHsppSealedEvidenceAssemblyCorroboratedAssessment({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,
    });

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
      corroboratedAssessmentRun,
      input.assessedAt,
    );

  const persistedAssessment = await persistHsppCorroboratedMemberAssessment({
    supabase: input.supabase,

    corroborationDecision: preparation.corroborationDecision,

    assessment: preparation.assessment,

    assessedAt: preparation.assessedAt,
  });

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION,

    corroboratedAssessmentRunnerVersion:
      corroboratedAssessmentRun.runnerVersion,

    memberCorroborationRunnerVersion:
      corroboratedAssessmentRun.memberCorroborationRunnerVersion,

    memberCorroborationPolicyVersion:
      corroboratedAssessmentRun.memberCorroborationPolicyVersion,

    corroboratedAssessmentPolicyVersion:
      corroboratedAssessmentRun.corroboratedAssessmentPolicyVersion,

    persistenceVersion: persistedAssessment.persistenceVersion,

    organizationId: corroboratedAssessmentRun.organizationId,

    assemblyId: corroboratedAssessmentRun.assemblyId,

    targetMemberOrdinal: corroboratedAssessmentRun.targetMemberOrdinal,

    corroboratedAssessmentRun,

    persistedAssessment,
  };
}
