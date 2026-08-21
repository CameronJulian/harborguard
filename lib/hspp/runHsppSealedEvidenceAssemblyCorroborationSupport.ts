import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyAssessmentContext,
  type RunHsppSealedEvidenceAssemblyAssessmentContextResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyAssessmentContext";

import {
  HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,
  evaluateHsppAssemblyCorroborationSupport,
  type HsppAssemblyCorroborationSupportResult,
} from "@/lib/hspp/evaluateHsppAssemblyCorroborationSupport";

export const HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION =
  "hspp-sealed-assembly-corroboration-support-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroborationSupportInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyCorroborationSupportResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION;

  assessmentContextRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION;

  corroborationSupportPolicyVersion: typeof HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION;

  organizationId: string;

  assemblyId: string;

  assessmentContextRun: RunHsppSealedEvidenceAssemblyAssessmentContextResult;

  corroborationSupport: HsppAssemblyCorroborationSupportResult;
};

/**
 * B7490-07J sealed-assembly corroboration-support runner.
 *
 * This boundary composes exactly:
 *
 *   B07I deterministic assessment context
 *       ->
 *   B11F3 assembly-level corroboration-support evaluation
 *
 * B11F3 determines only whether the validated assembly assessment
 * context is structurally suitable for later member-specific
 * corroboration evaluation.
 *
 * This runner deliberately stops before B11F4.
 *
 * It does NOT:
 *
 * - evaluate member-specific corroboration;
 * - construct CORROBORATED trust;
 * - call assessHsppCorroboratedMember();
 * - call persistHsppCorroboratedMemberAssessment();
 * - call applyHsppAssessmentDecision();
 * - directly read or write database tables;
 * - mutate trust or validation state;
 * - grant operational eligibility;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyCorroborationSupport(
  input: RunHsppSealedEvidenceAssemblyCorroborationSupportInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroborationSupportResult> {
  const assessmentContextRun =
    await runHsppSealedEvidenceAssemblyAssessmentContext({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,
    });

  const corroborationSupport = evaluateHsppAssemblyCorroborationSupport(
    assessmentContextRun.assessmentContext,
  );

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION,

    assessmentContextRunnerVersion: assessmentContextRun.runnerVersion,

    corroborationSupportPolicyVersion: corroborationSupport.policyVersion,

    organizationId: assessmentContextRun.organizationId,

    assemblyId: assessmentContextRun.assemblyId,

    assessmentContextRun,

    corroborationSupport,
  };
}
