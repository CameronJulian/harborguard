import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  assessHsppCorroboratedOperationalAuthority,
  type HsppCorroboratedOperationalAssessment,
} from "@/lib/hspp/assessHsppCorroboratedOperationalAuthority";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-operational-assessment-routing-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic persistence retry identity.
     *
     * Q11 passes this value unchanged into Q10.
     *
     * Q11 does not generate, normalize or reinterpret time.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedPreparation =
  {
    branch: "MEMBER_CORROBORATION_DENIED";

    authorityRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligiblePreparation =
  {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    authorityRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult;

    authorityDecision: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult["authorityDecision"];

    operationalAssessment: HsppCorroboratedOperationalAssessment;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingPreparation =
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedPreparation
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligiblePreparation;

type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingCommonResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION;

    authorityRoutingRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: number;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult =
  HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_DENIED";

    authorityRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult;

    authorityDecision: null;

    operationalAssessment: null;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult =
  HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    authorityRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult;

    authorityPolicyVersion: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult["authorityPolicyVersion"];

    operationalAssessmentPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION;

    authorityDecision: HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult["authorityDecision"];

    operationalAssessment: HsppCorroboratedOperationalAssessment;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult =
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

/**
 * Project one completed Q10 result into the next safe assessment action.
 *
 * Q10 denied:
 *
 *   The Q9/Q8 fail-closed assessment is already persisted.
 *   The branch is terminal and Q4 must not execute.
 *
 * Q10 eligible:
 *
 *   Q10 exposes the exact B11G2 authority decision.
 *   Q11 passes that exact object into Q4 without cloning,
 *   reconstruction, normalization or state pre-filtering.
 *
 * Q11 deliberately does not inspect whether B11G2 returned
 * candidacy or denial. Q4 remains the sole operational-assessment
 * policy for both canonical B11G2 outcomes.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
  authorityRoutingRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult,
): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingPreparation {
  if (!authorityRoutingRun || typeof authorityRoutingRun !== "object") {
    throw new Error(
      "B7490-07Q11 requires one completed B7490-07Q10 authority-routing run.",
    );
  }

  if (authorityRoutingRun.branch === "MEMBER_CORROBORATION_DENIED") {
    if (authorityRoutingRun.authorityDecision !== null) {
      throw new Error(
        "B7490-07Q11 requires the exact terminal denied Q10 result.",
      );
    }

    return {
      branch: "MEMBER_CORROBORATION_DENIED",

      authorityRoutingRun,
    };
  }

  if (authorityRoutingRun.branch === "MEMBER_CORROBORATION_ELIGIBLE") {
    const authorityDecision = authorityRoutingRun.authorityDecision;

    if (!authorityDecision || typeof authorityDecision !== "object") {
      throw new Error(
        "B7490-07Q11 requires the exact B11G2 authority decision returned by Q10.",
      );
    }

    const operationalAssessment = assessHsppCorroboratedOperationalAuthority({
      authorityDecision,
    });

    return {
      branch: "MEMBER_CORROBORATION_ELIGIBLE",

      authorityRoutingRun,

      authorityDecision,

      operationalAssessment,
    };
  }

  throw new Error(
    "B7490-07Q11 requires one canonical Q10 authority-routing branch.",
  );
}

/**
 * B7490-07Q11 branch-aware Q10 -> Q4 operational-assessment runner.
 *
 * This boundary composes exactly:
 *
 *   Q10 once
 *
 * then:
 *
 *   MEMBER_CORROBORATION_DENIED
 *      -> return complete terminal Q10/Q9/Q8 provenance
 *      -> Q4 is not invoked
 *      -> STOP
 *
 *   MEMBER_CORROBORATION_ELIGIBLE
 *      -> pass Q10's exact B11G2 authorityDecision to Q4 once
 *      -> retain complete Q10 + B11G2 + Q4 provenance
 *      -> STOP
 *
 * Q11 deliberately does NOT:
 *
 * - call Q9 directly;
 * - call Q2 or Q3;
 * - call B07P directly;
 * - call B11F6 or Q8 directly;
 * - rerun B11G2;
 * - inspect B11G2 state/reason to pre-filter Q4;
 * - call Q5;
 * - call Q6 or Q7;
 * - call applyHsppAssessmentDecision;
 * - persist the Q4 result;
 * - perform direct database access;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - create API, UI, cron, queue, retry or scheduling execution.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
  input: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult> {
  const authorityRoutingRun =
    await runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      {
        supabase: input.supabase,

        organizationId: input.organizationId,

        assemblyId: input.assemblyId,

        assessedAt: input.assessedAt,
      },
    );

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      authorityRoutingRun,
    );

  if (preparation.branch === "MEMBER_CORROBORATION_DENIED") {
    return {
      runnerVersion:
        HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,

      authorityRoutingRunnerVersion:
        preparation.authorityRoutingRun.runnerVersion,

      organizationId: preparation.authorityRoutingRun.organizationId,

      assemblyId: preparation.authorityRoutingRun.assemblyId,

      targetMemberOrdinal: preparation.authorityRoutingRun.targetMemberOrdinal,

      branch: "MEMBER_CORROBORATION_DENIED",

      authorityRoutingRun: preparation.authorityRoutingRun,

      authorityDecision: null,

      operationalAssessment: null,
    };
  }

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,

    authorityRoutingRunnerVersion:
      preparation.authorityRoutingRun.runnerVersion,

    organizationId: preparation.authorityRoutingRun.organizationId,

    assemblyId: preparation.authorityRoutingRun.assemblyId,

    targetMemberOrdinal: preparation.authorityRoutingRun.targetMemberOrdinal,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    authorityRoutingRun: preparation.authorityRoutingRun,

    authorityPolicyVersion:
      preparation.authorityRoutingRun.authorityPolicyVersion,

    operationalAssessmentPolicyVersion:
      preparation.operationalAssessment.policyVersion,

    authorityDecision: preparation.authorityDecision,

    operationalAssessment: preparation.operationalAssessment,
  };
}
