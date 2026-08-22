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
} from "@/lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION,
  persistHsppDeniedCorroboratedMemberAssessment,
  type HsppPersistedDeniedCorroboratedMemberAssessment,
} from "@/lib/hspp/persistHsppDeniedCorroboratedMemberAssessment";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-assessment-persistence-routing-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic retry identity.
     *
     * Q9 passes this exact value to whichever existing persistence
     * primitive owns the canonical branch result.
     *
     * Q9 does not normalize or generate time.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingPreparation =
  {
    branch: "MEMBER_CORROBORATION_ELIGIBLE" | "MEMBER_CORROBORATION_DENIED";

    corroborationDecision: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationDecision"];

    assessment: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["corroboratedAssessment"];

    assessedAt: string;
  };

type HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingCommonResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION;

    corroboratedAssessmentRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION;

    memberCorroborationRunnerVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationRunnerVersion"];

    memberCorroborationPolicyVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationPolicyVersion"];

    corroboratedAssessmentPolicyVersion: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["corroboratedAssessmentPolicyVersion"];

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["targetMemberOrdinal"];

    corroboratedAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult =
  HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    persistenceVersion: typeof HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION;

    persistenceResult: HsppPersistedCorroboratedMemberAssessment;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult =
  HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_DENIED";

    persistenceVersion: typeof HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION;

    persistenceResult: HsppPersistedDeniedCorroboratedMemberAssessment;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult =
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult;

/**
 * Project the exact B07P result into one persistence branch.
 *
 * Q9 does not reconstruct B11F4 or B11F5 and does not decide trust.
 *
 * It reads only the existing canonical B11F4 state:
 *
 * MEMBER_CORROBORATION_ELIGIBLE -> B11F6
 * MEMBER_CORROBORATION_DENIED   -> Q8
 *
 * Each persistence primitive independently validates the exact B11F4/B11F5
 * pair before mutation.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
  corroboratedAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
  assessedAt: string,
): HsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingPreparation {
  if (
    !corroboratedAssessmentRun ||
    typeof corroboratedAssessmentRun !== "object"
  ) {
    throw new Error(
      "B7490-07Q9 requires one completed B07P corroborated-assessment run.",
    );
  }

  const corroborationDecision =
    corroboratedAssessmentRun.memberCorroborationDecision;

  if (!corroborationDecision || typeof corroborationDecision !== "object") {
    throw new Error(
      "B7490-07Q9 requires the exact B11F4 decision returned by B07P.",
    );
  }

  const assessment = corroboratedAssessmentRun.corroboratedAssessment;

  if (!assessment || typeof assessment !== "object") {
    throw new Error(
      "B7490-07Q9 requires the exact B11F5 assessment returned by B07P.",
    );
  }

  if (
    corroborationDecision.state !== "MEMBER_CORROBORATION_ELIGIBLE" &&
    corroborationDecision.state !== "MEMBER_CORROBORATION_DENIED"
  ) {
    throw new Error("B7490-07Q9 requires one canonical B11F4 routing state.");
  }

  return {
    branch: corroborationDecision.state,

    corroborationDecision,

    assessment,

    assessedAt,
  };
}

/**
 * B7490-07Q9 sealed-assembly corroborated-assessment persistence router.
 *
 * This is a sibling of Q2. Q2 remains unchanged and positive-only for
 * the established Q3 -> Q5 -> Q7 operational-authority chain.
 *
 * Q9 composes exactly:
 *
 * B07P once
 *
 * then exactly one mutually exclusive persistence branch:
 *
 * - MEMBER_CORROBORATION_ELIGIBLE -> B11F6
 * - MEMBER_CORROBORATION_DENIED   -> Q8
 *
 * The exact B11F4 decision and B11F5 assessment returned by B07P are
 * passed without reconstruction or reinterpretation.
 *
 * assessedAt remains caller-controlled and is passed unchanged to the
 * selected persistence primitive.
 *
 * Q9 stops immediately after that branch persists.
 *
 * It deliberately does NOT:
 *
 * - call Q2;
 * - rerun B11F4;
 * - rerun B11F5;
 * - call both persistence primitives for one execution;
 * - call applyHsppAssessmentDecision directly;
 * - access Supabase tables directly;
 * - invoke B11G2 or Q3;
 * - grant operational authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - assign VERIFIED trust;
 * - invent a revocation trust/authority state;
 * - create API, UI, cron, queue, retry or scheduling execution.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
  input: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult> {
  const corroboratedAssessmentRun =
    await runHsppSealedEvidenceAssemblyCorroboratedAssessment({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,
    });

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
      corroboratedAssessmentRun,
      input.assessedAt,
    );

  if (preparation.branch === "MEMBER_CORROBORATION_ELIGIBLE") {
    const persistenceResult = await persistHsppCorroboratedMemberAssessment({
      supabase: input.supabase,

      corroborationDecision: preparation.corroborationDecision,

      assessment: preparation.assessment,

      assessedAt: preparation.assessedAt,
    });

    return {
      runnerVersion:
        HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

      corroboratedAssessmentRunnerVersion:
        corroboratedAssessmentRun.runnerVersion,

      memberCorroborationRunnerVersion:
        corroboratedAssessmentRun.memberCorroborationRunnerVersion,

      memberCorroborationPolicyVersion:
        corroboratedAssessmentRun.memberCorroborationPolicyVersion,

      corroboratedAssessmentPolicyVersion:
        corroboratedAssessmentRun.corroboratedAssessmentPolicyVersion,

      organizationId: corroboratedAssessmentRun.organizationId,

      assemblyId: corroboratedAssessmentRun.assemblyId,

      targetMemberOrdinal: corroboratedAssessmentRun.targetMemberOrdinal,

      branch: "MEMBER_CORROBORATION_ELIGIBLE",

      persistenceVersion: persistenceResult.persistenceVersion,

      corroboratedAssessmentRun,

      persistenceResult,
    };
  }

  const persistenceResult = await persistHsppDeniedCorroboratedMemberAssessment(
    {
      supabase: input.supabase,

      corroborationDecision: preparation.corroborationDecision,

      assessment: preparation.assessment,

      assessedAt: preparation.assessedAt,
    },
  );

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    corroboratedAssessmentRunnerVersion:
      corroboratedAssessmentRun.runnerVersion,

    memberCorroborationRunnerVersion:
      corroboratedAssessmentRun.memberCorroborationRunnerVersion,

    memberCorroborationPolicyVersion:
      corroboratedAssessmentRun.memberCorroborationPolicyVersion,

    corroboratedAssessmentPolicyVersion:
      corroboratedAssessmentRun.corroboratedAssessmentPolicyVersion,

    organizationId: corroboratedAssessmentRun.organizationId,

    assemblyId: corroboratedAssessmentRun.assemblyId,

    targetMemberOrdinal: corroboratedAssessmentRun.targetMemberOrdinal,

    branch: "MEMBER_CORROBORATION_DENIED",

    persistenceVersion: persistenceResult.persistenceVersion,

    corroboratedAssessmentRun,

    persistenceResult,
  };
}
