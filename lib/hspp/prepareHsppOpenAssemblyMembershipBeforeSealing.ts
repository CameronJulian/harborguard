import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  evaluateHsppAssemblyMembership,
  type HsppAssemblyMembershipDecision,
  type HsppAssemblyMembershipEvidence,
} from "@/lib/hspp/evaluateHsppAssemblyMembership";

import {
  readAndVerifyHsppEvidenceBatch,
} from "@/lib/hspp/readAndVerifyHsppEvidence";


type HsppOpenAssemblyRow = {
  id: string;
  organization_id: string;
  assembly_state: string;
  sealed_at: string | null;
  membership_policy_version: string;
};


type HsppOpenAssemblyMemberRow = {
  evidence_id: string;
  evidence_integrity_fingerprint: string;
  member_ordinal: number;
};


type PersistedOpenAssemblyMembershipRelationRow = {
  organization_id: string;
  assembly_id: string;

  first_evidence_id: string;
  second_evidence_id: string;

  membership_eligible: boolean;
  membership_policy_version: string;
  membership_reason: string;

  distance_meters: number | null;
  time_delta_ms: number | null;

  idempotent_recovery: boolean;
};


export type PrepareHsppOpenAssemblyMembershipBeforeSealingInput = {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
};


export type PreparedHsppOpenAssemblyMembershipBeforeSealing = {
  organizationId: string;
  assemblyId: string;

  firstEvidenceId: string;
  secondEvidenceId: string;

  decision:
    HsppAssemblyMembershipDecision;

  persistedRelation: {
    organizationId: string;
    assemblyId: string;

    firstEvidenceId: string;
    secondEvidenceId: string;

    membershipEligible: boolean;
    membershipPolicyVersion: string;
    membershipReason: string;

    distanceMeters: number | null;
    timeDeltaMs: number | null;

    idempotentRecovery: boolean;
  };
};


function requireNonBlank(
  value: string,
  name: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${name} is required.`,
    );
  }

  return normalized;
}


function readPayloadNumber(
  payload: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value =
      payload[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const parsed =
        Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}


function readPayloadString(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value =
      payload[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}


function toMembershipEvidence({
  organizationId,
  evidenceId,
  integrityFingerprint,
  evidence,
}: {
  organizationId: string;
  evidenceId: string;
  integrityFingerprint: string;

  evidence: {
    sourceClass: string;
    sourceProvider: string | null;
    observedAt: string;
    normalizedPayload: Record<string, unknown>;
  };
}): HsppAssemblyMembershipEvidence {
  const latitude =
    readPayloadNumber(
      evidence.normalizedPayload,
      [
        "latitude",
        "lat",
      ],
    );

  const longitude =
    readPayloadNumber(
      evidence.normalizedPayload,
      [
        "longitude",
        "lng",
        "lon",
      ],
    );

  const eventType =
    readPayloadString(
      evidence.normalizedPayload,
      [
        "eventType",
        "event_type",
      ],
    );

  if (latitude === null) {
    throw new Error(
      `HSPP OPEN assembly member ${evidenceId} has no usable latitude for B11A2.`,
    );
  }

  if (longitude === null) {
    throw new Error(
      `HSPP OPEN assembly member ${evidenceId} has no usable longitude for B11A2.`,
    );
  }

  if (!eventType) {
    throw new Error(
      `HSPP OPEN assembly member ${evidenceId} has no usable event type for B11A2.`,
    );
  }

  return {
    organizationId,
    evidenceId,
    integrityFingerprint,

    sourceClass:
      evidence.sourceClass,

    sourceProvider:
      evidence.sourceProvider,

    observedAt:
      evidence.observedAt,

    latitude,
    longitude,
    eventType,
  };
}


/**
 * B7490-Q14AG35AS26B
 *
 * Establishes child-specific B11A2 provenance for an already-existing
 * OPEN two-member evidence assembly before Q13c sealing.
 *
 * This boundary deliberately does NOT:
 *
 * - reconstruct an assembly;
 * - select replacement evidence;
 * - change assembly membership;
 * - seal an assembly;
 * - scan or assess a SEALED assembly;
 * - promote trust;
 * - grant Route Safety / Crowd Intelligence / ML authority.
 *
 * It:
 *
 * 1. reads the exact existing OPEN assembly;
 * 2. reads its exact immutable two-member membership;
 * 3. integrity-verifies both persisted evidence records;
 * 4. verifies membership-bound fingerprints;
 * 5. evaluates the existing deterministic B11A2 policy;
 * 6. fails closed unless the new child pair is ELIGIBLE;
 * 7. persists that already-computed relation through the
 *    service-role-only PostgreSQL authority introduced by AS26A.
 */
export async function prepareHsppOpenAssemblyMembershipBeforeSealing({
  supabase,
  organizationId,
  assemblyId,
}: PrepareHsppOpenAssemblyMembershipBeforeSealingInput): Promise<PreparedHsppOpenAssemblyMembershipBeforeSealing> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireNonBlank(
      assemblyId,
      "assemblyId",
    );


  const {
    data: assemblyData,
    error: assemblyError,
  } =
    await supabase
      .from("hspp_evidence_assemblies")
      .select(
        [
          "id",
          "organization_id",
          "assembly_state",
          "sealed_at",
          "membership_policy_version",
        ].join(","),
      )
      .eq(
        "organization_id",
        normalizedOrganizationId,
      )
      .eq(
        "id",
        normalizedAssemblyId,
      )
      .maybeSingle();

  if (assemblyError) {
    throw assemblyError;
  }

  if (!assemblyData) {
    throw new Error(
      "Referenced HSPP OPEN evidence assembly does not exist.",
    );
  }

  const assembly =
    assemblyData as unknown as
      HsppOpenAssemblyRow;

  if (
    assembly.organization_id !==
      normalizedOrganizationId ||
    assembly.id !==
      normalizedAssemblyId
  ) {
    throw new Error(
      "HSPP OPEN assembly identity mismatch.",
    );
  }

  if (
    assembly.assembly_state !==
      "OPEN"
  ) {
    throw new Error(
      "B11A2 pre-seal membership preparation requires an OPEN assembly.",
    );
  }

  if (
    assembly.sealed_at !==
      null
  ) {
    throw new Error(
      "OPEN HSPP assembly unexpectedly already contains sealed_at.",
    );
  }

  const membershipPolicyVersion =
    requireNonBlank(
      assembly.membership_policy_version,
      "assembly.membership_policy_version",
    );


  const {
    data: memberData,
    error: memberError,
  } =
    await supabase
      .from(
        "hspp_evidence_assembly_members",
      )
      .select(
        [
          "evidence_id",
          "evidence_integrity_fingerprint",
          "member_ordinal",
        ].join(","),
      )
      .eq(
        "organization_id",
        normalizedOrganizationId,
      )
      .eq(
        "assembly_id",
        normalizedAssemblyId,
      )
      .order(
        "member_ordinal",
        {
          ascending: true,
        },
      );

  if (memberError) {
    throw memberError;
  }

  const members =
    (
      memberData || []
    ) as unknown as
      HsppOpenAssemblyMemberRow[];

  if (members.length !== 2) {
    throw new Error(
      "B11A2 pre-seal membership preparation currently requires exactly two immutable assembly members.",
    );
  }

  const [
    firstMember,
    secondMember,
  ] =
    members;

  if (
    firstMember.evidence_id ===
      secondMember.evidence_id
  ) {
    throw new Error(
      "B11A2 pre-seal membership preparation requires two distinct evidence identities.",
    );
  }


  const evidenceResults =
    await readAndVerifyHsppEvidenceBatch({
      supabase,

      organizationId:
        normalizedOrganizationId,

      evidenceIds: [
        firstMember.evidence_id,
        secondMember.evidence_id,
      ],
    });


  const firstResult =
    evidenceResults.get(
      firstMember.evidence_id,
    );

  const secondResult =
    evidenceResults.get(
      secondMember.evidence_id,
    );


  if (
    !firstResult ||
    !firstResult.found
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${firstMember.evidence_id} was not found.`,
    );
  }

  if (
    !secondResult ||
    !secondResult.found
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${secondMember.evidence_id} was not found.`,
    );
  }


  if (
    firstResult.verification.status !==
      "MATCH"
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${firstMember.evidence_id} failed integrity verification.`,
    );
  }

  if (
    secondResult.verification.status !==
      "MATCH"
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${secondMember.evidence_id} failed integrity verification.`,
    );
  }


  if (
    firstResult.evidence
      .integrityFingerprint !==
    firstMember
      .evidence_integrity_fingerprint
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${firstMember.evidence_id} does not match its membership-bound integrity fingerprint.`,
    );
  }

  if (
    secondResult.evidence
      .integrityFingerprint !==
    secondMember
      .evidence_integrity_fingerprint
  ) {
    throw new Error(
      `HSPP OPEN assembly member evidence ${secondMember.evidence_id} does not match its membership-bound integrity fingerprint.`,
    );
  }


  const firstEvidence =
    toMembershipEvidence({
      organizationId:
        normalizedOrganizationId,

      evidenceId:
        firstMember.evidence_id,

      integrityFingerprint:
        firstMember
          .evidence_integrity_fingerprint,

      evidence:
        firstResult.evidence,
    });


  const secondEvidence =
    toMembershipEvidence({
      organizationId:
        normalizedOrganizationId,

      evidenceId:
        secondMember.evidence_id,

      integrityFingerprint:
        secondMember
          .evidence_integrity_fingerprint,

      evidence:
        secondResult.evidence,
    });


  const decision =
    evaluateHsppAssemblyMembership(
      firstEvidence,
      secondEvidence,
    );


  if (
    decision.policyVersion !==
      membershipPolicyVersion
  ) {
    throw new Error(
      "B11A2 decision policy version does not match the OPEN assembly membership policy.",
    );
  }


  if (
    !decision.eligible ||
    decision.reason !== "ELIGIBLE"
  ) {
    throw new Error(
      `Reconstructed OPEN assembly child pair is not B11A2 eligible: ${decision.reason}.`,
    );
  }


  const membershipRelation = {
    firstEvidenceId:
      firstMember.evidence_id,

    secondEvidenceId:
      secondMember.evidence_id,

    membershipEligible:
      true,

    membershipPolicyVersion:
      decision.policyVersion,

    membershipReason:
      decision.reason,

    distanceMeters:
      decision.distanceMeters,

    timeDeltaMs:
      decision.timeDeltaMs,
  };


  const {
    data: persistenceData,
    error: persistenceError,
  } =
    await supabase.rpc(
      "persist_hspp_open_assembly_membership_relation",
      {
        p_organization_id:
          normalizedOrganizationId,

        p_assembly_id:
          normalizedAssemblyId,

        p_membership_relation:
          membershipRelation,
      },
    );


  if (persistenceError) {
    throw persistenceError;
  }


  const rows =
    (
      persistenceData || []
    ) as unknown as
      PersistedOpenAssemblyMembershipRelationRow[];

  if (rows.length !== 1) {
    throw new Error(
      "OPEN child B11A2 persistence authority must return exactly one relation.",
    );
  }


  const persisted =
    rows[0];


  if (
    persisted.organization_id !==
      normalizedOrganizationId ||
    persisted.assembly_id !==
      normalizedAssemblyId
  ) {
    throw new Error(
      "Persisted OPEN child B11A2 relation returned an unexpected assembly identity.",
    );
  }


  if (
    persisted.first_evidence_id !==
      firstMember.evidence_id ||
    persisted.second_evidence_id !==
      secondMember.evidence_id
  ) {
    throw new Error(
      "Persisted OPEN child B11A2 relation returned an unexpected evidence pair.",
    );
  }


  if (
    persisted.membership_eligible !==
      true ||
    persisted.membership_reason !==
      "ELIGIBLE"
  ) {
    throw new Error(
      "Persisted OPEN child B11A2 relation is not eligible.",
    );
  }


  if (
    persisted.membership_policy_version !==
      decision.policyVersion
  ) {
    throw new Error(
      "Persisted OPEN child B11A2 relation returned an unexpected policy version.",
    );
  }


  return {
    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    firstEvidenceId:
      firstMember.evidence_id,

    secondEvidenceId:
      secondMember.evidence_id,

    decision,

    persistedRelation: {
      organizationId:
        persisted.organization_id,

      assemblyId:
        persisted.assembly_id,

      firstEvidenceId:
        persisted.first_evidence_id,

      secondEvidenceId:
        persisted.second_evidence_id,

      membershipEligible:
        persisted.membership_eligible,

      membershipPolicyVersion:
        persisted.membership_policy_version,

      membershipReason:
        persisted.membership_reason,

      distanceMeters:
        persisted.distance_meters,

      timeDeltaMs:
        persisted.time_delta_ms,

      idempotentRecovery:
        persisted.idempotent_recovery,
    },
  };
}