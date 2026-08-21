import type {
  HsppAssemblyScanResult,
} from "./scanHsppEvidenceAssembly";

export const HSPP_ASSEMBLY_DECISION_VERSION =
  "hspp-assembly-decision-v1" as const;

export type HsppAssemblyDecisionState =
  | "NOT_READY"
  | "CONFLICTED"
  | "UNRESOLVED"
  | "CONSISTENT";

export type HsppAssemblyDecisionReason =
  | "ASSEMBLY_NOT_SCANNED"
  | "INSUFFICIENT_EVIDENCE"
  | "INVALID_SCAN_SUMMARY"
  | "CANONICAL_CONFLICT_PRESENT"
  | "NO_COMPARABLE_AGREEMENT"
  | "CANONICAL_AGREEMENT_WITHOUT_CONFLICT";

export type HsppAssemblyDecision = {
  policyVersion:
    typeof HSPP_ASSEMBLY_DECISION_VERSION;

  state:
    HsppAssemblyDecisionState;

  reason:
    HsppAssemblyDecisionReason;

  memberCount: number;
  pairCount: number;

  canonicalConflictCount: number;
  canonicalAgreementCount: number;
  canonicalUnknownCount: number;

  /*
   * B11D is a protocol interpretation of the B11C scan.
   *
   * CONSISTENT means only:
   *
   * - the assembly was successfully scanned;
   * - at least one comparable canonical claim agreed; and
   * - no canonical conflict is currently known.
   *
   * CONSISTENT does not establish physical-world truth.
   * CONSISTENT does not mean all claims are resolved.
   * CONSISTENT does not itself establish CORROBORATED trust.
   *
   * B11D does not change HSPP trustState or validationState.
   * B11D does not grant operational eligibility.
   * B11D does not grant Crowd eligibility.
   * B11D does not grant ML training eligibility.
   * B11D does not grant validation eligibility.
   * B11D does not persist or apply an HsppAssessmentDecision.
   */
  authority:
    "NONE";
};

function decision(
  scan:
    HsppAssemblyScanResult,
  state:
    HsppAssemblyDecisionState,
  reason:
    HsppAssemblyDecisionReason
): HsppAssemblyDecision {
  return {
    policyVersion:
      HSPP_ASSEMBLY_DECISION_VERSION,

    state,
    reason,

    memberCount:
      scan.memberCount,

    pairCount:
      scan.pairCount,

    canonicalConflictCount:
      scan.canonicalConflictCount,

    canonicalAgreementCount:
      scan.canonicalAgreementCount,

    canonicalUnknownCount:
      scan.canonicalUnknownCount,

    authority:
      "NONE",
  };
}

/**
 * HSPP B11D master assembly decision v1.
 *
 * Decision order is deliberately fail-closed:
 *
 * 1. An assembly that B11C could not scan is NOT_READY.
 * 2. A structurally impossible scan summary is NOT_READY.
 * 3. Any explicit canonical conflict makes the assembly CONFLICTED.
 * 4. A scanned assembly with no comparable agreement is UNRESOLVED.
 * 5. At least one canonical agreement with no conflict is CONSISTENT.
 *
 * UNKNOWN claims may remain in a CONSISTENT assembly.
 * Absence of conflict is not proof of truth.
 * Agreement is not automatically HSPP CORROBORATED trust.
 */
export function evaluateHsppAssemblyDecision(
  scan:
    HsppAssemblyScanResult
): HsppAssemblyDecision {
  if (
    scan.state ===
    "INSUFFICIENT_EVIDENCE"
  ) {
    return decision(
      scan,
      "NOT_READY",
      "INSUFFICIENT_EVIDENCE"
    );
  }

  if (
    scan.state !==
    "SCANNED"
  ) {
    return decision(
      scan,
      "NOT_READY",
      "ASSEMBLY_NOT_SCANNED"
    );
  }

  /*
   * Defensive validation of the B11C summary.
   *
   * B11C should already guarantee these invariants. B11D refuses
   * to interpret an impossible or internally inconsistent summary
   * if it is ever supplied by another integration boundary.
   */
  if (
    scan.memberCount < 2 ||
    scan.pairCount < 1 ||
    scan.canonicalConflictCount < 0 ||
    scan.canonicalAgreementCount < 0 ||
    scan.canonicalUnknownCount < 0 ||
    (
      scan.hasCanonicalConflict &&
      scan.canonicalConflictCount === 0
    ) ||
    (
      !scan.hasCanonicalConflict &&
      scan.canonicalConflictCount > 0
    )
  ) {
    return decision(
      scan,
      "NOT_READY",
      "INVALID_SCAN_SUMMARY"
    );
  }

  if (
    scan.hasCanonicalConflict ||
    scan.canonicalConflictCount > 0
  ) {
    return decision(
      scan,
      "CONFLICTED",
      "CANONICAL_CONFLICT_PRESENT"
    );
  }

  if (
    scan.canonicalAgreementCount ===
    0
  ) {
    return decision(
      scan,
      "UNRESOLVED",
      "NO_COMPARABLE_AGREEMENT"
    );
  }

  return decision(
    scan,
    "CONSISTENT",
    "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
  );
}