export const HSPP_CANONICAL_CLAIMS_VERSION =
  "hspp-canonical-claims-v1" as const;

export type HsppCanonicalTruthValue =
  | "TRUE"
  | "FALSE"
  | "UNKNOWN";

export type HsppCanonicalClaim = {
  value: HsppCanonicalTruthValue;

  /*
   * The canonical proposition is derived from an immutable
   * normalized evidence claim, not from mutable Route Safety
   * enrichment or later operational state.
   */
  basis:
    | "EVENT_TYPE"
    | "NO_AUTHORIZED_BASIS";
};

export type HsppCanonicalClaimInput = {
  eventType:
    | string
    | null
    | undefined;
};

export type HsppCanonicalClaimSet = {
  canonicalClaimsVersion:
    typeof HSPP_CANONICAL_CLAIMS_VERSION;

  normalizedEventType:
    string | null;

  roadBlocked:
    HsppCanonicalClaim;

  trafficFlowImpacted:
    HsppCanonicalClaim;

  laneRestriction:
    HsppCanonicalClaim;

  roadworksPresent:
    HsppCanonicalClaim;
};

function normalizeEventType(
  value:
    | string
    | null
    | undefined
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

function unknownClaim():
  HsppCanonicalClaim {
  return {
    value:
      "UNKNOWN",

    basis:
      "NO_AUTHORIZED_BASIS",
  };
}

function trueFromEventType():
  HsppCanonicalClaim {
  return {
    value:
      "TRUE",

    basis:
      "EVENT_TYPE",
  };
}

/**
 * HSPP B11B2 canonical-claim translation v1.
 *
 * This layer converts provider-normalized event semantics into
 * provider-neutral propositions.
 *
 * Fail-closed rules:
 *
 * - absence of a proposition does NOT imply FALSE;
 * - UNKNOWN does NOT mean FALSE;
 * - TRUE means only that the normalized immutable event type
 *   positively supports the canonical proposition;
 * - canonical claims do not establish physical-world truth;
 * - canonical claims do not establish corroboration;
 * - canonical claims grant no Route Safety, Crowd or ML authority.
 *
 * B11B2 v1 intentionally does not translate provider severity,
 * free-text title/description, road-name identity or mutable
 * operational status.
 */
export function buildHsppCanonicalClaims(
  input:
    HsppCanonicalClaimInput
): HsppCanonicalClaimSet {
  const normalizedEventType =
    normalizeEventType(
      input.eventType
    );

  const roadBlocked =
    normalizedEventType ===
      "road_closure" ||
    normalizedEventType ===
      "roadblock"
      ? trueFromEventType()
      : unknownClaim();

  const trafficFlowImpacted =
    normalizedEventType ===
      "congestion"
      ? trueFromEventType()
      : unknownClaim();

  const laneRestriction =
    normalizedEventType ===
      "lane_closure"
      ? trueFromEventType()
      : unknownClaim();

  const roadworksPresent =
    normalizedEventType ===
      "roadworks"
      ? trueFromEventType()
      : unknownClaim();

  return {
    canonicalClaimsVersion:
      HSPP_CANONICAL_CLAIMS_VERSION,

    normalizedEventType,

    roadBlocked,
    trafficFlowImpacted,
    laneRestriction,
    roadworksPresent,
  };
}