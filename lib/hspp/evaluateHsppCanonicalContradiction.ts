import type {
  HsppCanonicalClaim,
  HsppCanonicalClaimSet,
  HsppCanonicalTruthValue,
} from "./buildHsppCanonicalClaims";

export const HSPP_CANONICAL_CONTRADICTION_VERSION =
  "hspp-canonical-contradiction-v1" as const;

export type HsppCanonicalClaimOutcome =
  | "AGREE"
  | "UNKNOWN"
  | "CONFLICT";

export type HsppCanonicalClaimComparison = {
  claim: keyof Pick<
    HsppCanonicalClaimSet,
    | "roadBlocked"
    | "trafficFlowImpacted"
    | "laneRestriction"
    | "roadworksPresent"
  >;

  firstValue: HsppCanonicalTruthValue;
  secondValue: HsppCanonicalTruthValue;

  outcome: HsppCanonicalClaimOutcome;

  comparable: boolean;
};

export type HsppCanonicalContradictionDecision = {
  policyVersion:
    typeof HSPP_CANONICAL_CONTRADICTION_VERSION;

  contradictory: boolean;

  reason:
    | "CANONICAL_CLAIM_CONFLICT"
    | "NO_CANONICAL_CLAIM_CONFLICT";

  comparisons:
    HsppCanonicalClaimComparison[];
};

/*
 * HSPP B11B3 canonical contradiction comparison.
 *
 * Canonical propositions are provider-neutral semantic claims
 * produced by B11B2.
 *
 * Fail-closed rules:
 *
 * - TRUE vs TRUE is AGREE;
 * - FALSE vs FALSE is AGREE;
 * - TRUE vs FALSE is CONFLICT;
 * - FALSE vs TRUE is CONFLICT;
 * - UNKNOWN involving either side remains UNKNOWN;
 * - UNKNOWN is never interpreted as FALSE;
 * - NO_CANONICAL_CLAIM_CONFLICT is not corroboration;
 * - NO_CANONICAL_CLAIM_CONFLICT is not physical-world truth;
 * - this layer grants no downstream Route Safety, Crowd or ML
 *   authority.
 *
 * B11B2 v1 currently emits positive TRUE assertions or UNKNOWN.
 * FALSE remains part of the canonical truth domain for future
 * explicitly authorized negative evidence.
 */

export function compareHsppCanonicalClaim(
  claim:
    HsppCanonicalClaimComparison["claim"],
  first:
    HsppCanonicalClaim,
  second:
    HsppCanonicalClaim
): HsppCanonicalClaimComparison {
  const firstValue =
    first.value;

  const secondValue =
    second.value;

  if (
    firstValue === "UNKNOWN" ||
    secondValue === "UNKNOWN"
  ) {
    return {
      claim,
      firstValue,
      secondValue,
      outcome: "UNKNOWN",
      comparable: false,
    };
  }

  if (firstValue === secondValue) {
    return {
      claim,
      firstValue,
      secondValue,
      outcome: "AGREE",
      comparable: true,
    };
  }

  return {
    claim,
    firstValue,
    secondValue,
    outcome: "CONFLICT",
    comparable: true,
  };
}

export function evaluateHsppCanonicalContradiction(
  first:
    HsppCanonicalClaimSet,
  second:
    HsppCanonicalClaimSet
): HsppCanonicalContradictionDecision {
  const comparisons:
    HsppCanonicalClaimComparison[] = [
      compareHsppCanonicalClaim(
        "roadBlocked",
        first.roadBlocked,
        second.roadBlocked
      ),

      compareHsppCanonicalClaim(
        "trafficFlowImpacted",
        first.trafficFlowImpacted,
        second.trafficFlowImpacted
      ),

      compareHsppCanonicalClaim(
        "laneRestriction",
        first.laneRestriction,
        second.laneRestriction
      ),

      compareHsppCanonicalClaim(
        "roadworksPresent",
        first.roadworksPresent,
        second.roadworksPresent
      ),
    ];

  const hasConflict =
    comparisons.some(
      (comparison) =>
        comparison.comparable &&
        comparison.outcome ===
          "CONFLICT"
    );

  return {
    policyVersion:
      HSPP_CANONICAL_CONTRADICTION_VERSION,

    contradictory:
      hasConflict,

    reason:
      hasConflict
        ? "CANONICAL_CLAIM_CONFLICT"
        : "NO_CANONICAL_CLAIM_CONFLICT",

    comparisons,
  };
}
