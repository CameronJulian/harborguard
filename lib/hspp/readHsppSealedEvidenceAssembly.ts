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
  evidenceId: string;

  integrityFingerprint: string;

  memberOrdinal: number;

  sourceProvider: string;

  sourceClass: string;

  observedAt: string;

  integrityStatus: "MATCH";

  validationState: string;
};

export type ReadHsppSealedEvidenceAssemblyResult = {
  readerVersion: typeof HSPP_SEALED_ASSEMBLY_READER_VERSION;

  scanInput: HsppAssemblyScanInput;

  verifiedMembers: HsppSealedAssemblyVerifiedMemberMetadata[];
};

type AssemblyRow = {
  id: unknown;
  organization_id: unknown;
  assembly_state: unknown;
};

type AssemblyMemberRow = {
  evidence_id: unknown;
  evidence_integrity_fingerprint: unknown;
  member_ordinal: unknown;
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
      ["evidence_id", "evidence_integrity_fingerprint", "member_ordinal"].join(
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

  const membership = persistedMembers.map((row) => ({
    evidenceId: requireString(row.evidence_id, "member evidence_id"),

    integrityFingerprint: requireString(
      row.evidence_integrity_fingerprint,
      "member evidence_integrity_fingerprint",
    ),

    memberOrdinal: requireMemberOrdinal(row.member_ordinal),
  }));

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
  };
}
