import {
  evaluateHsppAssemblyMembership,
  type HsppAssemblyMembershipDecision,
  type HsppAssemblyMembershipEvidence,
} from "./evaluateHsppAssemblyMembership";

import type {
  HsppAssemblyEncounterMemberCandidate,
  HsppAssemblyEncounterSnapshot,
} from "./evaluateHsppAssemblyEncounter";


export const HSPP_ASSEMBLY_ENCOUNTER_MEMBERSHIP_VERSION =
  "hspp-assembly-encounter-membership-v1" as const;


export type HsppAssemblyEncounterMembershipState =
  | "PAIR_MEMBERSHIP_ELIGIBLE"
  | "PAIR_MEMBERSHIP_DENIED";


export type HsppAssemblyEncounterMembershipResult =
  Readonly<{
    policyVersion:
      typeof HSPP_ASSEMBLY_ENCOUNTER_MEMBERSHIP_VERSION;

    organizationId: string;

    sourceAssemblyId: string;

    targetAssemblyId: string;

    candidateEvidenceId: string;

    targetAnchorEvidenceId: string;

    state:
      HsppAssemblyEncounterMembershipState;

    membershipDecision:
      HsppAssemblyMembershipDecision;

    authority: "NONE";
  }>;


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


/**
 * Pure semantic bridge between:
 *
 *   structural assembly encounter discovery
 *
 * and:
 *
 *   the existing B11A2 pair-membership policy.
 *
 * IMPORTANT:
 *
 * This does NOT establish that a candidate may be inserted into,
 * transferred to, or reconstructed into the target assembly.
 *
 * The currently-proven B11A2 reconstruction boundary is pair-oriented.
 * Therefore this primitive answers only:
 *
 *   "Is the offered encounter evidence B11A2-compatible with this
 *    explicitly identified member of the target assembly?"
 *
 * A positive result remains proposal-only.
 *
 * It deliberately performs NO:
 *
 * - database access;
 * - Supabase access;
 * - persistence;
 * - Reservoir mutation;
 * - assembly mutation;
 * - membership mutation;
 * - member removal;
 * - member transfer;
 * - reconstruction;
 * - lineage creation;
 * - sealing;
 * - trust transition;
 * - scheduling mutation;
 * - operational authority transition.
 */
export function evaluateHsppAssemblyEncounterMembership({
  organizationId: rawOrganizationId,
  candidate,
  candidateEvidence,
  targetAssembly,
  targetAnchorEvidence,
}: {
  organizationId: string;

  candidate:
    HsppAssemblyEncounterMemberCandidate;

  candidateEvidence:
    HsppAssemblyMembershipEvidence;

  targetAssembly:
    HsppAssemblyEncounterSnapshot;

  targetAnchorEvidence:
    HsppAssemblyMembershipEvidence;
}): HsppAssemblyEncounterMembershipResult {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  if (
    !candidate ||
    typeof candidate !==
      "object"
  ) {
    throw new Error(
      "candidate is required.",
    );
  }

  if (
    !candidateEvidence ||
    typeof candidateEvidence !==
      "object"
  ) {
    throw new Error(
      "candidateEvidence is required.",
    );
  }

  if (
    !targetAssembly ||
    typeof targetAssembly !==
      "object"
  ) {
    throw new Error(
      "targetAssembly is required.",
    );
  }

  if (
    !targetAnchorEvidence ||
    typeof targetAnchorEvidence !==
      "object"
  ) {
    throw new Error(
      "targetAnchorEvidence is required.",
    );
  }


  const sourceAssemblyId =
    requireNonBlank(
      candidate.sourceAssemblyId,
      "candidate.sourceAssemblyId",
    );

  const targetAssemblyId =
    requireNonBlank(
      candidate.targetAssemblyId,
      "candidate.targetAssemblyId",
    );

  if (
    sourceAssemblyId ===
    targetAssemblyId
  ) {
    throw new Error(
      "Encounter membership bridge requires distinct source and target assemblies.",
    );
  }


  const snapshotOrganizationId =
    requireNonBlank(
      targetAssembly.organizationId,
      "targetAssembly.organizationId",
    );

  const snapshotAssemblyId =
    requireNonBlank(
      targetAssembly.assemblyId,
      "targetAssembly.assemblyId",
    );

  if (
    snapshotOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "Target assembly belongs to a different organization.",
    );
  }

  if (
    snapshotAssemblyId !==
    targetAssemblyId
  ) {
    throw new Error(
      "Encounter candidate target assembly does not match the supplied target assembly.",
    );
  }


  const candidateEvidenceId =
    requireNonBlank(
      candidate.evidenceId,
      "candidate.evidenceId",
    );

  const hydratedCandidateEvidenceId =
    requireNonBlank(
      candidateEvidence.evidenceId,
      "candidateEvidence.evidenceId",
    );

  if (
    candidateEvidenceId !==
    hydratedCandidateEvidenceId
  ) {
    throw new Error(
      "Hydrated encounter candidate evidence identity does not match the structural encounter candidate.",
    );
  }


  if (
    candidate.integrityFingerprint !==
    candidateEvidence.integrityFingerprint
  ) {
    throw new Error(
      "Hydrated encounter candidate fingerprint does not match the structural encounter candidate.",
    );
  }


  if (
    requireNonBlank(
      candidate.sourceClass,
      "candidate.sourceClass",
    ) !==
    requireNonBlank(
      candidateEvidence.sourceClass,
      "candidateEvidence.sourceClass",
    )
  ) {
    throw new Error(
      "Hydrated encounter candidate source class does not match the structural encounter candidate.",
    );
  }


  const candidateProvider =
    requireNonBlank(
      candidate.sourceProvider,
      "candidate.sourceProvider",
    );

  const hydratedCandidateProvider =
    candidateEvidence.sourceProvider
      ? candidateEvidence.sourceProvider.trim()
      : "";

  if (
    candidateProvider !==
    hydratedCandidateProvider
  ) {
    throw new Error(
      "Hydrated encounter candidate source provider does not match the structural encounter candidate.",
    );
  }


  if (
    requireNonBlank(
      candidate.observedAt,
      "candidate.observedAt",
    ) !==
    requireNonBlank(
      candidateEvidence.observedAt,
      "candidateEvidence.observedAt",
    )
  ) {
    throw new Error(
      "Hydrated encounter candidate observedAt does not match the structural encounter candidate.",
    );
  }


  if (
    requireNonBlank(
      candidateEvidence.organizationId,
      "candidateEvidence.organizationId",
    ) !==
    organizationId
  ) {
    throw new Error(
      "Encounter candidate evidence belongs to a different organization.",
    );
  }


  const targetAnchorEvidenceId =
    requireNonBlank(
      targetAnchorEvidence.evidenceId,
      "targetAnchorEvidence.evidenceId",
    );

  if (
    requireNonBlank(
      targetAnchorEvidence.organizationId,
      "targetAnchorEvidence.organizationId",
    ) !==
    organizationId
  ) {
    throw new Error(
      "Target anchor evidence belongs to a different organization.",
    );
  }


  const targetMember =
    targetAssembly.members.find(
      (member) =>
        member.evidenceId ===
        targetAnchorEvidenceId,
    );

  if (!targetMember) {
    throw new Error(
      "Target anchor evidence is not a member of the supplied target assembly.",
    );
  }


  if (
    targetMember.integrityStatus !==
    "MATCH"
  ) {
    throw new Error(
      "Target anchor member does not preserve verified MATCH integrity.",
    );
  }


  if (
    targetMember.integrityFingerprint !==
    targetAnchorEvidence.integrityFingerprint
  ) {
    throw new Error(
      "Target anchor evidence fingerprint does not match immutable target membership.",
    );
  }


  if (
    candidateEvidenceId ===
    targetAnchorEvidenceId
  ) {
    throw new Error(
      "Encounter candidate and target anchor evidence must be distinct.",
    );
  }


  const membershipDecision =
    evaluateHsppAssemblyMembership(
      targetAnchorEvidence,
      candidateEvidence,
    );


  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_MEMBERSHIP_VERSION,

    organizationId,

    sourceAssemblyId,

    targetAssemblyId,

    candidateEvidenceId,

    targetAnchorEvidenceId,

    state:
      membershipDecision.eligible &&
      membershipDecision.reason ===
        "ELIGIBLE"
        ? "PAIR_MEMBERSHIP_ELIGIBLE"
        : "PAIR_MEMBERSHIP_DENIED",

    membershipDecision,

    authority:
      "NONE",
  };
}