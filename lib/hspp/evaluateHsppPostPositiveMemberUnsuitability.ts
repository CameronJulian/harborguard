import {
  decideHsppOperationalUse,
  type HsppOperationalUseDecision,
} from "@/lib/hspp/decideHsppOperationalUse";

import type {
  ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";

export const HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_POLICY_VERSION =
  "hspp-post-positive-member-unsuitability-v1" as const;

export const HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON =
  "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION" as const;

export type HsppPostPositiveMemberUnsuitabilityState =
  | "SUITABLE"
  | "UNSUITABLE"
  | "INDETERMINATE";

export type HsppPostPositiveMemberUnsuitabilityReason =
  | "CURRENT_OPERATIONAL_USE_ALLOWED"
  | "CURRENT_INTEGRITY_IDENTITY_CHANGED"
  | "CURRENT_INTEGRITY_NOT_VERIFIED"
  | "CURRENT_EVIDENCE_NOT_FOUND"
  | "CURRENT_VALIDATION_NOT_VALIDATED"
  | "CURRENT_ASSESSMENT_MISSING"
  | "CURRENT_TRUST_NOT_OPERATIONAL"
  | "CURRENT_OPERATIONAL_NOT_ELIGIBLE";

export type EvaluateHsppPostPositiveMemberUnsuitabilityInput = {
  workItem:
    HsppPostPositiveLifecycleWorkItem;

  currentEvidence:
    ReadAndVerifyHsppEvidenceResult;

  /**
   * Caller-owned time at which this post-positive condition was
   * observed. The evaluator never invents wall-clock time.
   */
  observedAt:
    string;

  /**
   * Caller-owned deterministic decision timestamp.
   */
  decidedAt:
    string;
};

export type HsppPostPositiveMemberUnsuitabilityDecision = {
  policyVersion:
    typeof HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_POLICY_VERSION;

  state:
    HsppPostPositiveMemberUnsuitabilityState;

  reason:
    HsppPostPositiveMemberUnsuitabilityReason;

  persistenceReason:
    | typeof HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON
    | null;

  organizationId:
    string;

  assemblyId:
    string;

  membershipId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  positiveAssessedAt:
    string;

  observedAt:
    string;

  decidedAt:
    string;

  operationalDecision:
    HsppOperationalUseDecision;
};

function requireTimestamp(
  value: string,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty date-time string.`,
    );
  }

  const parsed =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date-time string.`,
    );
  }

  return parsed.toISOString();
}

function buildDecision(
  workItem:
    HsppPostPositiveLifecycleWorkItem,

  operationalDecision:
    HsppOperationalUseDecision,

  state:
    HsppPostPositiveMemberUnsuitabilityState,

  reason:
    HsppPostPositiveMemberUnsuitabilityReason,

  positiveAssessedAt:
    string,

  observedAt:
    string,

  decidedAt:
    string,
): HsppPostPositiveMemberUnsuitabilityDecision {
  return {
    policyVersion:
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_POLICY_VERSION,

    state,

    reason,

    persistenceReason:
      state === "UNSUITABLE"
        ? HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON
        : null,

    organizationId:
      workItem.organizationId,

    assemblyId:
      workItem.assemblyId,

    membershipId:
      workItem.membershipId,

    evidenceId:
      workItem.evidenceId,

    integrityFingerprint:
      workItem.integrityFingerprint,

    positiveAssessedAt,

    observedAt,

    decidedAt,

    operationalDecision,
  };
}

/**
 * Pure Q14 post-positive descendant-composition policy.
 *
 * Important boundary:
 *
 * An ordinary operational-use denial is NOT automatically a Q14v
 * post-positive member-unsuitability fact.
 *
 * Version 1 authorizes UNSUITABLE only when current evidence has
 * lost the exact historical positive integrity identity or current
 * integrity verification no longer MATCHes.
 *
 * Validation, assessment, trust and operational-eligibility denials
 * remain INDETERMINATE because those conditions alone do not prove
 * the narrower irreversible descendant-composition fact.
 *
 * This evaluator performs no database/network I/O, does not acquire
 * a lease, does not persist Q14v, does not cease membership, does not
 * return evidence to the Reservoir and does not reconstruct H2.
 */
export function evaluateHsppPostPositiveMemberUnsuitability({
  workItem,
  currentEvidence,
  observedAt,
  decidedAt,
}: EvaluateHsppPostPositiveMemberUnsuitabilityInput): HsppPostPositiveMemberUnsuitabilityDecision {
  if (
    !workItem ||
    typeof workItem !== "object"
  ) {
    throw new Error(
      "Post-positive lifecycle work item is required.",
    );
  }

  if (
    workItem.workState !==
    "REEVALUATION_REQUIRED"
  ) {
    throw new Error(
      "Post-positive member-unsuitability evaluation requires REEVALUATION_REQUIRED work.",
    );
  }

  if (
    workItem.unsuitabilityCheckpointId !== null ||
    workItem.unsuitabilityObservedAt !== null ||
    workItem.unsuitabilityDecidedAt !== null
  ) {
    throw new Error(
      "REEVALUATION_REQUIRED work must not already contain Q14v authority.",
    );
  }

  const positiveAssessedAt =
    requireTimestamp(
      workItem.positiveAssessedAt,
      "positiveAssessedAt",
    );

  const normalizedObservedAt =
    requireTimestamp(
      observedAt,
      "observedAt",
    );

  const normalizedDecidedAt =
    requireTimestamp(
      decidedAt,
      "decidedAt",
    );

  if (
    new Date(
      normalizedObservedAt,
    ).getTime() <
    new Date(
      positiveAssessedAt,
    ).getTime()
  ) {
    throw new Error(
      "Post-positive observation must not precede the prior positive assessment.",
    );
  }

  if (
    new Date(
      normalizedDecidedAt,
    ).getTime() <
    new Date(
      normalizedObservedAt,
    ).getTime()
  ) {
    throw new Error(
      "Post-positive decision must not precede its observation.",
    );
  }

  const operationalDecision =
    decideHsppOperationalUse(
      currentEvidence,
    );

  if (!currentEvidence.found) {
    return buildDecision(
      workItem,
      operationalDecision,
      "INDETERMINATE",
      "CURRENT_EVIDENCE_NOT_FOUND",
      positiveAssessedAt,
      normalizedObservedAt,
      normalizedDecidedAt,
    );
  }

  if (
    currentEvidence.evidence.id !==
    workItem.evidenceId
  ) {
    throw new Error(
      "Current evidence identity does not match the post-positive work item.",
    );
  }

  if (
    currentEvidence.evidence.organizationId !==
    workItem.organizationId
  ) {
    throw new Error(
      "Current evidence organization does not match the post-positive work item.",
    );
  }

  if (
    currentEvidence.evidence.integrityFingerprint !==
    workItem.integrityFingerprint
  ) {
    return buildDecision(
      workItem,
      operationalDecision,
      "UNSUITABLE",
      "CURRENT_INTEGRITY_IDENTITY_CHANGED",
      positiveAssessedAt,
      normalizedObservedAt,
      normalizedDecidedAt,
    );
  }

  if (
    currentEvidence.verification.status !==
    "MATCH"
  ) {
    return buildDecision(
      workItem,
      operationalDecision,
      "UNSUITABLE",
      "CURRENT_INTEGRITY_NOT_VERIFIED",
      positiveAssessedAt,
      normalizedObservedAt,
      normalizedDecidedAt,
    );
  }

  if (operationalDecision.allowed) {
    if (
      operationalDecision.reason !==
      "operational_use_allowed"
    ) {
      throw new Error(
        "Allowed operational decision returned a conflicting reason.",
      );
    }

    return buildDecision(
      workItem,
      operationalDecision,
      "SUITABLE",
      "CURRENT_OPERATIONAL_USE_ALLOWED",
      positiveAssessedAt,
      normalizedObservedAt,
      normalizedDecidedAt,
    );
  }

  switch (
    operationalDecision.reason
  ) {
    case "validation_not_validated":
      return buildDecision(
        workItem,
        operationalDecision,
        "INDETERMINATE",
        "CURRENT_VALIDATION_NOT_VALIDATED",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "assessment_missing":
      return buildDecision(
        workItem,
        operationalDecision,
        "INDETERMINATE",
        "CURRENT_ASSESSMENT_MISSING",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "trust_not_operational":
      return buildDecision(
        workItem,
        operationalDecision,
        "INDETERMINATE",
        "CURRENT_TRUST_NOT_OPERATIONAL",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "operational_not_eligible":
      return buildDecision(
        workItem,
        operationalDecision,
        "INDETERMINATE",
        "CURRENT_OPERATIONAL_NOT_ELIGIBLE",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "integrity_not_verified":
      return buildDecision(
        workItem,
        operationalDecision,
        "UNSUITABLE",
        "CURRENT_INTEGRITY_NOT_VERIFIED",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "evidence_not_found":
      return buildDecision(
        workItem,
        operationalDecision,
        "INDETERMINATE",
        "CURRENT_EVIDENCE_NOT_FOUND",
        positiveAssessedAt,
        normalizedObservedAt,
        normalizedDecidedAt,
      );

    case "operational_use_allowed":
      throw new Error(
        "Denied operational decision returned the allowed reason.",
      );

    default:
      throw new Error(
        "Unsupported operational-use decision reason.",
      );
  }
}
