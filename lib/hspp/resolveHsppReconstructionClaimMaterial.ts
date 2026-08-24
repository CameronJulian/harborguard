import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION =
  "hspp-reconstruction-claim-material-resolver-v1" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppReconstructionClaimMaterial = {
  resolverVersion:
    typeof HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION;

  organizationId: string;

  /**
   * Exact original B07A pair orientation.
   */
  selectedEvidenceIds: [
    string,
    string,
  ];

  selectedFirstEvidenceId: string;

  selectedSecondEvidenceId: string;

  historicalCandidate:
    HsppReservoirCandidate;

  replacementCandidate:
    HsppReservoirCandidate;

  historicalEvidenceId: string;

  historicalEvidenceIntegrityFingerprint: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;

  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;
};


export type ResolveHsppReconstructionClaimMaterialInput = {
  organizationId: string;

  /**
   * One already-computed B07B snapshot.
   *
   * This resolver never reruns Reservoir discovery or reevaluation.
   */
  reevaluationResult:
    RunHsppReservoirReevaluationResult;
};


function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}


function requireCandidate(
  candidates: HsppReservoirCandidate[],
  evidenceId: string,
): HsppReservoirCandidate {
  const matches =
    candidates.filter(
      (candidate) =>
        candidate?.evidenceId ===
        evidenceId,
    );

  if (
    matches.length !==
    1
  ) {
    throw new Error(
      `Selected B07B evidence ${evidenceId} must resolve to exactly one discovery candidate.`,
    );
  }

  return matches[0];
}


function requireImmutableFingerprint(
  candidate: HsppReservoirCandidate,
  role: "historicalCandidate" | "replacementCandidate",
): string {
  const evidence =
    candidate?.operationalRead?.evidence;

  if (!evidence) {
    throw new Error(
      `Selected B07B ${role} ${candidate.evidenceId} has no persisted evidence.`,
    );
  }

  if (
    evidence.id !==
    candidate.evidenceId
  ) {
    throw new Error(
      `Selected B07B ${role} evidence identity does not match discovery identity ${candidate.evidenceId}.`,
    );
  }

  const integrityFingerprint =
    typeof evidence.integrityFingerprint ===
      "string"
      ? evidence.integrityFingerprint.trim()
      : "";

  if (
    !SHA256_PATTERN.test(
      integrityFingerprint,
    )
  ) {
    throw new Error(
      `Selected B07B ${role} ${candidate.evidenceId} must preserve a lowercase SHA-256 immutable integrity fingerprint.`,
    );
  }

  return integrityFingerprint;
}


/**
 * Q14ag31S pure B07B -> durable reconstruction claim-material resolver.
 *
 * This function extracts the exact deterministic reconstruction pair already
 * selected by the Q14ag26 lifecycle rules and exposes the immutable material
 * required by the durable Q14ag31A/Q14ag31B claim boundary.
 *
 * It deliberately:
 *
 * - consumes one already-computed B07B snapshot;
 * - preserves existing B07A assemblyCandidates order;
 * - preserves exact first/second pair orientation;
 * - resolves each selected id to exactly one B06B discovery candidate;
 * - accepts only HISTORICAL_NOT_CURRENT + NEVER_ASSEMBLED reconstruction pairs;
 * - derives membershipPolicyVersion only from the selected membership decision;
 * - preserves the B07B discovery/reevaluation policy snapshot;
 * - validates immutable persisted evidence id/fingerprint identity.
 *
 * It deliberately does NOT:
 *
 * - read from Supabase;
 * - call an RPC;
 * - rerun B06B, B07A or B07B;
 * - generate a UUID;
 * - claim a durable execution intent;
 * - read historical reconstruction context;
 * - persist or recover H2;
 * - seal or assess an assembly;
 * - mutate evidence trust or Reservoir state;
 * - grant downstream authority;
 * - create API, cron, queue or scheduler behavior.
 */
export function resolveHsppReconstructionClaimMaterial({
  organizationId: rawOrganizationId,
  reevaluationResult: result,
}: ResolveHsppReconstructionClaimMaterialInput): HsppReconstructionClaimMaterial | null {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  if (
    !result ||
    typeof result !==
      "object"
  ) {
    throw new Error(
      "reevaluationResult is required.",
    );
  }

  const resultOrganizationId =
    requireNonBlank(
      result?.organizationId,
      "reevaluationResult.organizationId",
    );

  if (
    resultOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "B07B runner organization does not match the reconstruction organization.",
    );
  }

  const discoveryOrganizationId =
    requireNonBlank(
      result?.discovery?.organizationId,
      "reevaluationResult.discovery.organizationId",
    );

  if (
    discoveryOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "B07B discovery organization does not match the reconstruction organization.",
    );
  }

  const discoveryPolicyVersion =
    requireNonBlank(
      result?.discoveryPolicyVersion,
      "reevaluationResult.discoveryPolicyVersion",
    );

  const reevaluationPolicyVersion =
    requireNonBlank(
      result?.reevaluationPolicyVersion,
      "reevaluationResult.reevaluationPolicyVersion",
    );

  const discoveryCandidates =
    result?.discovery?.candidates;

  if (
    !Array.isArray(
      discoveryCandidates,
    )
  ) {
    throw new Error(
      "B07B discovery candidates must be an array.",
    );
  }

  const assemblyCandidates =
    result?.reevaluation?.assemblyCandidates;

  if (
    !Array.isArray(
      assemblyCandidates,
    )
  ) {
    throw new Error(
      "B07A assemblyCandidates must be an array.",
    );
  }

  const reevaluationState =
    result?.reevaluation?.state;

  if (
    reevaluationState !==
    "ASSEMBLY_CANDIDATE"
  ) {
    if (
      assemblyCandidates.length !==
      0
    ) {
      throw new Error(
        "B07A non-candidate state cannot expose assembly candidates.",
      );
    }

    return null;
  }

  if (
    assemblyCandidates.length ===
    0
  ) {
    throw new Error(
      "B07A ASSEMBLY_CANDIDATE state must expose at least one assembly candidate.",
    );
  }

  for (
    const selected of
      assemblyCandidates
  ) {
    const firstEvidenceId =
      requireNonBlank(
        selected?.firstEvidenceId,
        "selected.firstEvidenceId",
      );

    const secondEvidenceId =
      requireNonBlank(
        selected?.secondEvidenceId,
        "selected.secondEvidenceId",
      );

    if (
      firstEvidenceId ===
      secondEvidenceId
    ) {
      throw new Error(
        "A selected B07A pair must contain two distinct evidence identities.",
      );
    }

    if (
      !selected?.membershipDecision ||
      selected.membershipDecision.eligible !==
        true
    ) {
      throw new Error(
        "Every B07A assemblyCandidate must preserve an eligible membership decision.",
      );
    }

    const firstCandidate =
      requireCandidate(
        discoveryCandidates,
        firstEvidenceId,
      );

    const secondCandidate =
      requireCandidate(
        discoveryCandidates,
        secondEvidenceId,
      );

    const firstClassification =
      firstCandidate.membershipClassification;

    const secondClassification =
      secondCandidate.membershipClassification;

    let historicalCandidate:
      HsppReservoirCandidate | null =
        null;

    let replacementCandidate:
      HsppReservoirCandidate | null =
        null;

    if (
      firstClassification ===
        "HISTORICAL_NOT_CURRENT" &&
      secondClassification ===
        "NEVER_ASSEMBLED"
    ) {
      historicalCandidate =
        firstCandidate;

      replacementCandidate =
        secondCandidate;
    }
    else if (
      firstClassification ===
        "NEVER_ASSEMBLED" &&
      secondClassification ===
        "HISTORICAL_NOT_CURRENT"
    ) {
      historicalCandidate =
        secondCandidate;

      replacementCandidate =
        firstCandidate;
    }

    if (
      !historicalCandidate ||
      !replacementCandidate
    ) {
      continue;
    }

    const membershipPolicyVersion =
      requireNonBlank(
        selected.membershipDecision.policyVersion,
        "selected.membershipDecision.policyVersion",
      );

    const historicalEvidenceIntegrityFingerprint =
      requireImmutableFingerprint(
        historicalCandidate,
        "historicalCandidate",
      );

    const replacementEvidenceIntegrityFingerprint =
      requireImmutableFingerprint(
        replacementCandidate,
        "replacementCandidate",
      );

    return {
      resolverVersion:
        HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION,

      organizationId,

      selectedEvidenceIds: [
        firstEvidenceId,
        secondEvidenceId,
      ],

      selectedFirstEvidenceId:
        firstEvidenceId,

      selectedSecondEvidenceId:
        secondEvidenceId,

      historicalCandidate,

      replacementCandidate,

      historicalEvidenceId:
        historicalCandidate.evidenceId,

      historicalEvidenceIntegrityFingerprint,

      replacementEvidenceId:
        replacementCandidate.evidenceId,

      replacementEvidenceIntegrityFingerprint,

      discoveryPolicyVersion,

      reevaluationPolicyVersion,

      membershipPolicyVersion,
    };
  }

  return null;
}
