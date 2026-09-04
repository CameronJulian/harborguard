import {
  buildHsppEvidence,
} from "./buildHsppEvidence";

import {
  persistHsppEvidence,
} from "./persistHsppEvidence";

import {
  verifyHsppEvidenceIntegrity,
} from "./verifyHsppEvidenceIntegrity";

import {
  assessHsppAssemblyEncounterContribution,
} from "./assessHsppAssemblyEncounterContribution";

import {
  applyHsppAssessmentDecision,
} from "./applyHsppAssessmentDecision";

import {
  readHsppEvidenceForOperationalUse,
} from "./readHsppEvidenceForOperationalUse";

import {
  readHsppReservoirEligibleEvidenceByIds,
} from "./readHsppReservoirEligibleEvidenceByIds";

import type {
  HsppAssemblyEncounterContributionPreparation,
} from "./prepareHsppAssemblyEncounterContribution";


export const HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION =
  "hspp-assembly-encounter-contribution-lifecycle-v1" as const;


export type HsppAssemblyEncounterContributionLifecycleResult =
  Readonly<{
    policyVersion:
      typeof HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION;

    organizationId: string;

    sourceAssemblyId: string;

    targetAssemblyId: string;

    parentEvidenceId: string;

    targetAnchorEvidenceId: string;

    derivedEvidenceId: string;

    derivedIntegrityFingerprint: string;

    created: boolean;

    assessmentTrustState:
      string;

    state:
      | "ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE"
      | "ENCOUNTER_CONTRIBUTION_NOT_RESERVOIR_ELIGIBLE";

    membershipClassification:
      | "NEVER_ASSEMBLED"
      | "HISTORICAL_NOT_CURRENT"
      | "CURRENT_EFFECTIVE"
      | null;

    authority:
      "NONE";
  }>;


type DuplicateRecoveryRow = {
  id: unknown;

  integrity_fingerprint: unknown;

  source_class: unknown;

  source_provider: unknown;

  source_stream: unknown;

  source_message_id: unknown;

  payload_schema_version: unknown;
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


async function recoverExistingEncounterContribution({
  supabase,
  organizationId,
  evidence,
}: {
  supabase: any;

  organizationId: string;

  evidence:
    ReturnType<
      typeof buildHsppEvidence
    >;
}): Promise<{
  id: string;
  integrityFingerprint: string;
}> {
  /*
   * Recovery deliberately uses the immutable HSPP source identity
   * rather than guessing which UNIQUE invariant produced 23505.
   *
   * Every selected identity field must match the evidence that this
   * lifecycle attempted to persist.
   */
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "hspp_evidence",
      )
      .select(
        [
          "id",
          "integrity_fingerprint",
          "source_class",
          "source_provider",
          "source_stream",
          "source_message_id",
          "payload_schema_version",
        ].join(","),
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "source_class",
        evidence.sourceClass,
      )
      .eq(
        "source_provider",
        evidence.sourceProvider,
      )
      .eq(
        "source_stream",
        evidence.sourceStream,
      )
      .eq(
        "source_message_id",
        evidence.sourceMessageId,
      )
      .eq(
        "payload_schema_version",
        evidence.payloadSchemaVersion,
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  if (!data) {
    throw new Error(
      "Encounter contribution duplicate was reported but the exact source-identity evidence row could not be recovered.",
    );
  }


  const row =
    data as DuplicateRecoveryRow;


  const id =
    requireNonBlank(
      row.id,
      "duplicate.id",
    );

  const fingerprint =
    requireNonBlank(
      row.integrity_fingerprint,
      "duplicate.integrity_fingerprint",
    );


  const exactIdentity =
    row.source_class ===
      evidence.sourceClass &&
    row.source_provider ===
      evidence.sourceProvider &&
    row.source_stream ===
      evidence.sourceStream &&
    row.source_message_id ===
      evidence.sourceMessageId &&
    row.payload_schema_version ===
      evidence.payloadSchemaVersion;


  if (!exactIdentity) {
    throw new Error(
      "Recovered encounter contribution does not match the attempted immutable source identity.",
    );
  }


  if (
    fingerprint !==
    evidence.integrityFingerprint
  ) {
    throw new Error(
      "Recovered encounter contribution source identity exists with a different immutable integrity fingerprint.",
    );
  }


  return {
    id,

    integrityFingerprint:
      fingerprint,
  };
}


/**
 * Recoverable composition runner for one already-prepared
 * assembly encounter contribution.
 *
 * Authority remains in the existing HSPP boundaries:
 *
 * - buildHsppEvidence owns canonical construction;
 * - verifyHsppEvidenceIntegrity owns integrity verification;
 * - persistHsppEvidence owns evidence insertion;
 * - assessHsppAssemblyEncounterContribution owns encounter-derived
 *   assessment policy;
 * - applyHsppAssessmentDecision owns assessment persistence;
 * - readHsppReservoirEligibleEvidenceByIds owns current operational,
 *   membership and B06A Reservoir eligibility.
 *
 * PostgreSQL 23505 is not treated as automatic success.
 * The existing source identity must be recovered and its fingerprint
 * must match exactly.
 *
 * This runner does NOT:
 *
 * - create assembly membership;
 * - create RETAINED membership;
 * - reconstruct an assembly;
 * - mutate another evidence item;
 * - grant CORROBORATED or VERIFIED trust;
 * - grant Crowd/ML authority;
 * - create a separate Reservoir row;
 * - grant operational authority to an assembly.
 */
export async function runHsppAssemblyEncounterContributionLifecycle({
  supabase,

  organizationId:
    rawOrganizationId,

  contribution,

  assessedAt,
}: {
  supabase: any;

  organizationId:
    string;

  contribution:
    HsppAssemblyEncounterContributionPreparation;

  assessedAt?:
    string;
}): Promise<
  HsppAssemblyEncounterContributionLifecycleResult
> {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );


  if (
    !contribution ||
    contribution.state !==
      "ENCOUNTER_CONTRIBUTION_PREPARED"
  ) {
    throw new Error(
      "Encounter contribution lifecycle requires ENCOUNTER_CONTRIBUTION_PREPARED.",
    );
  }


  if (
    contribution.authority !==
    "NONE"
  ) {
    throw new Error(
      "Encounter contribution lifecycle requires contribution authority NONE.",
    );
  }


  if (
    contribution.organizationId !==
    organizationId
  ) {
    throw new Error(
      "Encounter contribution organization does not match lifecycle organization.",
    );
  }


  /*
   * Re-read the parent through the existing operational-use boundary.
   *
   * This prevents the contribution lifecycle from accepting a caller-
   * fabricated claim that the parent is operational.
   */
  const parentOperational =
    await readHsppEvidenceForOperationalUse({
      supabase,

      organizationId,

      evidenceId:
        contribution.parentEvidenceId,
    });


  /*
   * C-prime is always built through the existing canonical evidence
   * builder. Encounter logic does not construct fingerprints itself.
   */
  const built =
    buildHsppEvidence(
      contribution.evidenceBuildInput,
    );


  const verification =
    verifyHsppEvidenceIntegrity(
      built,
    );


  if (
    verification.status !==
    "MATCH"
  ) {
    throw new Error(
      `Built encounter contribution failed HSPP integrity verification: ${verification.status}.`,
    );
  }


  let persisted:
    {
      id: string;
      integrityFingerprint: string;
    };

  let created =
    false;


  try {
    persisted =
      await persistHsppEvidence({
        supabase,

        organizationId,

        evidence:
          built,
      });

    created =
      true;
  }
  catch (error: any) {
    if (
      error?.code !==
      "23505"
    ) {
      throw error;
    }


    /*
     * A retry collision is recoverable only after exact immutable
     * source-identity AND fingerprint verification.
     */
    persisted =
      await recoverExistingEncounterContribution({
        supabase,

        organizationId,

        evidence:
          built,
      });

    created =
      false;
  }


  if (
    persisted.integrityFingerprint !==
    built.integrityFingerprint
  ) {
    throw new Error(
      "Persisted encounter contribution fingerprint does not match the canonical built evidence.",
    );
  }


  const assessment =
    assessHsppAssemblyEncounterContribution({
      verification,

      validationState:
        built.validationState,

      contribution,

      derivedLineage:
        built.derivationLineage,

      parentEvidenceId:
        contribution.parentEvidenceId,

      parentIntegrityFingerprint:
        contribution.parentIntegrityFingerprint,

      parentOperationalUseDecision:
        parentOperational.decision,
    });


  /*
   * Persist the decision whether positive or denied.
   *
   * This preserves the existing HSPP separation between:
   *
   *   assessment policy
   *
   * and
   *
   *   assessment persistence authority.
   */
  await applyHsppAssessmentDecision({
    supabase,

    organizationId,

    evidenceId:
      persisted.id,

    integrityFingerprint:
      persisted.integrityFingerprint,

    assessment,

    ...(assessedAt
      ? {
          assessedAt,
        }
      : {}),
  });


  /*
   * No separate Reservoir insertion exists.
   *
   * Re-enter the authoritative shared current-state reader.
   */
  const reservoirCandidates =
    await readHsppReservoirEligibleEvidenceByIds({
      supabase,

      organizationId,

      evidenceIds: [
        persisted.id,
      ],
    });


  const candidate =
    reservoirCandidates.find(
      (item) =>
        item.evidenceId ===
        persisted.id,
    );


  if (!candidate) {
    return {
      policyVersion:
        HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION,

      organizationId,

      sourceAssemblyId:
        contribution.sourceAssemblyId,

      targetAssemblyId:
        contribution.targetAssemblyId,

      parentEvidenceId:
        contribution.parentEvidenceId,

      targetAnchorEvidenceId:
        contribution.targetAnchorEvidenceId,

      derivedEvidenceId:
        persisted.id,

      derivedIntegrityFingerprint:
        persisted.integrityFingerprint,

      created,

      assessmentTrustState:
        assessment.trustState,

      state:
        "ENCOUNTER_CONTRIBUTION_NOT_RESERVOIR_ELIGIBLE",

      membershipClassification:
        null,

      authority:
        "NONE",
    };
  }


  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION,

    organizationId,

    sourceAssemblyId:
      contribution.sourceAssemblyId,

    targetAssemblyId:
      contribution.targetAssemblyId,

    parentEvidenceId:
      contribution.parentEvidenceId,

    targetAnchorEvidenceId:
      contribution.targetAnchorEvidenceId,

    derivedEvidenceId:
      persisted.id,

    derivedIntegrityFingerprint:
      persisted.integrityFingerprint,

    created,

    assessmentTrustState:
      assessment.trustState,

    state:
      "ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE",

    membershipClassification:
      candidate.membershipClassification,

    authority:
      "NONE",
  };
}