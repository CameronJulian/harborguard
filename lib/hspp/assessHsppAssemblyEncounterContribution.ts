import type {
  HsppAssessmentDecision,
} from "./hsppAssessmentDecision";

import type {
  HsppIntegrityVerificationResult,
} from "./verifyHsppEvidenceIntegrity";

import type {
  HsppOperationalUseDecision,
} from "./decideHsppOperationalUse";

import {
  HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE,
  HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION,
  type HsppAssemblyEncounterContributionPreparation,
} from "./prepareHsppAssemblyEncounterContribution";


export const HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_ASSESSMENT_VERSION =
  "hspp-assembly-encounter-contribution-assessment-v1" as const;


export type HsppAssemblyEncounterContributionAssessment =
  HsppAssessmentDecision & {
    policyVersion:
      typeof HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_ASSESSMENT_VERSION;

    trustState:
      | "UNASSESSED"
      | "PLAUSIBLE";

    crowdEligible:
      false;

    trainingEligible:
      false;

    validationEligible:
      false;

    reason:
      | "integrity_not_verified"
      | "validation_not_validated"
      | "contribution_not_prepared"
      | "contribution_authority_invalid"
      | "lineage_missing"
      | "lineage_parent_mismatch"
      | "lineage_fingerprint_mismatch"
      | "lineage_type_mismatch"
      | "lineage_version_mismatch"
      | "parent_operational_use_denied"
      | "encounter_contribution_plausibility_passed";
  };


function deny(
  reason:
    HsppAssemblyEncounterContributionAssessment["reason"],
): HsppAssemblyEncounterContributionAssessment {
  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_ASSESSMENT_VERSION,

    trustState:
      "UNASSESSED",

    operationalEligible:
      false,

    crowdEligible:
      false,

    trainingEligible:
      false,

    validationEligible:
      false,

    reason,
  };
}


/**
 * Pure assessment policy for encounter-derived evidence.
 *
 * This policy does NOT:
 *
 * - persist evidence;
 * - mutate trust in the database;
 * - create assembly membership;
 * - reconstruct an assembly;
 * - grant operational authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training eligibility;
 * - grant ML validation eligibility;
 * - inherit CORROBORATED or VERIFIED trust from the parent.
 *
 * PLAUSIBLE is the maximum trust produced here.
 *
 * The policy requires:
 *
 * - valid integrity for the derived evidence;
 * - VALIDATED derived evidence state;
 * - one already-prepared encounter contribution;
 * - authority NONE at the contribution boundary;
 * - exact encounter derivation lineage;
 * - exact parent evidence identity and fingerprint;
 * - an already-allowed operational-use decision for the parent.
 */
export function assessHsppAssemblyEncounterContribution({
  verification,

  validationState,

  contribution,

  derivedLineage,

  parentEvidenceId,

  parentIntegrityFingerprint,

  parentOperationalUseDecision,
}: {
  verification:
    HsppIntegrityVerificationResult;

  validationState:
    string;

  contribution:
    HsppAssemblyEncounterContributionPreparation;

  derivedLineage:
    {
      parentEvidenceId: string;
      parentIntegrityFingerprint: string;
      derivationType: string;
      derivationVersion: string;
    } | null;

  parentEvidenceId:
    string;

  parentIntegrityFingerprint:
    string;

  parentOperationalUseDecision:
    HsppOperationalUseDecision;
}): HsppAssemblyEncounterContributionAssessment {
  if (
    verification.status !==
    "MATCH"
  ) {
    return deny(
      "integrity_not_verified",
    );
  }


  if (
    validationState !==
    "VALIDATED"
  ) {
    return deny(
      "validation_not_validated",
    );
  }


  if (
    !contribution ||
    contribution.state !==
      "ENCOUNTER_CONTRIBUTION_PREPARED"
  ) {
    return deny(
      "contribution_not_prepared",
    );
  }


  if (
    contribution.authority !==
    "NONE"
  ) {
    return deny(
      "contribution_authority_invalid",
    );
  }


  if (!derivedLineage) {
    return deny(
      "lineage_missing",
    );
  }


  if (
    derivedLineage.parentEvidenceId !==
      parentEvidenceId ||
    contribution.parentEvidenceId !==
      parentEvidenceId
  ) {
    return deny(
      "lineage_parent_mismatch",
    );
  }


  if (
    derivedLineage
      .parentIntegrityFingerprint !==
      parentIntegrityFingerprint ||
    contribution
      .parentIntegrityFingerprint !==
      parentIntegrityFingerprint
  ) {
    return deny(
      "lineage_fingerprint_mismatch",
    );
  }


  if (
    derivedLineage.derivationType !==
      HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE
  ) {
    return deny(
      "lineage_type_mismatch",
    );
  }


  if (
    derivedLineage.derivationVersion !==
      HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION
  ) {
    return deny(
      "lineage_version_mismatch",
    );
  }


  if (
    !parentOperationalUseDecision ||
    parentOperationalUseDecision.allowed !==
      true ||
    parentOperationalUseDecision.reason !==
      "operational_use_allowed"
  ) {
    return deny(
      "parent_operational_use_denied",
    );
  }


  return {
    policyVersion:
      HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_ASSESSMENT_VERSION,

    trustState:
      "PLAUSIBLE",

    operationalEligible:
      true,

    crowdEligible:
      false,

    trainingEligible:
      false,

    validationEligible:
      false,

    reason:
      "encounter_contribution_plausibility_passed",
  };
}