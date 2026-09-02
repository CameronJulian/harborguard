import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
} from "./evaluateHsppReservoirEligibility";

import {
  readHsppReconstructionIntentReplacementCandidateCore,
  type ReadHsppReconstructionIntentReplacementCandidateCoreResult,
} from "./readHsppReconstructionIntentReplacementCandidate";

import {
  HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,
} from "./readHsppReservoirPairPage";


export const HSPP_SCHEDULED_PAIR_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION =
  "hspp-scheduled-pair-reconstruction-intent-replacement-candidate-reader-v1" as const;


export type ReadHsppScheduledPairReconstructionIntentReplacementCandidateInput = {
  supabase: SupabaseClient;

  organizationId: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: null;

  pairSchedulingVersion: string;

  reservoirEligibilityPolicyVersion: string;
};


export type ReadHsppScheduledPairReconstructionIntentReplacementCandidateResult = {
  readerVersion:
    typeof HSPP_SCHEDULED_PAIR_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION;

  selectionSource:
    "SCHEDULED_PAIR";

  discoveryPolicyVersion:
    null;

  pairSchedulingVersion:
    typeof HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION;

  reservoirEligibilityPolicyVersion:
    typeof HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION;

  organizationId: string;

  replacementEvidenceId: string;

  candidate:
    ReadHsppReconstructionIntentReplacementCandidateCoreResult["candidate"];
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
      `${fieldName} must be a non-blank string.`,
    );
  }

  return value.trim();
}


/**
 * Q14ag33E2B scheduled-PAIR durable replacement hydration boundary.
 *
 * This validates only producer-specific durable provenance:
 *
 * - discovery provenance must remain absent;
 * - PAIR scheduling provenance must equal the current PAIR authority;
 * - B06A provenance must equal the current Reservoir eligibility authority.
 *
 * Exact evidence hydration, lifecycle validation and B06A revalidation
 * remain delegated to the Q14ag33E2A producer-neutral async core.
 *
 * This boundary performs no pair discovery, pair reevaluation, reconstruction,
 * sealing, assessment, scheduling, claim, mutation or authority transition.
 */
export async function readHsppScheduledPairReconstructionIntentReplacementCandidate({
  supabase,
  organizationId,
  replacementEvidenceId,
  replacementEvidenceIntegrityFingerprint,
  discoveryPolicyVersion,
  pairSchedulingVersion:
    rawPairSchedulingVersion,
  reservoirEligibilityPolicyVersion:
    rawReservoirEligibilityPolicyVersion,
}: ReadHsppScheduledPairReconstructionIntentReplacementCandidateInput): Promise<ReadHsppScheduledPairReconstructionIntentReplacementCandidateResult> {
  if (discoveryPolicyVersion !== null) {
    throw new Error(
      "SCHEDULED_PAIR reconstruction intent must not expose fabricated discovery provenance.",
    );
  }

  const pairSchedulingVersion =
    requireNonBlank(
      rawPairSchedulingVersion,
      "pairSchedulingVersion",
    );

  if (
    pairSchedulingVersion !==
      HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION
  ) {
    throw new Error(
      "Scheduled-pair reconstruction intent scheduling provenance does not match the current PAIR scheduling authority.",
    );
  }

  const reservoirEligibilityPolicyVersion =
    requireNonBlank(
      rawReservoirEligibilityPolicyVersion,
      "reservoirEligibilityPolicyVersion",
    );

  if (
    reservoirEligibilityPolicyVersion !==
      HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION
  ) {
    throw new Error(
      "Scheduled-pair reconstruction intent Reservoir eligibility provenance does not match the current B06A authority.",
    );
  }

  const coreRead =
    await readHsppReconstructionIntentReplacementCandidateCore({
      supabase,

      organizationId,

      replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint,

      reservoirEligibilityPolicyVersion,
    });

  return {
    readerVersion:
      HSPP_SCHEDULED_PAIR_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,

    selectionSource:
      "SCHEDULED_PAIR",

    discoveryPolicyVersion:
      null,

    pairSchedulingVersion:
      HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

    reservoirEligibilityPolicyVersion:
      HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,

    organizationId:
      coreRead.organizationId,

    replacementEvidenceId:
      coreRead.replacementEvidenceId,

    candidate:
      coreRead.candidate,
  };
}