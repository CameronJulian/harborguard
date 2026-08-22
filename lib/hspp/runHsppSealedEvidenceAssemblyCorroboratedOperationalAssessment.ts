import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  assessHsppCorroboratedOperationalAuthority,
  type HsppCorroboratedOperationalAssessment,
} from "@/lib/hspp/assessHsppCorroboratedOperationalAuthority";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-operational-assessment-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic B11F6 retry identity.
     *
     * Q5 passes this value unchanged into Q3.
     * Q5 does not generate, normalize or reinterpret it.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPreparation =
  {
    corroboratedOperationalAuthorityRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult;

    authorityDecision: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult["authorityDecision"];

    operationalAssessment: HsppCorroboratedOperationalAssessment;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION;

    corroboratedOperationalAuthorityRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION;

    authorityPolicyVersion: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult["authorityPolicyVersion"];

    operationalAssessmentPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult["targetMemberOrdinal"];

    corroboratedOperationalAuthorityRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult;

    authorityDecision: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult["authorityDecision"];

    operationalAssessment: HsppCorroboratedOperationalAssessment;
  };

/**
 * Project one completed Q3 result through the exact Q4 pure
 * operational-authority assessment.
 *
 * The exact B11G2 authorityDecision object produced by Q3 is handed
 * to Q4 without cloning, reconstruction, normalization or
 * reinterpretation.
 *
 * This preparation performs no persistence.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
  corroboratedOperationalAuthorityRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult,
): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPreparation {
  if (
    !corroboratedOperationalAuthorityRun ||
    typeof corroboratedOperationalAuthorityRun !== "object"
  ) {
    throw new Error(
      "B7490-07Q5 requires one completed B7490-07Q3 operational-authority run.",
    );
  }

  const authorityDecision =
    corroboratedOperationalAuthorityRun.authorityDecision;

  if (!authorityDecision || typeof authorityDecision !== "object") {
    throw new Error(
      "B7490-07Q5 requires the exact B11G2 authority decision returned by Q3.",
    );
  }

  const operationalAssessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision,
  });

  return {
    corroboratedOperationalAuthorityRun,

    authorityDecision,

    operationalAssessment,
  };
}

/**
 * B7490-07Q5 SEALED assembly corroborated operational-assessment
 * runner.
 *
 * This boundary composes exactly:
 *
 *   existing B7490-07Q3 operational-authority candidacy runner
 *       ->
 *   existing B7490-07Q4 pure operational assessment
 *
 * Q5 passes Q3's exact authorityDecision object into Q4.
 *
 * The complete Q3 result, exact B11G2 authority decision and complete
 * Q4 assessment are retained as provenance.
 *
 * assessedAt remains caller-controlled and is passed unchanged into
 * Q3. Q5 does not generate wall-clock retry identity.
 *
 * This runner stops immediately after the Q4 in-memory assessment.
 *
 * Even when Q4 returns operationalEligible=true, Q5 does NOT persist
 * that value and does NOT make any production consumer operationally
 * authorized.
 *
 * This runner deliberately does NOT:
 *
 * - call Q2 directly;
 * - rerun B11G2 directly;
 * - reconstruct the B11G2 authority decision;
 * - call applyHsppAssessmentDecision();
 * - call an HSPP persistence primitive;
 * - write operationalEligible to the database;
 * - create operational-authority storage;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training eligibility;
 * - grant validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - perform direct database access;
 * - create API, UI, cron, queue, retry or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
  input: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult> {
  const corroboratedOperationalAuthorityRun =
    await runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,

      assessedAt: input.assessedAt,
    });

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
      corroboratedOperationalAuthorityRun,
    );

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION,

    corroboratedOperationalAuthorityRunnerVersion:
      corroboratedOperationalAuthorityRun.runnerVersion,

    authorityPolicyVersion:
      corroboratedOperationalAuthorityRun.authorityPolicyVersion,

    operationalAssessmentPolicyVersion:
      preparation.operationalAssessment.policyVersion,

    organizationId: corroboratedOperationalAuthorityRun.organizationId,

    assemblyId: corroboratedOperationalAuthorityRun.assemblyId,

    targetMemberOrdinal:
      corroboratedOperationalAuthorityRun.targetMemberOrdinal,

    corroboratedOperationalAuthorityRun:
      preparation.corroboratedOperationalAuthorityRun,

    authorityDecision: preparation.authorityDecision,

    operationalAssessment: preparation.operationalAssessment,
  };
}
