import {
  getDistanceMeters,
} from "@/lib/geo/getDistanceMeters";

export const HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION =
  "hspp-assembly-membership-v1" as const;

export const HSPP_ASSEMBLY_MAX_DISTANCE_METERS =
  1_000;

export const HSPP_ASSEMBLY_MAX_TIME_DELTA_MS =
  60 * 60 * 1000;

export type HsppAssemblyMembershipEvidence = {
  organizationId: string;
  evidenceId: string;
  integrityFingerprint: string;

  sourceClass: string;
  sourceProvider: string | null;

  observedAt: string;

  latitude: number;
  longitude: number;

  eventType: string;
};

export type HsppAssemblyMembershipReason =
  | "ELIGIBLE"
  | "INVALID_ORGANIZATION_ID"
  | "ORGANIZATION_MISMATCH"
  | "INVALID_EVIDENCE_ID"
  | "SAME_EVIDENCE"
  | "INVALID_FINGERPRINT"
  | "SOURCE_CLASS_MISMATCH"
  | "MISSING_PROVIDER"
  | "SAME_PROVIDER"
  | "INVALID_OBSERVED_AT"
  | "TIME_WINDOW_EXCEEDED"
  | "INVALID_COORDINATES"
  | "DISTANCE_EXCEEDED"
  | "EVENT_TYPE_MISMATCH";

export type HsppAssemblyMembershipDecision = {
  policyVersion:
    typeof HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION;

  eligible: boolean;

  reason: HsppAssemblyMembershipReason;

  distanceMeters: number | null;
  timeDeltaMs: number | null;
};

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;

function deny(
  reason: Exclude<
    HsppAssemblyMembershipReason,
    "ELIGIBLE"
  >,
  distanceMeters: number | null = null,
  timeDeltaMs: number | null = null
): HsppAssemblyMembershipDecision {
  return {
    policyVersion:
      HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION,
    eligible: false,
    reason,
    distanceMeters,
    timeDeltaMs,
  };
}

function normalizeToken(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

function validCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * B11A2 deterministic assembly-membership policy.
 *
 * This function answers only:
 *
 *   "Are these two immutable evidence records eligible to
 *    become members of the same evidence assembly under
 *    membership policy v1?"
 *
 * ELIGIBLE does NOT mean:
 *
 * - same physical-world event has been proven;
 * - either item corroborates the other;
 * - contradiction is absent;
 * - HSPP trust may be promoted;
 * - Route Safety authority is granted;
 * - Crowd Intelligence is authorized;
 * - ML training or validation is authorized.
 *
 * Those remain later protocol stages.
 */
export function evaluateHsppAssemblyMembership(
  first: HsppAssemblyMembershipEvidence,
  second: HsppAssemblyMembershipEvidence
): HsppAssemblyMembershipDecision {
  const firstOrganizationId =
    first.organizationId.trim();

  const secondOrganizationId =
    second.organizationId.trim();

  if (
    !firstOrganizationId ||
    !secondOrganizationId
  ) {
    return deny(
      "INVALID_ORGANIZATION_ID"
    );
  }

  if (
    firstOrganizationId !==
    secondOrganizationId
  ) {
    return deny(
      "ORGANIZATION_MISMATCH"
    );
  }

  const firstEvidenceId =
    first.evidenceId.trim();

  const secondEvidenceId =
    second.evidenceId.trim();

  if (
    !firstEvidenceId ||
    !secondEvidenceId
  ) {
    return deny(
      "INVALID_EVIDENCE_ID"
    );
  }

  if (
    firstEvidenceId === secondEvidenceId
  ) {
    return deny(
      "SAME_EVIDENCE"
    );
  }

  if (
    !SHA256_PATTERN.test(
      first.integrityFingerprint
    ) ||
    !SHA256_PATTERN.test(
      second.integrityFingerprint
    )
  ) {
    return deny(
      "INVALID_FINGERPRINT"
    );
  }

  const firstSourceClass =
    normalizeToken(first.sourceClass);

  const secondSourceClass =
    normalizeToken(second.sourceClass);

  if (
    !firstSourceClass ||
    !secondSourceClass ||
    firstSourceClass !== secondSourceClass
  ) {
    return deny(
      "SOURCE_CLASS_MISMATCH"
    );
  }

  const firstProvider =
    first.sourceProvider
      ? normalizeToken(first.sourceProvider)
      : "";

  const secondProvider =
    second.sourceProvider
      ? normalizeToken(second.sourceProvider)
      : "";

  /*
   * B11A2 v1 is deliberately conservative:
   * provider identity must be known for both members
   * before distinct-provider eligibility can be proven.
   */
  if (
    !firstProvider ||
    !secondProvider
  ) {
    return deny(
      "MISSING_PROVIDER"
    );
  }

  /*
   * Assembly admission candidates must originate from
   * distinct providers. Same-provider observations may
   * still exist independently but cannot establish the
   * B11A2 v1 cross-provider assembly candidate boundary.
   */
  if (
    firstProvider === secondProvider
  ) {
    return deny(
      "SAME_PROVIDER"
    );
  }

  const firstObservedAt =
    Date.parse(first.observedAt);

  const secondObservedAt =
    Date.parse(second.observedAt);

  if (
    !Number.isFinite(firstObservedAt) ||
    !Number.isFinite(secondObservedAt)
  ) {
    return deny(
      "INVALID_OBSERVED_AT"
    );
  }

  const timeDeltaMs =
    Math.abs(
      firstObservedAt -
      secondObservedAt
    );

  if (
    timeDeltaMs >
    HSPP_ASSEMBLY_MAX_TIME_DELTA_MS
  ) {
    return deny(
      "TIME_WINDOW_EXCEEDED",
      null,
      timeDeltaMs
    );
  }

  if (
    !validCoordinate(
      first.latitude,
      first.longitude
    ) ||
    !validCoordinate(
      second.latitude,
      second.longitude
    )
  ) {
    return deny(
      "INVALID_COORDINATES",
      null,
      timeDeltaMs
    );
  }

  const distanceMeters =
    getDistanceMeters(
      {
        latitude: first.latitude,
        longitude: first.longitude,
      },
      {
        latitude: second.latitude,
        longitude: second.longitude,
      }
    );

  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters >
      HSPP_ASSEMBLY_MAX_DISTANCE_METERS
  ) {
    return deny(
      "DISTANCE_EXCEEDED",
      Number.isFinite(distanceMeters)
        ? distanceMeters
        : null,
      timeDeltaMs
    );
  }

  const firstEventType =
    normalizeToken(first.eventType);

  const secondEventType =
    normalizeToken(second.eventType);

  if (
    !firstEventType ||
    !secondEventType ||
    firstEventType !== secondEventType
  ) {
    return deny(
      "EVENT_TYPE_MISMATCH",
      distanceMeters,
      timeDeltaMs
    );
  }

  return {
    policyVersion:
      HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION,

    eligible: true,

    reason: "ELIGIBLE",

    distanceMeters,
    timeDeltaMs,
  };
}
