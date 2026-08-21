import {
  evaluateHsppCanonicalContradiction,
  type HsppCanonicalClaimComparison,
} from "./evaluateHsppCanonicalContradiction";

import type {
  HsppCanonicalClaimSet,
} from "./buildHsppCanonicalClaims";

export const HSPP_ASSEMBLY_SCAN_VERSION =
  "hspp-assembly-scan-v1" as const;

export type HsppAssemblyState =
  | "OPEN"
  | "SEALED";

export type HsppAssemblyScanMember = {
  evidenceId: string;
  integrityFingerprint: string;
  memberOrdinal: number;
  canonicalClaims: HsppCanonicalClaimSet;
};

export type HsppAssemblyScanInput = {
  assemblyId: string;
  organizationId: string;
  assemblyState: HsppAssemblyState;
  members: HsppAssemblyScanMember[];
};

export type HsppAssemblyScanState =
  | "NOT_SCANNABLE"
  | "INSUFFICIENT_EVIDENCE"
  | "SCANNED";

export type HsppAssemblyScanReason =
  | "ASSEMBLY_NOT_SEALED"
  | "INSUFFICIENT_MEMBERS"
  | "INVALID_MEMBER_IDENTITY"
  | "INVALID_MEMBER_ORDER"
  | "DUPLICATE_MEMBER"
  | "CANONICAL_CONFLICT_PRESENT"
  | "NO_CANONICAL_CONFLICT";

export type HsppAssemblyPairScan = {
  firstEvidenceId: string;
  secondEvidenceId: string;
  contradictory: boolean;
  comparisons:
    HsppCanonicalClaimComparison[];
};

export type HsppAssemblyScanResult = {
  scanVersion:
    typeof HSPP_ASSEMBLY_SCAN_VERSION;

  state:
    HsppAssemblyScanState;

  reason:
    HsppAssemblyScanReason;

  memberCount: number;
  pairCount: number;

  canonicalConflictCount: number;
  canonicalAgreementCount: number;
  canonicalUnknownCount: number;

  hasCanonicalConflict: boolean;

  pairScans:
    HsppAssemblyPairScan[];

  /*
   * B11C is descriptive only.
   *
   * It does not establish physical-world truth.
   * It does not establish corroboration.
   * It does not promote trust state.
   * It grants no Route Safety authority.
   * It grants no Crowd Intelligence authority.
   * It grants no ML training or validation authority.
   * It does not persist protocol state.
   */
  authority:
    "NONE";
};

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;

function baseResult(
  state: HsppAssemblyScanState,
  reason: HsppAssemblyScanReason,
  memberCount: number
): HsppAssemblyScanResult {
  return {
    scanVersion:
      HSPP_ASSEMBLY_SCAN_VERSION,

    state,
    reason,

    memberCount,
    pairCount:
      0,

    canonicalConflictCount:
      0,

    canonicalAgreementCount:
      0,

    canonicalUnknownCount:
      0,

    hasCanonicalConflict:
      false,

    pairScans:
      [],

    authority:
      "NONE",
  };
}

/**
 * HSPP B11C completed-assembly scanner.
 *
 * This function consumes a complete in-memory snapshot of an
 * HSPP evidence assembly. Database loading belongs to a separate
 * integration boundary.
 *
 * Scan rules:
 *
 * - OPEN assemblies cannot be scanned as completed assemblies;
 * - a completed multi-evidence scan requires at least two members;
 * - member identities and bound SHA-256 fingerprints must be valid;
 * - member ordinals must be exactly 1..N with no gaps;
 * - duplicate evidence identities are rejected;
 * - every unordered member pair is compared exactly once;
 * - B11B3 canonical AGREE / UNKNOWN / CONFLICT outcomes are counted;
 * - UNKNOWN remains unresolved and is never converted to agreement;
 * - no-conflict is not corroboration;
 * - scan output is descriptive evidence analysis only;
 * - authority always remains NONE.
 */
export function scanHsppEvidenceAssembly(
  input:
    HsppAssemblyScanInput
): HsppAssemblyScanResult {
  const members =
    [...input.members].sort(
      (first, second) =>
        first.memberOrdinal -
        second.memberOrdinal
    );

  if (
    input.assemblyState !==
    "SEALED"
  ) {
    return baseResult(
      "NOT_SCANNABLE",
      "ASSEMBLY_NOT_SEALED",
      members.length
    );
  }

  if (members.length < 2) {
    return baseResult(
      "INSUFFICIENT_EVIDENCE",
      "INSUFFICIENT_MEMBERS",
      members.length
    );
  }

  const evidenceIds =
    new Set<string>();

  for (
    let index = 0;
    index < members.length;
    index += 1
  ) {
    const member =
      members[index];

    const evidenceId =
      member.evidenceId.trim();

    if (
      !evidenceId ||
      !SHA256_PATTERN.test(
        member.integrityFingerprint
      )
    ) {
      return baseResult(
        "NOT_SCANNABLE",
        "INVALID_MEMBER_IDENTITY",
        members.length
      );
    }

    if (
      member.memberOrdinal !==
      index + 1
    ) {
      return baseResult(
        "NOT_SCANNABLE",
        "INVALID_MEMBER_ORDER",
        members.length
      );
    }

    if (
      evidenceIds.has(
        evidenceId
      )
    ) {
      return baseResult(
        "NOT_SCANNABLE",
        "DUPLICATE_MEMBER",
        members.length
      );
    }

    evidenceIds.add(
      evidenceId
    );
  }

  const pairScans:
    HsppAssemblyPairScan[] = [];

  let canonicalConflictCount =
    0;

  let canonicalAgreementCount =
    0;

  let canonicalUnknownCount =
    0;

  for (
    let firstIndex = 0;
    firstIndex < members.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex < members.length;
      secondIndex += 1
    ) {
      const first =
        members[firstIndex];

      const second =
        members[secondIndex];

      const decision =
        evaluateHsppCanonicalContradiction(
          first.canonicalClaims,
          second.canonicalClaims
        );

      for (
        const comparison of
        decision.comparisons
      ) {
        if (
          comparison.outcome ===
          "CONFLICT"
        ) {
          canonicalConflictCount +=
            1;
        }
        else if (
          comparison.outcome ===
          "AGREE"
        ) {
          canonicalAgreementCount +=
            1;
        }
        else {
          canonicalUnknownCount +=
            1;
        }
      }

      pairScans.push({
        firstEvidenceId:
          first.evidenceId,

        secondEvidenceId:
          second.evidenceId,

        contradictory:
          decision.contradictory,

        comparisons:
          decision.comparisons,
      });
    }
  }

  const hasCanonicalConflict =
    canonicalConflictCount > 0;

  return {
    scanVersion:
      HSPP_ASSEMBLY_SCAN_VERSION,

    state:
      "SCANNED",

    reason:
      hasCanonicalConflict
        ? "CANONICAL_CONFLICT_PRESENT"
        : "NO_CANONICAL_CONFLICT",

    memberCount:
      members.length,

    pairCount:
      pairScans.length,

    canonicalConflictCount,
    canonicalAgreementCount,
    canonicalUnknownCount,

    hasCanonicalConflict,

    pairScans,

    authority:
      "NONE",
  };
}