import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";

import {
  createHsppReservoirDownstreamSnapshotFromB07B,
  type HsppReservoirDownstreamSnapshot,
} from "@/lib/hspp/createHsppReservoirDownstreamSnapshot";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION =
  "hspp-reconstruction-claim-material-resolver-v1" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppReconstructionSelectionMaterial = {
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

  /**
   * Producer-neutral B06A Reservoir-eligibility semantic provenance.
   *
   * This is derived from the already-selected Reservoir candidates and is
   * available to both B07B and scheduled-pair producers.
   */
  reservoirEligibilityPolicyVersion: string;

  /**
   * Semantic B07A reevaluation provenance.
   *
   * This is available on both B07B and scheduled-pair reevaluation results.
   */
  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;
};


/**
 * Legacy durable reconstruction claim material.
 *
 * discoveryPolicyVersion remains B07B producer provenance and is deliberately
 * not part of the producer-neutral selection material.
 */
export type HsppReconstructionClaimMaterial =
  HsppReconstructionSelectionMaterial & {
    discoveryPolicyVersion: string;
  };


export type ResolveHsppReconstructionSelectionMaterialFromSnapshotInput = {
  snapshot:
    HsppReservoirDownstreamSnapshot;
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
  candidates: readonly HsppReservoirCandidate[],
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
 * Q14ag31S producer-neutral reconstruction selection core.
 *
 * This function consumes only the neutral semantic Reservoir snapshot:
 *
 * - organization identity;
 * - currently eligible Reservoir candidates; and
 * - the already-computed semantic reevaluation result.
 *
 * It preserves existing reconstruction semantics:
 *
 * - assemblyCandidates order is preserved exactly;
 * - original first/second evidence orientation is preserved;
 * - every selected membership decision must remain eligible;
 * - only HISTORICAL_NOT_CURRENT + NEVER_ASSEMBLED pairs qualify;
 * - each selected evidence id must resolve exactly once;
 * - persisted evidence identity and immutable SHA-256 fingerprints are
 *   validated fail-closed; and
 * - membershipPolicyVersion comes only from the selected membership decision.
 *
 * This core deliberately does NOT:
 *
 * - consume RunHsppReservoirReevaluationResult;
 * - read B07B discovery envelope metadata;
 * - carry or invent discoveryPolicyVersion;
 * - rerun B06B, B07A or B07B;
 * - perform database access;
 * - claim or execute reconstruction;
 * - mutate lifecycle, trust, Reservoir or scheduling state; or
 * - grant downstream authority.
 */
export function resolveHsppReconstructionSelectionMaterialFromSnapshot({
  snapshot,
}: ResolveHsppReconstructionSelectionMaterialFromSnapshotInput): HsppReconstructionSelectionMaterial | null {
  if (
    !snapshot ||
    typeof snapshot !==
      "object"
  ) {
    throw new Error(
      "snapshot is required.",
    );
  }

  const organizationId =
    requireNonBlank(
      snapshot?.organizationId,
      "snapshot.organizationId",
    );

  const candidates =
    snapshot?.candidates;

  if (
    !Array.isArray(
      candidates,
    )
  ) {
    throw new Error(
      "Reservoir snapshot candidates must be an array.",
    );
  }

  const reevaluationPolicyVersion =
    requireNonBlank(
      snapshot?.reevaluation
        ?.policyVersion,
      "snapshot.reevaluation.policyVersion",
    );

  const assemblyCandidates =
    snapshot?.reevaluation
      ?.assemblyCandidates;

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
    snapshot?.reevaluation
      ?.state;

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
        candidates,
        firstEvidenceId,
      );

    const secondCandidate =
      requireCandidate(
        candidates,
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

    /*
     * NEUTRAL_RECONSTRUCTION_ELIGIBILITY_PROVENANCE_V1
     *
     * Both selected candidates must still carry an affirmative B06A
     * Reservoir-eligibility decision, and both decisions must come from the
     * same semantic eligibility-policy version.
     *
     * This derives semantic provenance from existing candidate state only.
     * It does not rerun B06A and does not consume discovery or scheduling
     * metadata.
     */
    const historicalReservoirDecision =
      historicalCandidate
        .reservoirDecision;

    const replacementReservoirDecision =
      replacementCandidate
        .reservoirDecision;

    if (
      historicalReservoirDecision
        ?.eligible !== true ||
      replacementReservoirDecision
        ?.eligible !== true
    ) {
      throw new Error(
        "Selected reconstruction evidence must remain Reservoir eligible.",
      );
    }

    const historicalReservoirEligibilityPolicyVersion =
      requireNonBlank(
        historicalReservoirDecision
          ?.policyVersion,
        "historicalCandidate.reservoirDecision.policyVersion",
      );

    const replacementReservoirEligibilityPolicyVersion =
      requireNonBlank(
        replacementReservoirDecision
          ?.policyVersion,
        "replacementCandidate.reservoirDecision.policyVersion",
      );

    if (
      historicalReservoirEligibilityPolicyVersion !==
      replacementReservoirEligibilityPolicyVersion
    ) {
      throw new Error(
        "Selected reconstruction Reservoir candidates must share one eligibility policy version.",
      );
    }

    const reservoirEligibilityPolicyVersion =
      historicalReservoirEligibilityPolicyVersion;

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

      reservoirEligibilityPolicyVersion,

      reevaluationPolicyVersion,

      membershipPolicyVersion,
    };
  }

  return null;
}


/**
 * Q14ag31S legacy B07B -> durable reconstruction claim-material wrapper.
 *
 * Existing recovery behavior remains B07B-compatible here.
 *
 * This wrapper retains producer-specific validation for:
 *
 * - B07B runner organization;
 * - B07B discovery organization;
 * - B07B discoveryPolicyVersion; and
 * - the legacy top-level reevaluationPolicyVersion.
 *
 * After those compatibility/provenance guards pass, semantic pair selection
 * is delegated exactly once to the producer-neutral snapshot core above.
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

  const neutralSnapshot =
    createHsppReservoirDownstreamSnapshotFromB07B(
      result,
    );

  /*
   * Preserve the exact legacy top-level B07B reevaluationPolicyVersion
   * behavior even for malformed runtime objects whose nested policy field
   * might disagree. This is compatibility behavior only; scheduled-pair
   * callers will use their semantic reevaluation.policyVersion directly.
   */
  const compatibilitySnapshot:
    HsppReservoirDownstreamSnapshot =
      {
        ...neutralSnapshot,

        organizationId,

        candidates:
          discoveryCandidates,

        reevaluation: {
          ...neutralSnapshot.reevaluation,

          policyVersion:
            reevaluationPolicyVersion as
              HsppReservoirDownstreamSnapshot[
                "reevaluation"
              ][
                "policyVersion"
              ],
        },
      };

  const selection =
    resolveHsppReconstructionSelectionMaterialFromSnapshot({
      snapshot:
        compatibilitySnapshot,
    });

  if (!selection) {
    return null;
  }

  return {
    ...selection,

    discoveryPolicyVersion,

    /*
     * Retain the exact legacy B07B envelope value.
     */
    reevaluationPolicyVersion,
  };
}
