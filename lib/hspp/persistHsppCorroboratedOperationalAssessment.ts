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
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "./evaluateHsppCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  assessHsppCorroboratedOperationalAuthority,
  type HsppCorroboratedOperationalAssessment,
} from "./assessHsppCorroboratedOperationalAuthority";

export const HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION =
  "hspp-corroborated-operational-assessment-persistence-v1" as const;

export type PersistHsppCorroboratedOperationalAssessmentInput = {
  supabase: any;

  authorityDecision: HsppCorroboratedOperationalAuthorityDecision;

  assessment: HsppCorroboratedOperationalAssessment;

  assessedAt: string;

  /*
   * Optional recovery execution ownership only.
   * Assessment and retry identity remain independently controlled.
   */
  executionLease?: HsppAssessmentExecutionLeaseContext;
};

export type HsppPersistedCorroboratedOperationalAssessment = {
  persistenceVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION;

  state: "CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTED";

  organizationId: string;

  assemblyId: string;

  assemblyDecisionId: string;

  evidenceId: string;

  integrityFingerprint: string;

  supportingEvidenceIds: string[];

  independentSupportCount: number;

  authorityPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION;

  authorityState: "OPERATIONAL_AUTHORITY_CANDIDATE";

  authorityReason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET";

  authority: "NONE";

  sourcePersistenceVersion: HsppCorroboratedOperationalAuthorityDecision["sourcePersistenceVersion"];

  sourceAssessmentPolicyVersion: HsppCorroboratedOperationalAuthorityDecision["sourceAssessmentPolicyVersion"];

  assessmentPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION;

  trustState: "CORROBORATED";

  operationalEligible: true;

  crowdEligible: false;

  trainingEligible: false;

  validationEligible: false;

  reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED";

  assessedAt: string;

  applied: AppliedHsppAssessmentDecision;
};

function fail(message: string): never {
  throw new Error(message);
}

function normalizeIdentity(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    fail(`B7490-07Q6 requires ${fieldName}.`);
  }

  return normalized;
}

function normalizeAssessedAt(value: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    fail("B7490-07Q6 assessedAt is required for deterministic retry identity.");
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    fail("B7490-07Q6 assessedAt must be a valid date-time string.");
  }

  return parsed.toISOString();
}

function assessmentsMatch(
  supplied: HsppCorroboratedOperationalAssessment,
  expected: HsppCorroboratedOperationalAssessment,
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
 * B7490-07Q6 controlled persistence boundary for the exact successful
 * Q4 corroborated operational assessment.
 *
 * Q6 independently reconstructs the canonical Q4 assessment from the
 * supplied exact B11G2 authority decision and rejects any modified or
 * denied assessment before persistence.
 *
 * Evidence mutation remains exclusively owned by
 * applyHsppAssessmentDecision().
 *
 * Q6 does not generalize B11F6, orchestrate Q5, create a second direct
 * database path, grant Crowd/ML/validation eligibility, assign VERIFIED
 * trust, or create API/UI/cron/queue/scheduler execution.
 */
export async function persistHsppCorroboratedOperationalAssessment(
  input: PersistHsppCorroboratedOperationalAssessmentInput,
): Promise<HsppPersistedCorroboratedOperationalAssessment> {
  const authorityDecision = input?.authorityDecision;

  const assessment = input?.assessment;

  const assessedAt = normalizeAssessedAt(input?.assessedAt);

  if (!authorityDecision || typeof authorityDecision !== "object") {
    fail("B7490-07Q6 requires the exact B11G2 authority decision.");
  }

  if (!assessment || typeof assessment !== "object") {
    fail("B7490-07Q6 requires the exact Q4 operational assessment.");
  }

  const expectedAssessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision,
  });

  if (!assessmentsMatch(assessment, expectedAssessment)) {
    fail(
      "B7490-07Q6 assessment does not match the canonical Q4 operational assessment.",
    );
  }

  if (
    expectedAssessment.policyVersion !==
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION ||
    expectedAssessment.trustState !== "CORROBORATED" ||
    expectedAssessment.operationalEligible !== true ||
    expectedAssessment.crowdEligible !== false ||
    expectedAssessment.trainingEligible !== false ||
    expectedAssessment.validationEligible !== false ||
    expectedAssessment.reason !== "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED"
  ) {
    fail(
      "B7490-07Q6 persists only the exact successful Q4 operational assessment.",
    );
  }

  const organizationId = normalizeIdentity(
    authorityDecision.organizationId,
    "authorityDecision.organizationId",
  );

  const assemblyId = normalizeIdentity(
    authorityDecision.assemblyId,
    "authorityDecision.assemblyId",
  );

  const assemblyDecisionId = normalizeIdentity(
    authorityDecision.assemblyDecisionId,
    "authorityDecision.assemblyDecisionId",
  );

  const evidenceId = normalizeIdentity(
    authorityDecision.evidenceId,
    "authorityDecision.evidenceId",
  );

  const integrityFingerprint = normalizeIdentity(
    authorityDecision.integrityFingerprint,
    "authorityDecision.integrityFingerprint",
  );

  if (!/^[a-f0-9]{64}$/.test(integrityFingerprint)) {
    fail(
      "B7490-07Q6 requires the exact lowercase SHA-256 evidence fingerprint.",
    );
  }

  if (
    authorityDecision.policyVersion !==
      HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION ||
    authorityDecision.state !== "OPERATIONAL_AUTHORITY_CANDIDATE" ||
    authorityDecision.reason !== "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET" ||
    authorityDecision.authority !== "NONE" ||
    authorityDecision.trustState !== "CORROBORATED"
  ) {
    fail("B7490-07Q6 requires the exact successful B11G2 authority candidacy.");
  }

  if (
    !Array.isArray(authorityDecision.supportingEvidenceIds) ||
    !Number.isInteger(authorityDecision.independentSupportCount) ||
    authorityDecision.independentSupportCount < 1 ||
    authorityDecision.supportingEvidenceIds.length !==
      authorityDecision.independentSupportCount
  ) {
    fail("B7490-07Q6 requires coherent independent-support provenance.");
  }

  const supportingEvidenceIds = authorityDecision.supportingEvidenceIds.map(
    (supporter) =>
      normalizeIdentity(
        supporter,
        "authorityDecision.supportingEvidenceIds member",
      ),
  );

  if (supportingEvidenceIds.some((supporter) => supporter === evidenceId)) {
    fail(
      "B7490-07Q6 rejects self-referential operational-authority provenance.",
    );
  }

  if (new Set(supportingEvidenceIds).size !== supportingEvidenceIds.length) {
    fail("B7490-07Q6 rejects duplicate operational-authority supporters.");
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
      fail("B7490-07Q6 execution lease assembly identity does not match B11G2 provenance.");
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
    applied.trustState !== "CORROBORATED" ||
    applied.operationalEligible !== true ||
    applied.policyVersion !==
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION ||
    applied.reason !== "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED" ||
    applied.assessedAt !== assessedAt
  ) {
    fail(
      "B7490-07Q6 persisted result does not match the controlled Q4 operational assessment.",
    );
  }

  return {
    persistenceVersion:
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,

    state: "CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTED",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    evidenceId,

    integrityFingerprint,

    supportingEvidenceIds: [...supportingEvidenceIds],

    independentSupportCount: supportingEvidenceIds.length,

    authorityPolicyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    authorityState: "OPERATIONAL_AUTHORITY_CANDIDATE",

    authorityReason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    authority: "NONE",

    sourcePersistenceVersion: authorityDecision.sourcePersistenceVersion,

    sourceAssessmentPolicyVersion:
      authorityDecision.sourceAssessmentPolicyVersion,

    assessmentPolicyVersion: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    operationalEligible: true,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",

    assessedAt,

    applied,
  };
}
