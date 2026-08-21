import {
  HSPP_ASSEMBLY_DECISION_VERSION,
  type HsppAssemblyDecisionReason,
  type HsppAssemblyDecisionState,
} from "./evaluateHsppAssemblyDecision";

import {
  HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,
  type HsppPersistedAssemblyDecision,
} from "./persistHsppAssemblyDecision";

export const HSPP_ASSEMBLY_AUTHORITY_VERSION =
  "hspp-assembly-authority-v1" as const;

export type HsppAssemblyAuthorityState =
  | "DENIED"
  | "ASSESSMENT_CANDIDATE";

export type HsppAssemblyAuthorityReason =
  | "UNSUPPORTED_PERSISTENCE_VERSION"
  | "UNSUPPORTED_DECISION_POLICY_VERSION"
  | "AUTHORITY_NOT_NONE"
  | "INVALID_ASSEMBLY_DECISION_PROVENANCE"
  | "ASSEMBLY_NOT_READY"
  | "ASSEMBLY_CONFLICTED"
  | "ASSEMBLY_UNRESOLVED"
  | "CONSISTENT_ASSEMBLY_CANDIDATE";

export type HsppAssemblyAuthorityDecision = {
  policyVersion:
    typeof HSPP_ASSEMBLY_AUTHORITY_VERSION;

  state:
    HsppAssemblyAuthorityState;

  reason:
    HsppAssemblyAuthorityReason;

  assemblyDecisionId:
    string;

  assemblyId:
    string;

  organizationId:
    string;

  sourcePersistenceVersion:
    string;

  sourceDecisionPolicyVersion:
    string;

  sourceDecisionState:
    HsppAssemblyDecisionState;

  sourceDecisionReason:
    HsppAssemblyDecisionReason;

  /*
   * B11F1 is candidacy only.
   *
   * ASSESSMENT_CANDIDATE means:
   *
   * - a B11E-persisted assembly decision exists;
   * - that persisted decision uses supported protocol versions;
   * - its authority remains NONE;
   * - its B11D state/reason provenance is coherent; and
   * - the B11D assembly state is CONSISTENT.
   *
   * It does NOT mean:
   *
   * - CORROBORATED trust;
   * - VERIFIED trust;
   * - operational eligibility;
   * - Crowd eligibility;
   * - ML training eligibility;
   * - validation eligibility;
   * - physical-world truth.
   *
   * B11F1 does not call applyHsppAssessmentDecision().
   * A later protocol layer must perform any actual assessment.
   */
  authority:
    "NONE";
};

function result(
  input:
    HsppPersistedAssemblyDecision,
  state:
    HsppAssemblyAuthorityState,
  reason:
    HsppAssemblyAuthorityReason
): HsppAssemblyAuthorityDecision {
  return {
    policyVersion:
      HSPP_ASSEMBLY_AUTHORITY_VERSION,

    state,
    reason,

    assemblyDecisionId:
      input.id,

    assemblyId:
      input.assemblyId,

    organizationId:
      input.organizationId,

    sourcePersistenceVersion:
      input.persistenceVersion,

    sourceDecisionPolicyVersion:
      input.decisionPolicyVersion,

    sourceDecisionState:
      input.decisionState,

    sourceDecisionReason:
      input.decisionReason,

    authority:
      "NONE",
  };
}

function decisionProvenanceIsCoherent(
  state:
    HsppAssemblyDecisionState,
  reason:
    HsppAssemblyDecisionReason
): boolean {
  if (
    state ===
    "NOT_READY"
  ) {
    return (
      reason ===
        "ASSEMBLY_NOT_SCANNED" ||
      reason ===
        "INSUFFICIENT_EVIDENCE" ||
      reason ===
        "INVALID_SCAN_SUMMARY"
    );
  }

  if (
    state ===
    "CONFLICTED"
  ) {
    return (
      reason ===
      "CANONICAL_CONFLICT_PRESENT"
    );
  }

  if (
    state ===
    "UNRESOLVED"
  ) {
    return (
      reason ===
      "NO_COMPARABLE_AGREEMENT"
    );
  }

  if (
    state ===
    "CONSISTENT"
  ) {
    return (
      reason ===
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
    );
  }

  return false;
}

/**
 * HSPP B11F1 assembly-authority candidacy v1.
 *
 * This is deliberately a pure policy boundary.
 *
 * Decision order is fail-closed:
 *
 * 1. Require canonical B11E persistence version.
 * 2. Require canonical B11D decision-policy version.
 * 3. Require persisted authority NONE.
 * 4. Require coherent B11D state/reason provenance.
 * 5. NOT_READY, CONFLICTED and UNRESOLVED are DENIED.
 * 6. Only CONSISTENT becomes ASSESSMENT_CANDIDATE.
 *
 * ASSESSMENT_CANDIDATE grants no trust or eligibility.
 */
export function evaluateHsppAssemblyAuthority(
  input:
    HsppPersistedAssemblyDecision
): HsppAssemblyAuthorityDecision {
  if (
    input.persistenceVersion !==
    HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION
  ) {
    return result(
      input,
      "DENIED",
      "UNSUPPORTED_PERSISTENCE_VERSION"
    );
  }

  if (
    input.decisionPolicyVersion !==
    HSPP_ASSEMBLY_DECISION_VERSION
  ) {
    return result(
      input,
      "DENIED",
      "UNSUPPORTED_DECISION_POLICY_VERSION"
    );
  }

  if (
    input.authority !==
    "NONE"
  ) {
    return result(
      input,
      "DENIED",
      "AUTHORITY_NOT_NONE"
    );
  }

  if (
    !decisionProvenanceIsCoherent(
      input.decisionState,
      input.decisionReason
    )
  ) {
    return result(
      input,
      "DENIED",
      "INVALID_ASSEMBLY_DECISION_PROVENANCE"
    );
  }

  if (
    input.decisionState ===
    "NOT_READY"
  ) {
    return result(
      input,
      "DENIED",
      "ASSEMBLY_NOT_READY"
    );
  }

  if (
    input.decisionState ===
    "CONFLICTED"
  ) {
    return result(
      input,
      "DENIED",
      "ASSEMBLY_CONFLICTED"
    );
  }

  if (
    input.decisionState ===
    "UNRESOLVED"
  ) {
    return result(
      input,
      "DENIED",
      "ASSEMBLY_UNRESOLVED"
    );
  }

  if (
    input.decisionState ===
    "CONSISTENT"
  ) {
    return result(
      input,
      "ASSESSMENT_CANDIDATE",
      "CONSISTENT_ASSEMBLY_CANDIDATE"
    );
  }

  return result(
    input,
    "DENIED",
    "INVALID_ASSEMBLY_DECISION_PROVENANCE"
  );
}