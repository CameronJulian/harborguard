import type { HsppCanonicalClaimOutcome } from "@/lib/hspp/evaluateHsppCanonicalContradiction";

import type { HsppAssemblyPairScan } from "@/lib/hspp/scanHsppEvidenceAssembly";

export const HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION =
  "hspp-canonical-pair-relation-reduction-v1" as const;

export type HsppCanonicalPairRelation = HsppCanonicalClaimOutcome;

export type HsppCanonicalPairRelationReduction = {
  policyVersion: typeof HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION;

  firstEvidenceId: string;

  secondEvidenceId: string;

  comparisonCount: number;

  conflictCount: number;

  agreementCount: number;

  unknownCount: number;

  canonicalRelation: HsppCanonicalPairRelation;

  /*
   * This boundary reduces already-computed B11C comparison
   * provenance only. It grants no downstream authority.
   */
  authority: "NONE";
};

function requireIdentity(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `HSPP canonical pair ${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}

function requireOutcome(value: unknown): HsppCanonicalPairRelation {
  if (value !== "AGREE" && value !== "UNKNOWN" && value !== "CONFLICT") {
    throw new Error(
      "HSPP canonical pair comparison has an unsupported outcome.",
    );
  }

  return value;
}

/**
 * B7490-07N3 canonical pair-relation reduction boundary.
 *
 * This function consumes one already-computed B11C pair scan.
 *
 * The reduction order matches the existing fail-closed B11C/B11D
 * semantics:
 *
 *   1. any CONFLICT -> CONFLICT;
 *   2. otherwise, any AGREE -> AGREE;
 *   3. otherwise -> UNKNOWN.
 *
 * UNKNOWN is never promoted to AGREE.
 * Absence of conflict is not corroboration.
 *
 * This function deliberately does NOT:
 *
 * - rerun B11A2 membership evaluation;
 * - rerun B11B3 canonical comparison;
 * - scan an assembly;
 * - invoke B11F4;
 * - construct CORROBORATED trust;
 * - perform database reads or writes;
 * - apply an HSPP assessment;
 * - grant operational, Crowd, training or validation eligibility;
 * - create API, cron, queue, retry or scheduler behavior.
 */
export function reduceHsppCanonicalPairRelation(
  pairScan: HsppAssemblyPairScan,
): HsppCanonicalPairRelationReduction {
  if (!pairScan || typeof pairScan !== "object") {
    throw new Error("HSPP canonical pair scan is required.");
  }

  const firstEvidenceId = requireIdentity(
    pairScan.firstEvidenceId,
    "firstEvidenceId",
  );

  const secondEvidenceId = requireIdentity(
    pairScan.secondEvidenceId,
    "secondEvidenceId",
  );

  if (firstEvidenceId === secondEvidenceId) {
    throw new Error(
      "HSPP canonical pair must contain two distinct evidence identities.",
    );
  }

  if (typeof pairScan.contradictory !== "boolean") {
    throw new Error("HSPP canonical pair contradictory flag must be boolean.");
  }

  if (!Array.isArray(pairScan.comparisons)) {
    throw new Error("HSPP canonical pair comparisons must be an array.");
  }

  let conflictCount = 0;
  let agreementCount = 0;
  let unknownCount = 0;

  for (const comparison of pairScan.comparisons) {
    if (!comparison || typeof comparison !== "object") {
      throw new Error("HSPP canonical pair comparison must be an object.");
    }

    const outcome = requireOutcome(
      (
        comparison as {
          outcome?: unknown;
        }
      ).outcome,
    );

    const comparable = (
      comparison as {
        comparable?: unknown;
      }
    ).comparable;

    if (typeof comparable !== "boolean") {
      throw new Error(
        "HSPP canonical pair comparison comparable flag must be boolean.",
      );
    }

    if (outcome === "CONFLICT") {
      conflictCount += 1;
    } else if (outcome === "AGREE") {
      agreementCount += 1;
    } else {
      unknownCount += 1;
    }
  }

  const hasConflict = conflictCount > 0;

  /*
   * B11C obtains contradictory from the same canonical
   * comparison set. Refuse an internally inconsistent pair scan.
   */
  if (pairScan.contradictory !== hasConflict) {
    throw new Error(
      "HSPP canonical pair contradictory flag does not match its comparison outcomes.",
    );
  }

  let canonicalRelation: HsppCanonicalPairRelation = "UNKNOWN";

  if (conflictCount > 0) {
    canonicalRelation = "CONFLICT";
  } else if (agreementCount > 0) {
    canonicalRelation = "AGREE";
  }

  return {
    policyVersion: HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION,

    firstEvidenceId,

    secondEvidenceId,

    comparisonCount: pairScan.comparisons.length,

    conflictCount,

    agreementCount,

    unknownCount,

    canonicalRelation,

    authority: "NONE",
  };
}
