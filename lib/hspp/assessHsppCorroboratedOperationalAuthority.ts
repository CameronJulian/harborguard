import type { HsppAssessmentDecision } from "./hsppAssessmentDecision";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "./assessHsppCorroboratedMember";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "./persistHsppCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "./evaluateHsppCorroboratedOperationalAuthority";

export const HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION =
  "hspp-corroborated-operational-assessment-v1" as const;

export type HsppCorroboratedOperationalAssessment = HsppAssessmentDecision & {
  policyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION;

  /*
   * This policy may preserve already-established CORROBORATED trust.
   *
   * It never creates VERIFIED trust.
   *
   * UNASSESSED is used only when malformed input does not safely
   * demonstrate the upstream CORROBORATED invariant.
   */
  trustState: "UNASSESSED" | "CORROBORATED";

  operationalEligible: boolean;

  crowdEligible: false;

  trainingEligible: false;

  validationEligible: false;

  reason:
    | "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED"
    | "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED";
};

export type AssessHsppCorroboratedOperationalAuthorityInput = {
  authorityDecision: HsppCorroboratedOperationalAuthorityDecision;
};

function normalizedIdentity(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validFingerprint(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function safeUpstreamTrustState(
  decision: HsppCorroboratedOperationalAuthorityDecision | undefined,
): "UNASSESSED" | "CORROBORATED" {
  return decision?.trustState === "CORROBORATED"
    ? "CORROBORATED"
    : "UNASSESSED";
}

function assessment(
  trustState: "UNASSESSED" | "CORROBORATED",
  operationalEligible: boolean,
  reason:
    | "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED"
    | "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
): HsppCorroboratedOperationalAssessment {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    trustState,

    operationalEligible,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason,
  };
}

function isExactOperationalAuthorityCandidate(
  decision: HsppCorroboratedOperationalAuthorityDecision,
): boolean {
  if (
    decision.policyVersion !== HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION
  ) {
    return false;
  }

  if (
    decision.state !== "OPERATIONAL_AUTHORITY_CANDIDATE" ||
    decision.reason !== "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"
  ) {
    return false;
  }

  if (decision.authority !== "NONE" || decision.trustState !== "CORROBORATED") {
    return false;
  }

  if (
    decision.sourcePersistenceVersion !==
      HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION ||
    decision.sourceAssessmentPolicyVersion !==
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION
  ) {
    return false;
  }

  const organizationId = normalizedIdentity(decision.organizationId);

  const assemblyId = normalizedIdentity(decision.assemblyId);

  const assemblyDecisionId = normalizedIdentity(decision.assemblyDecisionId);

  const evidenceId = normalizedIdentity(decision.evidenceId);

  if (!organizationId || !assemblyId || !assemblyDecisionId || !evidenceId) {
    return false;
  }

  if (!validFingerprint(decision.integrityFingerprint)) {
    return false;
  }

  if (
    !Array.isArray(decision.supportingEvidenceIds) ||
    !Number.isInteger(decision.independentSupportCount) ||
    decision.independentSupportCount < 1 ||
    decision.supportingEvidenceIds.length !== decision.independentSupportCount
  ) {
    return false;
  }

  const supporters = decision.supportingEvidenceIds.map(normalizedIdentity);

  if (supporters.some((supporter) => !supporter || supporter === evidenceId)) {
    return false;
  }

  if (new Set(supporters).size !== supporters.length) {
    return false;
  }

  return true;
}

/**
 * B7490-07Q4 controlled corroborated operational-authority assessment.
 *
 * This is the first post-B11G2 layer permitted to construct an
 * HsppAssessmentDecision carrying operationalEligible=true for the
 * exact immutable evidence target that survived the complete
 * corroboration and operational-authority candidacy chain.
 *
 * This function consumes the B11G2 decision only.
 *
 * It does not rerun B11G2 and does not consume Q3 orchestration.
 *
 * A valid B11G2 OPERATIONAL_AUTHORITY_CANDIDATE produces:
 *
 * - CORROBORATED trust preserved;
 * - operationalEligible=true;
 * - Crowd eligibility=false;
 * - ML training eligibility=false;
 * - validation eligibility=false.
 *
 * This is an in-memory assessment decision only.
 *
 * OPERATIONAL_AUTHORITY_GRANTED here does NOT mean the decision has
 * been persisted and does NOT mean any production consumer has used it.
 *
 * Persistence and operational consumption remain separate future
 * boundaries.
 *
 * This function deliberately does NOT:
 *
 * - call applyHsppAssessmentDecision();
 * - mutate HSPP evidence;
 * - persist operational authority;
 * - create authority storage;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training eligibility;
 * - grant validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - perform database access;
 * - perform API, UI, cron, queue, retry or scheduling behavior.
 */
export function assessHsppCorroboratedOperationalAuthority(
  input: AssessHsppCorroboratedOperationalAuthorityInput,
): HsppCorroboratedOperationalAssessment {
  const decision = input?.authorityDecision;

  if (!decision || typeof decision !== "object") {
    return assessment(
      "UNASSESSED",
      false,
      "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
    );
  }

  const trustState = safeUpstreamTrustState(decision);

  if (!isExactOperationalAuthorityCandidate(decision)) {
    return assessment(
      trustState,
      false,
      "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
    );
  }

  return assessment(
    "CORROBORATED",
    true,
    "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
  );
}
