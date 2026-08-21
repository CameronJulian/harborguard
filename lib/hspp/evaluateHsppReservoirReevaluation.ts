import {
  evaluateHsppAssemblyMembership,
  type HsppAssemblyMembershipDecision,
  type HsppAssemblyMembershipEvidence,
} from "@/lib/hspp/evaluateHsppAssemblyMembership";

import type { HsppReservoirCandidate } from "@/lib/hspp/readHsppReservoirCandidates";

export const HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION =
  "hspp-reservoir-reevaluation-v1" as const;

export const HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS = 100;

export type HsppReservoirReevaluationState =
  "NO_COUNTERPART" | "MEMBERSHIP_DENIED" | "ASSEMBLY_CANDIDATE";

export type HsppReservoirPairEvaluation = {
  firstEvidenceId: string;
  secondEvidenceId: string;

  membershipDecision: HsppAssemblyMembershipDecision;
};

export type HsppReservoirReevaluationResult = {
  policyVersion: typeof HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION;

  state: HsppReservoirReevaluationState;

  candidateCount: number;

  comparisonCount: number;

  comparisonLimit: typeof HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS;

  evaluations: HsppReservoirPairEvaluation[];

  assemblyCandidates: HsppReservoirPairEvaluation[];
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  return normalized;
}

function readPayloadString(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readPayloadNumber(
  payload: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = payload[key];

    if (value !== null && value !== undefined && value !== "") {
      const normalized = Number(value);

      if (Number.isFinite(normalized)) {
        return normalized;
      }
    }
  }

  return null;
}

function toMembershipEvidence(
  candidate: HsppReservoirCandidate,
): HsppAssemblyMembershipEvidence {
  if (!candidate.reservoirDecision.eligible) {
    throw new Error(
      `Evidence ${candidate.evidenceId} is not Reservoir eligible.`,
    );
  }

  if (candidate.hasAssemblyMembership) {
    throw new Error(`Evidence ${candidate.evidenceId} is already assembled.`);
  }

  const evidence = candidate.operationalRead.evidence;

  if (!evidence) {
    throw new Error(
      `Reservoir candidate ${candidate.evidenceId} has no persisted evidence.`,
    );
  }

  const payload = evidence.normalizedPayload;

  const latitude = readPayloadNumber(payload, ["latitude", "lat"]);

  const longitude = readPayloadNumber(payload, ["longitude", "lng", "lon"]);

  const eventType = readPayloadString(payload, [
    "eventType",
    "event_type",
    "type",
  ]);

  if (latitude === null) {
    throw new Error(
      `Reservoir candidate ${candidate.evidenceId} has no usable latitude.`,
    );
  }

  if (longitude === null) {
    throw new Error(
      `Reservoir candidate ${candidate.evidenceId} has no usable longitude.`,
    );
  }

  if (!eventType) {
    throw new Error(
      `Reservoir candidate ${candidate.evidenceId} has no usable event type.`,
    );
  }

  return {
    organizationId: requireNonBlank(evidence.organizationId, "organizationId"),

    evidenceId: requireNonBlank(evidence.id, "evidenceId"),

    integrityFingerprint: requireNonBlank(
      evidence.integrityFingerprint,
      "integrityFingerprint",
    ),

    sourceClass: requireNonBlank(evidence.sourceClass, "sourceClass"),

    sourceProvider: evidence.sourceProvider
      ? evidence.sourceProvider.trim()
      : null,

    observedAt: requireNonBlank(evidence.observedAt, "observedAt"),

    latitude: requireFiniteNumber(latitude, "latitude"),

    longitude: requireFiniteNumber(longitude, "longitude"),

    eventType,
  };
}

/**
 * B7490-07A deterministic Reservoir reevaluation primitive.
 *
 * This function represents the first HSPP "Lifeguard" boundary.
 *
 * It answers:
 *
 *   "Do any currently Reservoir-eligible evidence records now
 *    form an assembly-membership candidate pair?"
 *
 * It deliberately:
 *
 * - consumes already discovered B06B Reservoir candidates;
 * - uses immutable persisted HSPP evidence;
 * - constructs deterministic unique evidence pairs;
 * - bounds pairwise work;
 * - reuses the existing B11A2 assembly-membership policy.
 *
 * It does NOT:
 *
 * - create or modify an evidence assembly;
 * - write to the database;
 * - alter evidence trust;
 * - apply an HSPP assessment;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - schedule itself;
 * - create a cron job;
 * - retry background work.
 */
export function evaluateHsppReservoirReevaluation(
  candidates: HsppReservoirCandidate[],
): HsppReservoirReevaluationResult {
  const orderedCandidates = [...(candidates || [])].sort((first, second) =>
    first.evidenceId.localeCompare(second.evidenceId),
  );

  if (orderedCandidates.length < 2) {
    return {
      policyVersion: HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,

      state: "NO_COUNTERPART",

      candidateCount: orderedCandidates.length,

      comparisonCount: 0,

      comparisonLimit: HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,

      evaluations: [],

      assemblyCandidates: [],
    };
  }

  const normalized = orderedCandidates.map(toMembershipEvidence);

  const evaluations: HsppReservoirPairEvaluation[] = [];

  for (let firstIndex = 0; firstIndex < normalized.length; firstIndex++) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < normalized.length;
      secondIndex++
    ) {
      if (
        evaluations.length >= HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS
      ) {
        break;
      }

      const first = normalized[firstIndex];

      const second = normalized[secondIndex];

      evaluations.push({
        firstEvidenceId: first.evidenceId,

        secondEvidenceId: second.evidenceId,

        membershipDecision: evaluateHsppAssemblyMembership(first, second),
      });
    }

    if (
      evaluations.length >= HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS
    ) {
      break;
    }
  }

  const assemblyCandidates = evaluations.filter(
    (evaluation) => evaluation.membershipDecision.eligible,
  );

  return {
    policyVersion: HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,

    state:
      assemblyCandidates.length > 0
        ? "ASSEMBLY_CANDIDATE"
        : "MEMBERSHIP_DENIED",

    candidateCount: orderedCandidates.length,

    comparisonCount: evaluations.length,

    comparisonLimit: HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,

    evaluations,

    assemblyCandidates,
  };
}
