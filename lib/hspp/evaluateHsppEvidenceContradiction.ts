import type {
  HsppAssemblyMembershipDecision,
} from "./evaluateHsppAssemblyMembership";

export const HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION =
  "hspp-evidence-contradiction-v1" as const;

export type HsppEvidenceClaimOutcome =
  | "AGREE"
  | "UNKNOWN"
  | "CONFLICT";

export type HsppEvidenceContradictionState =
  | "NOT_EVALUATED"
  | "NO_CONFLICT"
  | "CONFLICT";

export type HsppEvidenceClaimComparison = {
  claim: string;
  firstValue: string | null;
  secondValue: string | null;
  outcome: HsppEvidenceClaimOutcome;
  comparable: boolean;
};

export type HsppEvidenceContradictionInput = {
  eventType: string | null | undefined;

  /*
   * These fields are intentionally carried as informational inputs
   * but are NOT contradiction-authoritative in policy v1.
   *
   * Their provider semantics are not yet sufficiently equivalent.
   */
  severity?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  roadName?: string | null;
  roadFrom?: string | null;
  roadTo?: string | null;
};

export type HsppEvidenceContradictionDecision = {
  policyVersion:
    typeof HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION;

  state: HsppEvidenceContradictionState;

  contradictory: boolean;

  reason:
    | "MEMBERSHIP_NOT_ELIGIBLE"
    | "COMPARABLE_CLAIM_CONFLICT"
    | "NO_COMPARABLE_CLAIM_CONFLICT";

  comparisons: HsppEvidenceClaimComparison[];
};

function normalizeClaim(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return normalized || null;
}

function compareEventType(
  first: HsppEvidenceContradictionInput,
  second: HsppEvidenceContradictionInput
): HsppEvidenceClaimComparison {
  const firstValue =
    normalizeClaim(first.eventType);

  const secondValue =
    normalizeClaim(second.eventType);

  if (
    firstValue === null ||
    secondValue === null
  ) {
    return {
      claim: "event_type",
      firstValue,
      secondValue,
      outcome: "UNKNOWN",
      comparable: true,
    };
  }

  if (firstValue === secondValue) {
    return {
      claim: "event_type",
      firstValue,
      secondValue,
      outcome: "AGREE",
      comparable: true,
    };
  }

  return {
    claim: "event_type",
    firstValue,
    secondValue,
    outcome: "CONFLICT",
    comparable: true,
  };
}

function informationalComparison(
  claim: string,
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): HsppEvidenceClaimComparison {
  return {
    claim,
    firstValue:
      normalizeClaim(firstValue),
    secondValue:
      normalizeClaim(secondValue),

    /*
     * UNKNOWN is intentional.
     *
     * B11B v1 must not reinterpret provider-specific or
     * informational values as corroboration or contradiction.
     */
    outcome: "UNKNOWN",
    comparable: false,
  };
}

/**
 * HSPP B11B contradiction policy v1.
 *
 * This function operates only after B11A2 membership evaluation.
 *
 * A B11A2 ELIGIBLE result means the evidence is permitted to enter
 * the same candidate assembly. It does not mean the evidence agrees.
 *
 * B11B then compares only claims whose semantics are explicitly
 * authorized by this versioned contradiction policy.
 *
 * In v1:
 * - event_type is contradiction-authoritative;
 * - severity is provider-specific;
 * - title and description are provider-specific;
 * - status is informational;
 * - road fields are not yet normalized for contradiction authority.
 *
 * UNKNOWN is not AGREE.
 * NO_CONFLICT is not corroboration.
 * NO_CONFLICT is not truth.
 * NO_CONFLICT grants no downstream authority.
 */
export function evaluateHsppEvidenceContradiction(
  membership:
    HsppAssemblyMembershipDecision,
  first:
    HsppEvidenceContradictionInput,
  second:
    HsppEvidenceContradictionInput
): HsppEvidenceContradictionDecision {
  if (!membership.eligible) {
    return {
      policyVersion:
        HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION,

      state:
        "NOT_EVALUATED",

      contradictory:
        false,

      reason:
        "MEMBERSHIP_NOT_ELIGIBLE",

      comparisons:
        [],
    };
  }

  const comparisons:
    HsppEvidenceClaimComparison[] = [
      compareEventType(
        first,
        second
      ),

      informationalComparison(
        "severity",
        first.severity,
        second.severity
      ),

      informationalComparison(
        "title",
        first.title,
        second.title
      ),

      informationalComparison(
        "description",
        first.description,
        second.description
      ),

      informationalComparison(
        "status",
        first.status,
        second.status
      ),

      informationalComparison(
        "road_name",
        first.roadName,
        second.roadName
      ),

      informationalComparison(
        "road_from",
        first.roadFrom,
        second.roadFrom
      ),

      informationalComparison(
        "road_to",
        first.roadTo,
        second.roadTo
      ),
    ];

  const hasConflict =
    comparisons.some(
      (comparison) =>
        comparison.comparable &&
        comparison.outcome ===
          "CONFLICT"
    );

  if (hasConflict) {
    return {
      policyVersion:
        HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION,

      state:
        "CONFLICT",

      contradictory:
        true,

      reason:
        "COMPARABLE_CLAIM_CONFLICT",

      comparisons,
    };
  }

  return {
    policyVersion:
      HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION,

    state:
      "NO_CONFLICT",

    contradictory:
      false,

    reason:
      "NO_COMPARABLE_CLAIM_CONFLICT",

    comparisons,
  };
}