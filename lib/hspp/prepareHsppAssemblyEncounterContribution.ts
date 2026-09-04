import type {
  BuildHsppEvidenceInput,
} from "./buildHsppEvidence";

import type {
  HsppAssemblyEncounterMembershipResult,
} from "./evaluateHsppAssemblyEncounterMembership";


export const HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_VERSION =
  "hspp-assembly-encounter-contribution-v1" as const;


export const HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE =
  "HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION" as const;


export const HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION =
  "v1" as const;


export type HsppAssemblyEncounterContributionPreparation =
  Readonly<{
    policyVersion:
      typeof HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_VERSION;

    organizationId: string;

    sourceAssemblyId: string;

    targetAssemblyId: string;

    parentEvidenceId: string;

    parentIntegrityFingerprint: string;

    targetAnchorEvidenceId: string;

    evidenceBuildInput:
      BuildHsppEvidenceInput;

    state:
      "ENCOUNTER_CONTRIBUTION_PREPARED";

    authority:
      "NONE";
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


function requireSha256(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 hexadecimal fingerprint.`,
    );
  }

  return normalized;
}


/**
 * Pure encounter-to-derivation preparation boundary.
 *
 * This primitive converts one already-proven positive assembly encounter
 * membership relation into a BuildHsppEvidenceInput carrying existing
 * HSPP derivation lineage.
 *
 * It deliberately does NOT:
 *
 * - persist evidence;
 * - create a database row;
 * - mutate either assembly;
 * - create ORIGINAL membership;
 * - create RETAINED membership;
 * - move evidence between assemblies;
 * - copy ownership;
 * - perform reconstruction;
 * - insert into the Reservoir;
 * - grant trust;
 * - grant ML training eligibility;
 * - grant operational authority.
 *
 * IMPORTANT:
 *
 * The caller supplies normalizedPayload explicitly.
 *
 * HSPP currently has no general rule saying that encounter-derived
 * evidence automatically copies the complete parent payload.
 * Payload transformation semantics therefore remain outside this
 * primitive rather than being invented implicitly here.
 */
export function prepareHsppAssemblyEncounterContribution({
  organizationId: rawOrganizationId,

  encounterMembership,

  parentEvidence,

  derivedSourceStream,

  derivedSourceMessageId,

  derivedObservedAt,

  derivedPayloadSchemaVersion,

  derivedNormalizedPayload,
}: {
  organizationId: string;

  encounterMembership:
    HsppAssemblyEncounterMembershipResult;

  parentEvidence: {
    evidenceId: string;
    integrityFingerprint: string;
    sourceClass: string;
    sourceProvider: string;
  };

  derivedSourceStream: string;

  derivedSourceMessageId: string;

  derivedObservedAt: string;

  derivedPayloadSchemaVersion: string;

  derivedNormalizedPayload:
    Record<string, unknown>;
}): HsppAssemblyEncounterContributionPreparation {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  if (
    !encounterMembership ||
    typeof encounterMembership !==
      "object"
  ) {
    throw new Error(
      "encounterMembership is required.",
    );
  }

  if (
    encounterMembership.state !==
    "PAIR_MEMBERSHIP_ELIGIBLE"
  ) {
    throw new Error(
      "Encounter contribution requires PAIR_MEMBERSHIP_ELIGIBLE.",
    );
  }

  if (
    encounterMembership.authority !==
    "NONE"
  ) {
    throw new Error(
      "Encounter membership result must remain authority NONE.",
    );
  }

  if (
    encounterMembership.organizationId !==
    organizationId
  ) {
    throw new Error(
      "Encounter membership organization does not match requested organization.",
    );
  }

  if (
    !parentEvidence ||
    typeof parentEvidence !==
      "object"
  ) {
    throw new Error(
      "parentEvidence is required.",
    );
  }


  const parentEvidenceId =
    requireNonBlank(
      parentEvidence.evidenceId,
      "parentEvidence.evidenceId",
    );

  if (
    parentEvidenceId !==
    encounterMembership.candidateEvidenceId
  ) {
    throw new Error(
      "Parent evidence identity does not match encounter candidate evidence identity.",
    );
  }


  const parentIntegrityFingerprint =
    requireSha256(
      parentEvidence.integrityFingerprint,
      "parentEvidence.integrityFingerprint",
    );


  const sourceClass =
    requireNonBlank(
      parentEvidence.sourceClass,
      "parentEvidence.sourceClass",
    );

  const sourceProvider =
    requireNonBlank(
      parentEvidence.sourceProvider,
      "parentEvidence.sourceProvider",
    );


  const sourceAssemblyId =
    requireNonBlank(
      encounterMembership.sourceAssemblyId,
      "encounterMembership.sourceAssemblyId",
    );

  const targetAssemblyId =
    requireNonBlank(
      encounterMembership.targetAssemblyId,
      "encounterMembership.targetAssemblyId",
    );

  if (
    sourceAssemblyId ===
    targetAssemblyId
  ) {
    throw new Error(
      "Encounter contribution requires distinct source and target assemblies.",
    );
  }


  const targetAnchorEvidenceId =
    requireNonBlank(
      encounterMembership.targetAnchorEvidenceId,
      "encounterMembership.targetAnchorEvidenceId",
    );


  if (
    !derivedNormalizedPayload ||
    typeof derivedNormalizedPayload !==
      "object" ||
    Array.isArray(
      derivedNormalizedPayload,
    )
  ) {
    throw new Error(
      "derivedNormalizedPayload must be an object.",
    );
  }


  const evidenceBuildInput:
    BuildHsppEvidenceInput =
  {
    sourceClass,

    sourceProvider,

    sourceStream:
      requireNonBlank(
        derivedSourceStream,
        "derivedSourceStream",
      ),

    sourceMessageId:
      requireNonBlank(
        derivedSourceMessageId,
        "derivedSourceMessageId",
      ),

    observedAt:
      requireNonBlank(
        derivedObservedAt,
        "derivedObservedAt",
      ),

    payloadSchemaVersion:
      requireNonBlank(
        derivedPayloadSchemaVersion,
        "derivedPayloadSchemaVersion",
      ),

    normalizedPayload:
      derivedNormalizedPayload,

    derivationLineage: {
      parentEvidenceId,

      parentIntegrityFingerprint,

      derivationType:
        HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE,

      derivationVersion:
        HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION,
    },
  };


  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_VERSION,

    organizationId,

    sourceAssemblyId,

    targetAssemblyId,

    parentEvidenceId,

    parentIntegrityFingerprint,

    targetAnchorEvidenceId,

    evidenceBuildInput,

    state:
      "ENCOUNTER_CONTRIBUTION_PREPARED",

    authority:
      "NONE",
  };
}