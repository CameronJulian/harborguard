import type {
  HsppSealedAssemblyVerifiedMemberMetadata,
} from "./readHsppSealedEvidenceAssembly";


export const HSPP_ASSEMBLY_ENCOUNTER_EVALUATION_VERSION =
  "hspp-assembly-encounter-evaluation-v1" as const;


export type HsppAssemblyEncounterSnapshot =
  Readonly<{
    organizationId: string;

    assemblyId: string;

    members:
      readonly HsppSealedAssemblyVerifiedMemberMetadata[];
  }>;


export type HsppAssemblyEncounterMemberCandidate =
  Readonly<{
    sourceAssemblyId: string;

    targetAssemblyId: string;

    evidenceId: string;

    integrityFingerprint: string;

    memberOrdinal: number;

    sourceProvider: string;

    sourceClass: string;

    observedAt: string;

    validationState: string;
  }>;


export type HsppAssemblyEncounterResult =
  Readonly<{
    policyVersion:
      typeof HSPP_ASSEMBLY_ENCOUNTER_EVALUATION_VERSION;

    organizationId: string;

    firstAssemblyId: string;

    secondAssemblyId: string;

    state:
      | "NO_MATCH"
      | "ENCOUNTER_CANDIDATE";

    /**
     * Evidence identities that exist in one encountered assembly but
     * are absent from the other assembly.
     *
     * This is only a proposal surface. No candidate becomes a member,
     * replacement, reconstruction input or authority-bearing object
     * through this result.
     */
    candidates:
      readonly HsppAssemblyEncounterMemberCandidate[];

    candidateCount: number;

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


function requireNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer.`,
    );
  }

  return value;
}


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


function normalizeMembers(
  assembly:
    HsppAssemblyEncounterSnapshot,
  fieldName: string,
): HsppSealedAssemblyVerifiedMemberMetadata[] {
  if (
    !Array.isArray(
      assembly.members,
    ) ||
    assembly.members.length ===
      0
  ) {
    throw new Error(
      `${fieldName}.members must contain at least one verified member.`,
    );
  }

  const evidenceIds =
    new Set<string>();

  return assembly.members.map(
    (
      member,
      index,
    ) => {
      if (
        !member ||
        typeof member !==
          "object"
      ) {
        throw new Error(
          `${fieldName}.members[${index}] must be an object.`,
        );
      }

      const evidenceId =
        requireNonBlank(
          member.evidenceId,
          `${fieldName}.members[${index}].evidenceId`,
        );

      if (
        evidenceIds.has(
          evidenceId,
        )
      ) {
        throw new Error(
          `${fieldName} contains duplicate evidence ${evidenceId}.`,
        );
      }

      evidenceIds.add(
        evidenceId,
      );

      const integrityFingerprint =
        requireNonBlank(
          member.integrityFingerprint,
          `${fieldName}.members[${index}].integrityFingerprint`,
        );

      if (
        !SHA256_PATTERN.test(
          integrityFingerprint,
        )
      ) {
        throw new Error(
          `${fieldName}.members[${index}].integrityFingerprint must be a lowercase SHA-256 fingerprint.`,
        );
      }

      if (
        member.integrityStatus !==
        "MATCH"
      ) {
        throw new Error(
          `${fieldName}.members[${index}] must preserve verified integrity MATCH.`,
        );
      }

      requireNonNegativeInteger(
        member.memberOrdinal,
        `${fieldName}.members[${index}].memberOrdinal`,
      );

      requireNonBlank(
        member.sourceProvider,
        `${fieldName}.members[${index}].sourceProvider`,
      );

      requireNonBlank(
        member.sourceClass,
        `${fieldName}.members[${index}].sourceClass`,
      );

      requireNonBlank(
        member.observedAt,
        `${fieldName}.members[${index}].observedAt`,
      );

      requireNonBlank(
        member.validationState,
        `${fieldName}.members[${index}].validationState`,
      );

      return member;
    },
  );
}


/**
 * Pure assembly-encounter proposal primitive.
 *
 * This is the first implementation boundary for the HSPP
 * independently-evolving-assembly encounter model.
 *
 * It deliberately performs only deterministic structural discovery:
 *
 * - both assemblies must belong to the same organization;
 * - an assembly may not encounter itself;
 * - all supplied members must already preserve verified MATCH integrity;
 * - evidence already present in both assemblies is not proposed;
 * - evidence unique to one encountered assembly may be exposed as a
 *   directional candidate for the other assembly;
 * - candidate ordering is deterministic.
 *
 * "ENCOUNTER_CANDIDATE" does NOT mean that evidence is compatible,
 * membership eligible, authorized, transferable or reconstructable.
 *
 * A later HSPP boundary must perform the established semantic,
 * membership, trust, Reservoir, reconstruction and authority checks.
 *
 * This function deliberately performs NO:
 *
 * - database access;
 * - Supabase access;
 * - persistence;
 * - assembly mutation;
 * - Reservoir mutation;
 * - membership mutation;
 * - reconstruction;
 * - lineage creation;
 * - sealing;
 * - lifecycle transition;
 * - trust transition;
 * - scheduling mutation;
 * - downstream authority transition.
 */
export function evaluateHsppAssemblyEncounter({
  firstAssembly,
  secondAssembly,
}: {
  firstAssembly:
    HsppAssemblyEncounterSnapshot;

  secondAssembly:
    HsppAssemblyEncounterSnapshot;
}): HsppAssemblyEncounterResult {
  if (
    !firstAssembly ||
    typeof firstAssembly !==
      "object"
  ) {
    throw new Error(
      "firstAssembly is required.",
    );
  }

  if (
    !secondAssembly ||
    typeof secondAssembly !==
      "object"
  ) {
    throw new Error(
      "secondAssembly is required.",
    );
  }

  const firstOrganizationId =
    requireNonBlank(
      firstAssembly.organizationId,
      "firstAssembly.organizationId",
    );

  const secondOrganizationId =
    requireNonBlank(
      secondAssembly.organizationId,
      "secondAssembly.organizationId",
    );

  if (
    firstOrganizationId !==
    secondOrganizationId
  ) {
    throw new Error(
      "Encountered HSPP assemblies must belong to the same organization.",
    );
  }

  const firstAssemblyId =
    requireNonBlank(
      firstAssembly.assemblyId,
      "firstAssembly.assemblyId",
    );

  const secondAssemblyId =
    requireNonBlank(
      secondAssembly.assemblyId,
      "secondAssembly.assemblyId",
    );

  if (
    firstAssemblyId ===
    secondAssemblyId
  ) {
    throw new Error(
      "An HSPP assembly cannot encounter itself.",
    );
  }

  const firstMembers =
    normalizeMembers(
      firstAssembly,
      "firstAssembly",
    );

  const secondMembers =
    normalizeMembers(
      secondAssembly,
      "secondAssembly",
    );

  const firstEvidenceIds =
    new Set(
      firstMembers.map(
        (member) =>
          member.evidenceId,
      ),
    );

  const secondEvidenceIds =
    new Set(
      secondMembers.map(
        (member) =>
          member.evidenceId,
      ),
    );

  const candidates:
    HsppAssemblyEncounterMemberCandidate[] =
      [];


  /*
   * First -> second directional opportunities.
   */
  for (
    const member of
    firstMembers
  ) {
    if (
      secondEvidenceIds.has(
        member.evidenceId,
      )
    ) {
      continue;
    }

    candidates.push({
      sourceAssemblyId:
        firstAssemblyId,

      targetAssemblyId:
        secondAssemblyId,

      evidenceId:
        member.evidenceId,

      integrityFingerprint:
        member.integrityFingerprint,

      memberOrdinal:
        member.memberOrdinal,

      sourceProvider:
        member.sourceProvider,

      sourceClass:
        member.sourceClass,

      observedAt:
        member.observedAt,

      validationState:
        member.validationState,
    });
  }


  /*
   * Second -> first directional opportunities.
   */
  for (
    const member of
    secondMembers
  ) {
    if (
      firstEvidenceIds.has(
        member.evidenceId,
      )
    ) {
      continue;
    }

    candidates.push({
      sourceAssemblyId:
        secondAssemblyId,

      targetAssemblyId:
        firstAssemblyId,

      evidenceId:
        member.evidenceId,

      integrityFingerprint:
        member.integrityFingerprint,

      memberOrdinal:
        member.memberOrdinal,

      sourceProvider:
        member.sourceProvider,

      sourceClass:
        member.sourceClass,

      observedAt:
        member.observedAt,

      validationState:
        member.validationState,
    });
  }


  /*
   * Deterministic encounter order.
   *
   * Scheduler/pit-stop order is deliberately not introduced here.
   * A future encounter scheduler may choose which assembly pair is
   * evaluated; this primitive only makes one supplied encounter
   * deterministic.
   */
  candidates.sort(
    (
      left,
      right,
    ) => {
      const sourceCompare =
        left.sourceAssemblyId.localeCompare(
          right.sourceAssemblyId,
        );

      if (
        sourceCompare !==
        0
      ) {
        return sourceCompare;
      }

      const targetCompare =
        left.targetAssemblyId.localeCompare(
          right.targetAssemblyId,
        );

      if (
        targetCompare !==
        0
      ) {
        return targetCompare;
      }

      const ordinalCompare =
        left.memberOrdinal -
        right.memberOrdinal;

      if (
        ordinalCompare !==
        0
      ) {
        return ordinalCompare;
      }

      return left.evidenceId.localeCompare(
        right.evidenceId,
      );
    },
  );


  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_EVALUATION_VERSION,

    organizationId:
      firstOrganizationId,

    firstAssemblyId,

    secondAssemblyId,

    state:
      candidates.length >
      0
        ? "ENCOUNTER_CANDIDATE"
        : "NO_MATCH",

    candidates,

    candidateCount:
      candidates.length,

    authority:
      "NONE",
  };
}