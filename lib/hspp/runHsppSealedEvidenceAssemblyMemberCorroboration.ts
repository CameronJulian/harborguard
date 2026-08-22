import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroborationSupport,
  type RunHsppSealedEvidenceAssemblyCorroborationSupportResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroborationSupport";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  evaluateHsppMemberCorroboration,
  type EvaluateHsppMemberCorroborationInput,
  type HsppMemberCorroborationDecision,
  type HsppMemberCorroborationEvidence,
  type HsppMemberCorroborationRelation,
} from "@/lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION,
  reduceHsppCanonicalPairRelation,
  type HsppCanonicalPairRelationReduction,
} from "@/lib/hspp/reduceHsppCanonicalPairRelation";

export const HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION =
  "hspp-sealed-assembly-member-corroboration-runner-v1" as const;

export const HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL =
  1 as const;

export type RunHsppSealedEvidenceAssemblyMemberCorroborationInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type HsppSealedEvidenceAssemblyMemberCorroborationPreparation = {
  targetMemberOrdinal: typeof HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL;

  pairRelationReduction: HsppCanonicalPairRelationReduction;

  input: EvaluateHsppMemberCorroborationInput;
};

export type RunHsppSealedEvidenceAssemblyMemberCorroborationResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION;

  corroborationSupportRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION;

  canonicalPairRelationReductionVersion: typeof HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION;

  memberCorroborationPolicyVersion: typeof HSPP_MEMBER_CORROBORATION_VERSION;

  organizationId: string;

  assemblyId: string;

  targetMemberOrdinal: typeof HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL;

  supportRun: RunHsppSealedEvidenceAssemblyCorroborationSupportResult;

  pairRelationReduction: HsppCanonicalPairRelationReduction;

  memberCorroborationDecision: HsppMemberCorroborationDecision;
};

function sameUnorderedEvidencePair(
  firstEvidenceId: string,
  secondEvidenceId: string,
  leftEvidenceId: string,
  rightEvidenceId: string,
): boolean {
  return (
    (firstEvidenceId === leftEvidenceId &&
      secondEvidenceId === rightEvidenceId) ||
    (firstEvidenceId === rightEvidenceId && secondEvidenceId === leftEvidenceId)
  );
}

/**
 * Prepare the exact existing B11F4 input from one completed B07J result.
 *
 * This helper performs deterministic provenance projection only.
 * It neither evaluates B11F4 nor grants any downstream authority.
 */
export function prepareHsppSealedEvidenceAssemblyMemberCorroboration(
  supportRun: RunHsppSealedEvidenceAssemblyCorroborationSupportResult,
): HsppSealedEvidenceAssemblyMemberCorroborationPreparation {
  const membershipRelation = supportRun.assessmentContextRun.membershipRelation;

  /*
   * Historical assemblies may legitimately have no K5 relation row,
   * but B11F4 cannot fabricate an earlier B11A2 decision.
   */
  if (!membershipRelation) {
    throw new Error(
      "B07K requires persisted B11A2 membership relation provenance.",
    );
  }

  const scanRun =
    supportRun.assessmentContextRun.authority.decisionPersistence.decisionRun
      .scanRun;

  const verifiedMembers = scanRun.read.verifiedMembers;

  if (!Array.isArray(verifiedMembers) || verifiedMembers.length < 2) {
    throw new Error(
      "B07K requires at least two verified SEALED assembly members.",
    );
  }

  /*
   * This first bounded B07K slice evaluates exactly the member bound
   * to deterministic persisted ordinal 1.
   */
  const targetMatches = verifiedMembers.filter(
    (member) =>
      member.memberOrdinal ===
      HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,
  );

  if (targetMatches.length !== 1) {
    throw new Error("B07K requires exactly one verified member at ordinal 1.");
  }

  const target = targetMatches[0];

  if (!target) {
    throw new Error("B07K target member could not be resolved.");
  }

  const pairScans = scanRun.scan.pairScans;

  if (!Array.isArray(pairScans)) {
    throw new Error("B07K requires B11C pair-scan provenance.");
  }

  const matchingPairScans = pairScans.filter((pair) =>
    sameUnorderedEvidencePair(
      pair.firstEvidenceId,
      pair.secondEvidenceId,
      membershipRelation.firstEvidenceId,
      membershipRelation.secondEvidenceId,
    ),
  );

  if (matchingPairScans.length !== 1) {
    throw new Error(
      "B07K requires exactly one B11C pair scan for the persisted membership relation.",
    );
  }

  const matchingPairScan = matchingPairScans[0];

  if (!matchingPairScan) {
    throw new Error("B07K canonical pair scan could not be resolved.");
  }

  /*
   * Reuse B7490-07N3 instead of embedding a second canonical
   * conflict/agreement/unknown policy in this runner.
   */
  const pairRelationReduction =
    reduceHsppCanonicalPairRelation(matchingPairScan);

  const members: HsppMemberCorroborationEvidence[] = verifiedMembers.map(
    (member) => ({
      evidenceId: member.evidenceId,

      integrityFingerprint: member.integrityFingerprint,

      sourceProvider: member.sourceProvider,

      sourceClass: member.sourceClass,

      observedAt: member.observedAt,

      integrityStatus: member.integrityStatus,

      validationState: member.validationState,
    }),
  );

  /*
   * Map the persisted B11A2 relation without recalculating,
   * broadening, or reinterpreting it.
   *
   * membershipReason, distanceMeters and timeDeltaMs remain retained
   * inside supportRun provenance but are not B11F4 input fields.
   */
  const relations: HsppMemberCorroborationRelation[] = [
    {
      leftEvidenceId: membershipRelation.firstEvidenceId,

      rightEvidenceId: membershipRelation.secondEvidenceId,

      membershipEligible: membershipRelation.membershipEligible,

      membershipPolicyVersion: membershipRelation.membershipPolicyVersion,

      canonicalRelation: pairRelationReduction.canonicalRelation,
    },
  ];

  return {
    targetMemberOrdinal:
      HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,

    pairRelationReduction,

    input: {
      corroborationSupport: supportRun.corroborationSupport,

      targetEvidenceId: target.evidenceId,

      targetIntegrityFingerprint: target.integrityFingerprint,

      members,

      relations,
    },
  };
}

/**
 * B7490-07K SEALED assembly member-corroboration runner.
 *
 * This boundary composes exactly:
 *
 *   B07J assembly corroboration support
 *       ->
 *   B7490-07N3 canonical pair-relation reduction
 *       ->
 *   existing B11F4 member corroboration evaluation
 *
 * It deliberately stops before B11F5 trust construction.
 *
 * It does NOT:
 *
 * - rerun B11A2;
 * - re-read the database outside the existing B07J chain;
 * - modify B07J or B11F4 semantics;
 * - call assessHsppCorroboratedMember();
 * - call persistHsppCorroboratedMemberAssessment();
 * - call applyHsppAssessmentDecision();
 * - mutate evidence trust or validation state;
 * - grant operational, Route Safety, Crowd, training or validation
 *   eligibility;
 * - create API, cron, queue, retry or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyMemberCorroboration(
  input: RunHsppSealedEvidenceAssemblyMemberCorroborationInput,
): Promise<RunHsppSealedEvidenceAssemblyMemberCorroborationResult> {
  const supportRun = await runHsppSealedEvidenceAssemblyCorroborationSupport({
    supabase: input.supabase,

    organizationId: input.organizationId,

    assemblyId: input.assemblyId,
  });

  const preparation =
    prepareHsppSealedEvidenceAssemblyMemberCorroboration(supportRun);

  const memberCorroborationDecision = evaluateHsppMemberCorroboration(
    preparation.input,
  );

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION,

    corroborationSupportRunnerVersion: supportRun.runnerVersion,

    canonicalPairRelationReductionVersion:
      preparation.pairRelationReduction.policyVersion,

    memberCorroborationPolicyVersion: memberCorroborationDecision.policyVersion,

    organizationId: supportRun.organizationId,

    assemblyId: supportRun.assemblyId,

    targetMemberOrdinal: preparation.targetMemberOrdinal,

    supportRun,

    pairRelationReduction: preparation.pairRelationReduction,

    memberCorroborationDecision,
  };
}
