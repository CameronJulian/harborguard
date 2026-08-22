import {
  applyHsppAssessmentDecision,
  type AppliedHsppAssessmentDecision,
} from "./applyHsppAssessmentDecision";

import {
  applyHsppAssessmentDecisionUnderExecutionLease,
} from "./applyHsppAssessmentDecisionUnderExecutionLease";

import type {
  HsppAssessmentExecutionLeaseContext,
} from "./hsppAssessmentExecutionLeaseContext";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
  type HsppMemberCorroborationReason,
} from "./evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
  type HsppCorroboratedMemberAssessment,
} from "./assessHsppCorroboratedMember";

export const HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION =
  "hspp-denied-corroborated-member-persistence-v1" as const;

export type HsppDeniedMemberCorroborationReason = Exclude<
  HsppMemberCorroborationReason,
  "INDEPENDENT_SUPPORT_PRESENT"
>;

const DENIED_CORROBORATION_REASONS =
  new Set<HsppDeniedMemberCorroborationReason>([
    "UNSUPPORTED_CORROBORATION_SUPPORT_VERSION",
    "ASSEMBLY_CORROBORATION_NOT_SUPPORTED",
    "AUTHORITY_NOT_NONE",
    "INVALID_MEMBER_SET",
    "TARGET_NOT_IN_ASSEMBLY",
    "TARGET_IDENTITY_MISMATCH",
    "TARGET_INTEGRITY_NOT_MATCH",
    "TARGET_NOT_VALIDATED",
    "TARGET_CONFLICT_PRESENT",
    "SAME_PROVIDER_ONLY",
    "NO_INDEPENDENT_SUPPORT",
  ]);

export type PersistHsppDeniedCorroboratedMemberAssessmentInput = {
  supabase: any;

  corroborationDecision: HsppMemberCorroborationDecision;

  assessment: HsppCorroboratedMemberAssessment;

  /*
   * Caller-owned deterministic retry identity.
   *
   * This boundary never invents its own wall-clock persistence time.
   */
  assessedAt: string;

  /*
   * Optional recovery execution ownership only.
   * Assessment and retry identity remain independently controlled.
   */
  executionLease?: HsppAssessmentExecutionLeaseContext;
};

export type HsppPersistedDeniedCorroboratedMemberAssessment = {
  persistenceVersion: typeof HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION;

  state: "DENIED_CORROBORATED_MEMBER_ASSESSMENT_PERSISTED";

  organizationId: string;

  assemblyId: string;

  assemblyDecisionId: string;

  evidenceId: string;

  integrityFingerprint: string;

  corroborationReason: HsppDeniedMemberCorroborationReason;

  supportingEvidenceIds: string[];

  independentSupportCount: 0;

  assessmentPolicyVersion: typeof HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION;

  trustState: "UNASSESSED";

  operationalEligible: false;

  crowdEligible: false;

  trainingEligible: false;

  validationEligible: false;

  assessmentReason: "INDEPENDENT_CORROBORATION_DENIED";

  assessedAt: string;

  applied: AppliedHsppAssessmentDecision;
};

function fail(message: string): never {
  throw new Error(message);
}

function normalizeAssessedAt(value: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    fail("B7490-07Q8 assessedAt is required for deterministic retry identity.");
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    fail("B7490-07Q8 assessedAt must be a valid date-time string.");
  }

  return parsed.toISOString();
}

function sameAssessment(
  supplied: HsppCorroboratedMemberAssessment,
  expected: HsppCorroboratedMemberAssessment,
): boolean {
  return (
    supplied.policyVersion === expected.policyVersion &&
    supplied.trustState === expected.trustState &&
    supplied.operationalEligible === expected.operationalEligible &&
    supplied.crowdEligible === expected.crowdEligible &&
    supplied.trainingEligible === expected.trainingEligible &&
    supplied.validationEligible === expected.validationEligible &&
    supplied.reason === expected.reason
  );
}

/**
 * B7490-07Q8 controlled persistence for the reachable negative B11F5 result.
 *
 * This primitive consumes the exact B11F4/B11F5 negative contract that is
 * already reachable through B07P.
 *
 * It does NOT introduce an "operational authority revoked" state and does
 * not claim that a previous operational grant existed.
 *
 * It simply persists the canonical fail-closed B11F5 assessment:
 *
 *   trustState         = UNASSESSED
 *   operationalEligible = false
 *   crowdEligible       = false
 *   trainingEligible    = false
 *   validationEligible  = false
 *
 * If an earlier assessment had made the evidence operationally eligible,
 * the existing generic assessment mutation naturally clears that flag.
 *
 * Database mutation remains owned exclusively by
 * applyHsppAssessmentDecision().
 */
export async function persistHsppDeniedCorroboratedMemberAssessment(
  input: PersistHsppDeniedCorroboratedMemberAssessmentInput,
): Promise<HsppPersistedDeniedCorroboratedMemberAssessment> {
  const corroboration = input.corroborationDecision;

  const assessment = input.assessment;

  if (!corroboration || typeof corroboration !== "object") {
    fail("B7490-07Q8 requires one B11F4 member corroboration decision.");
  }

  if (!assessment || typeof assessment !== "object") {
    fail("B7490-07Q8 requires one B11F5 corroborated-member assessment.");
  }

  const assessedAt = normalizeAssessedAt(input.assessedAt);

  if (corroboration.policyVersion !== HSPP_MEMBER_CORROBORATION_VERSION) {
    fail("B7490-07Q8 requires the canonical B11F4 policy version.");
  }

  if (corroboration.state !== "MEMBER_CORROBORATION_DENIED") {
    fail("B7490-07Q8 persists only denied B11F4 member corroboration.");
  }

  if (
    corroboration.reason === "INDEPENDENT_SUPPORT_PRESENT" ||
    !DENIED_CORROBORATION_REASONS.has(
      corroboration.reason as HsppDeniedMemberCorroborationReason,
    )
  ) {
    fail("B7490-07Q8 requires one canonical B11F4 denial reason.");
  }

  if (corroboration.authority !== "NONE") {
    fail("B7490-07Q8 requires B11F4 authority NONE.");
  }

  const organizationId = corroboration.organizationId.trim();

  const assemblyId = corroboration.assemblyId.trim();

  const assemblyDecisionId = corroboration.assemblyDecisionId.trim();

  const evidenceId = corroboration.targetEvidenceId.trim();

  const integrityFingerprint = corroboration.targetIntegrityFingerprint.trim();

  if (!organizationId || !assemblyId || !assemblyDecisionId || !evidenceId) {
    fail("B7490-07Q8 requires complete B11F4 provenance identity.");
  }

  if (!/^[a-f0-9]{64}$/.test(integrityFingerprint)) {
    fail("B7490-07Q8 requires the exact lowercase SHA-256 target fingerprint.");
  }

  /*
   * The canonical B11F4 denied() constructor always clears supporter
   * provenance rather than pretending that an independently corroborating
   * support set survived the denial.
   */
  if (
    !Array.isArray(corroboration.supportingEvidenceIds) ||
    corroboration.supportingEvidenceIds.length !== 0 ||
    corroboration.independentSupportCount !== 0
  ) {
    fail("B7490-07Q8 requires canonical denied B11F4 support cardinality.");
  }

  /*
   * Reconstruct the canonical B11F5 result from the exact supplied B11F4
   * decision. A caller cannot pair a denial identity with a modified
   * assessment object.
   */
  const expectedAssessment = assessHsppCorroboratedMember({
    corroborationDecision: corroboration,
  });

  if (!sameAssessment(assessment, expectedAssessment)) {
    fail("B7490-07Q8 assessment does not match the canonical B11F5 denial.");
  }

  if (
    expectedAssessment.policyVersion !==
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION ||
    expectedAssessment.trustState !== "UNASSESSED" ||
    expectedAssessment.operationalEligible !== false ||
    expectedAssessment.crowdEligible !== false ||
    expectedAssessment.trainingEligible !== false ||
    expectedAssessment.validationEligible !== false ||
    expectedAssessment.reason !== "INDEPENDENT_CORROBORATION_DENIED"
  ) {
    fail("B7490-07Q8 persists only the canonical fail-closed B11F5 denial.");
  }

  const executionLease = input.executionLease;

  if (executionLease) {
    const executionLeaseAssemblyId =
      typeof executionLease.assemblyId === "string"
        ? executionLease.assemblyId.trim()
        : "";

    if (
      !executionLeaseAssemblyId ||
      executionLeaseAssemblyId.toLowerCase() !== assemblyId.toLowerCase()
    ) {
      fail("B7490-07Q8 execution lease assembly identity does not match B11F4 provenance.");
    }
  }

  const applied = executionLease
    ? await applyHsppAssessmentDecisionUnderExecutionLease({
        supabase: input.supabase,

        organizationId,

        assemblyId,

        leaseToken: executionLease.leaseToken,

        evidenceId,

        integrityFingerprint,

        assessment,

        assessedAt,
      })
    : await applyHsppAssessmentDecision({
        supabase: input.supabase,

        organizationId,

        evidenceId,

        integrityFingerprint,

        assessment,

        assessedAt,
      });

  if (
    applied.evidenceId !== evidenceId ||
    applied.assessedAt !== assessedAt ||
    applied.trustState !== "UNASSESSED" ||
    applied.operationalEligible !== false ||
    applied.policyVersion !== HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION ||
    applied.reason !== "INDEPENDENT_CORROBORATION_DENIED"
  ) {
    fail(
      "B7490-07Q8 persisted result does not match the controlled B11F5 denial.",
    );
  }

  return {
    persistenceVersion: HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION,

    state: "DENIED_CORROBORATED_MEMBER_ASSESSMENT_PERSISTED",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    evidenceId,

    integrityFingerprint,

    corroborationReason:
      corroboration.reason as HsppDeniedMemberCorroborationReason,

    supportingEvidenceIds: [],

    independentSupportCount: 0,

    assessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "UNASSESSED",

    operationalEligible: false,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    assessmentReason: "INDEPENDENT_CORROBORATION_DENIED",

    assessedAt,

    applied,
  };
}
