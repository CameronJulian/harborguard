import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "@/lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
  type HsppCorroboratedMemberAssessment,
} from "@/lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION,
  HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,
  runHsppSealedEvidenceAssemblyMemberCorroboration,
  type RunHsppSealedEvidenceAssemblyMemberCorroborationResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyMemberCorroboration";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-assessment-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentPreparation = {
  memberCorroborationRun: RunHsppSealedEvidenceAssemblyMemberCorroborationResult;

  memberCorroborationDecision: HsppMemberCorroborationDecision;

  corroboratedAssessment: HsppCorroboratedMemberAssessment;
};

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION;

  memberCorroborationRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION;

  memberCorroborationPolicyVersion: typeof HSPP_MEMBER_CORROBORATION_VERSION;

  corroboratedAssessmentPolicyVersion: typeof HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION;

  organizationId: string;

  assemblyId: string;

  targetMemberOrdinal: typeof HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL;

  memberCorroborationRun: RunHsppSealedEvidenceAssemblyMemberCorroborationResult;

  memberCorroborationDecision: HsppMemberCorroborationDecision;

  corroboratedAssessment: HsppCorroboratedMemberAssessment;
};

/**
 * Project one completed B07K result through the existing canonical
 * B11F5 trust-construction policy.
 *
 * B11F5 is deliberately invoked for both eligible and denied B11F4
 * decisions. B11F5 itself remains the canonical authority for deciding
 * between CORROBORATED and UNASSESSED.
 *
 * The exact B11F4 decision object is passed through without mutation,
 * reconstruction or reinterpretation.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(
  memberCorroborationRun: RunHsppSealedEvidenceAssemblyMemberCorroborationResult,
): HsppSealedEvidenceAssemblyCorroboratedAssessmentPreparation {
  if (!memberCorroborationRun || typeof memberCorroborationRun !== "object") {
    throw new Error(
      "B07P requires one completed B07K member corroboration run.",
    );
  }

  const memberCorroborationDecision =
    memberCorroborationRun.memberCorroborationDecision;

  if (
    !memberCorroborationDecision ||
    typeof memberCorroborationDecision !== "object"
  ) {
    throw new Error(
      "B07P requires the exact B11F4 member corroboration decision.",
    );
  }

  const corroboratedAssessment = assessHsppCorroboratedMember({
    corroborationDecision: memberCorroborationDecision,
  });

  return {
    memberCorroborationRun,

    memberCorroborationDecision,

    corroboratedAssessment,
  };
}

/**
 * B7490-07P SEALED assembly corroborated-assessment runner.
 *
 * This boundary composes exactly:
 *
 *   committed B07K member corroboration
 *       ->
 *   existing B11F5 corroborated-trust construction
 *
 * It deliberately stops before B11F6 persistence.
 *
 * It does NOT:
 *
 * - rerun B11A2;
 * - rerun B11F4;
 * - reconstruct or reinterpret the B11F4 decision;
 * - call persistHsppCorroboratedMemberAssessment();
 * - call applyHsppAssessmentDecision();
 * - directly read or write database tables;
 * - persist CORROBORATED trust;
 * - grant operational eligibility;
 * - grant Route Safety authority;
 * - grant Crowd eligibility;
 * - grant ML training or validation eligibility;
 * - grant VERIFIED trust;
 * - establish physical-world certainty;
 * - create API, UI, cron, queue, retry or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedAssessment(
  input: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult> {
  const memberCorroborationRun =
    await runHsppSealedEvidenceAssemblyMemberCorroboration({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,
    });

  const preparation = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(
    memberCorroborationRun,
  );

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,

    memberCorroborationRunnerVersion: memberCorroborationRun.runnerVersion,

    memberCorroborationPolicyVersion:
      preparation.memberCorroborationDecision.policyVersion,

    corroboratedAssessmentPolicyVersion:
      preparation.corroboratedAssessment.policyVersion,

    organizationId: memberCorroborationRun.organizationId,

    assemblyId: memberCorroborationRun.assemblyId,

    targetMemberOrdinal: memberCorroborationRun.targetMemberOrdinal,

    memberCorroborationRun: preparation.memberCorroborationRun,

    memberCorroborationDecision: preparation.memberCorroborationDecision,

    corroboratedAssessment: preparation.corroboratedAssessment,
  };
}
