import type { SupabaseClient } from "@supabase/supabase-js";

import { readAndVerifyHsppEvidenceBatch } from "@/lib/hspp/readAndVerifyHsppEvidence";

import { buildHsppCanonicalClaims } from "@/lib/hspp/buildHsppCanonicalClaims";

import type {
  HsppAssemblyScanInput,
  HsppAssemblyScanMember,
} from "@/lib/hspp/scanHsppEvidenceAssembly";

export const HSPP_SEALED_ASSEMBLY_READER_VERSION =
  "hspp-sealed-assembly-reader-v1" as const;

export type ReadHsppSealedEvidenceAssemblyInput = {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
};

export type HsppSealedAssemblyVerifiedMemberMetadata = {
  membershipId: string;

  evidenceId: string;

  integrityFingerprint: string;

  memberOrdinal: number;

  sourceProvider: string;

  sourceClass: string;

  observedAt: string;

  integrityStatus: "MATCH";

  validationState: string;
};

export type HsppSealedAssemblyMembershipRelation = {
  firstEvidenceId: string;

  secondEvidenceId: string;

  membershipEligible: boolean;

  membershipPolicyVersion: string;

  membershipReason: string;

  distanceMeters: number | null;

  timeDeltaMs: number | null;
};

export type ReadHsppSealedEvidenceAssemblyResult = {
  readerVersion: typeof HSPP_SEALED_ASSEMBLY_READER_VERSION;

  scanInput: HsppAssemblyScanInput;

  verifiedMembers: HsppSealedAssemblyVerifiedMemberMetadata[];

  membershipRelation: HsppSealedAssemblyMembershipRelation | null;
};

type AssemblyRow = {
  id: unknown;
  organization_id: unknown;
  assembly_state: unknown;
};

type AssemblyMemberRow = {
  id: unknown;

  evidence_id: unknown;
  evidence_integrity_fingerprint: unknown;
  member_ordinal: unknown;
};

type AssemblyMembershipRelationRow = {
  first_evidence_id: unknown;
  second_evidence_id: unknown;
  membership_eligible: unknown;
  membership_policy_version: unknown;
  membership_reason: unknown;
  distance_meters: unknown;
  time_delta_ms: unknown;
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `Persisted HSPP assembly ${fieldName} must be a non-empty string.`,
    );
  }

  return value;
}

function requireMemberOrdinal(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(
      "Persisted HSPP assembly member_ordinal must be an integer.",
    );
  }

  return value;
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Persisted HSPP assembly ${fieldName} must be a boolean.`);
  }

  return value;
}

function requireNullableNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Persisted HSPP assembly ${fieldName} must be null or a non-negative finite number.`,
    );
  }

  return value;
}

function readCanonicalEventType(
  normalizedPayload: Record<string, unknown>,
): string | null | undefined {
  const eventType = normalizedPayload.eventType;

  if (
    eventType !== undefined &&
    eventType !== null &&
    typeof eventType !== "string"
  ) {
    throw new Error(
      "Persisted HSPP normalized_payload.eventType must be a string, null, or absent.",
    );
  }

  return eventType;
}

/**
 * B7490-07D persisted SEALED evidence-assembly reader.
 *
 * Responsibility:
 *
 * - read one organization-scoped persisted assembly;
 * - require the persisted assembly to be SEALED;
 * - read its immutable membership in member_ordinal order;
 * - batch-load members through the existing HSPP
 *   read-and-integrity-verification boundary;
 * - require every persisted evidence item to pass cryptographic
 *   integrity verification;
 * - require every loaded evidence fingerprint to match the exact
 *   fingerprint bound into assembly membership;
 * - reconstruct B11B2 canonical claims from immutable persisted
 *   normalized evidence;
 * - return a complete B11C-compatible in-memory scan input.
 *
 * This boundary deliberately does NOT:
 *
 * - create or modify assemblies;
 * - add or remove assembly members;
 * - seal assemblies;
 * - scan an assembly;
 * - evaluate an assembly decision;
 * - persist an assembly decision;
 * - modify HSPP trust or validation state;
 * - apply assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function readHsppSealedEvidenceAssembly(
  input: ReadHsppSealedEvidenceAssemblyInput,
): Promise<ReadHsppSealedEvidenceAssemblyResult> {
  const organizationId = requireNonBlank(
    input.organizationId,
    "organizationId",
  );

  const assemblyId = requireNonBlank(input.assemblyId, "assemblyId");

  const { data: assemblyData, error: assemblyError } = await input.supabase
    .from("hspp_evidence_assemblies")
    .select("id, organization_id, assembly_state")
    .eq("organization_id", organizationId)
    .eq("id", assemblyId)
    .maybeSingle();

  if (assemblyError) {
    throw assemblyError;
  }

  if (!assemblyData) {
    throw new Error(
      "HSPP evidence assembly was not found for this organization.",
    );
  }

  const assembly = assemblyData as unknown as AssemblyRow;

  const persistedAssemblyId = requireString(assembly.id, "id");

  const persistedOrganizationId = requireString(
    assembly.organization_id,
    "organization_id",
  );

  const assemblyState = requireString(
    assembly.assembly_state,
    "assembly_state",
  );

  if (
    persistedAssemblyId !== assemblyId ||
    persistedOrganizationId !== organizationId
  ) {
    throw new Error(
      "Persisted HSPP assembly identity does not match the request.",
    );
  }

  if (assemblyState !== "SEALED") {
    throw new Error(
      "HSPP evidence assembly must be SEALED before persisted scan loading.",
    );
  }

  const { data: memberData, error: memberError } = await input.supabase
    .from("hspp_evidence_assembly_members")
    .select(
      ["id", "evidence_id", "evidence_integrity_fingerprint", "member_ordinal"].join(
        ", ",
      ),
    )
    .eq("organization_id", organizationId)
    .eq("assembly_id", assemblyId)
    .order("member_ordinal", {
      ascending: true,
    });

  if (memberError) {
    throw memberError;
  }

  const persistedMembers = (memberData || []) as unknown as AssemblyMemberRow[];

  /*
   * A persisted SEALED assembly must contain at least one member
   * according to the authoritative lifecycle invariant.
   *
   * B11C remains responsible for deciding whether one member is
   * insufficient for completed multi-evidence scanning.
   */
  if (persistedMembers.length === 0) {
    throw new Error("Persisted SEALED HSPP evidence assembly has no members.");
  }

  const { data: relationData, error: relationError } = await input.supabase
    .from("hspp_evidence_assembly_membership_relations")
    .select(
      [
        "first_evidence_id",
        "second_evidence_id",
        "membership_eligible",
        "membership_policy_version",
        "membership_reason",
        "distance_meters",
        "time_delta_ms",
      ].join(", "),
    )
    .eq("organization_id", organizationId)
    .eq("assembly_id", assemblyId)
    .maybeSingle();

  if (relationError) {
    throw relationError;
  }

  const relation =
    relationData as unknown as AssemblyMembershipRelationRow | null;

  const membershipRelation: HsppSealedAssemblyMembershipRelation | null =
    relation
      ? {
          firstEvidenceId: requireString(
            relation.first_evidence_id,
            "membership relation first_evidence_id",
          ),

          secondEvidenceId: requireString(
            relation.second_evidence_id,
            "membership relation second_evidence_id",
          ),

          membershipEligible: requireBoolean(
            relation.membership_eligible,
            "membership relation membership_eligible",
          ),

          membershipPolicyVersion: requireString(
            relation.membership_policy_version,
            "membership relation membership_policy_version",
          ),

          membershipReason: requireString(
            relation.membership_reason,
            "membership relation membership_reason",
          ),

          distanceMeters: requireNullableNonNegativeNumber(
            relation.distance_meters,
            "membership relation distance_meters",
          ),

          timeDeltaMs: requireNullableNonNegativeNumber(
            relation.time_delta_ms,
            "membership relation time_delta_ms",
          ),
        }
      : null;

  const membership = persistedMembers.map((row) => ({
    membershipId: requireString(row.id, "member id"),

    evidenceId: requireString(row.evidence_id, "member evidence_id"),

    integrityFingerprint: requireString(
      row.evidence_integrity_fingerprint,
      "member evidence_integrity_fingerprint",
    ),

    memberOrdinal: requireMemberOrdinal(row.member_ordinal),
  }));

  if (membershipRelation) {
    const evidenceIds = new Set(membership.map((member) => member.evidenceId));

    if (
      membershipRelation.firstEvidenceId === membershipRelation.secondEvidenceId
    ) {
      throw new Error(
        "Persisted HSPP assembly membership relation must reference two distinct evidence identities.",
      );
    }

    if (
      !evidenceIds.has(membershipRelation.firstEvidenceId) ||
      !evidenceIds.has(membershipRelation.secondEvidenceId)
    ) {
      throw new Error(
        "Persisted HSPP assembly membership relation references evidence outside the assembly.",
      );
    }

    if (membershipRelation.membershipEligible !== true) {
      throw new Error(
        "Persisted HSPP assembly membership relation is not eligible.",
      );
    }

    if (membershipRelation.membershipReason !== "ELIGIBLE") {
      throw new Error(
        "Persisted eligible HSPP assembly membership relation must preserve reason ELIGIBLE.",
      );
    }
  }

  const evidenceResults = await readAndVerifyHsppEvidenceBatch({
    supabase: input.supabase,

    organizationId,

    evidenceIds: membership.map((member) => member.evidenceId),
  });

  const members: HsppAssemblyScanMember[] = [];

  const verifiedMembers: HsppSealedAssemblyVerifiedMemberMetadata[] = [];

  for (const member of membership) {
    const result = evidenceResults.get(member.evidenceId);

    if (!result || !result.found) {
      throw new Error(
        `HSPP assembly member evidence ${member.evidenceId} was not found.`,
      );
    }

    if (result.verification.status !== "MATCH") {
      throw new Error(
        `HSPP assembly member evidence ${member.evidenceId} failed integrity verification.`,
      );
    }

    if (result.evidence.integrityFingerprint !== member.integrityFingerprint) {
      throw new Error(
        `HSPP assembly member evidence ${member.evidenceId} does not match its membership-bound integrity fingerprint.`,
      );
    }

    verifiedMembers.push({
      membershipId: member.membershipId,

      evidenceId: member.evidenceId,

      integrityFingerprint: member.integrityFingerprint,

      memberOrdinal: member.memberOrdinal,

      sourceProvider: result.evidence.sourceProvider,

      sourceClass: result.evidence.sourceClass,

      observedAt: result.evidence.observedAt,

      /*
       * This projection is created only after B07D has required
       * result.verification.status === "MATCH".
       */
      integrityStatus: "MATCH",

      validationState: result.evidence.validationState,
    });

    const eventType = readCanonicalEventType(result.evidence.normalizedPayload);

    members.push({
      evidenceId: member.evidenceId,

      /*
       * Use the immutable fingerprint captured in assembly
       * membership, not a substituted downstream identity.
       */
      integrityFingerprint: member.integrityFingerprint,

      memberOrdinal: member.memberOrdinal,

      canonicalClaims: buildHsppCanonicalClaims({
        eventType,
      }),
    });
  }

  return {
    readerVersion: HSPP_SEALED_ASSEMBLY_READER_VERSION,

    scanInput: {
      assemblyId,
      organizationId,

      assemblyState: "SEALED",

      members,
    },

    verifiedMembers,

    membershipRelation,
  };
}
