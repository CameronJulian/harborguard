import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHsppAssemblyEncounterContribution,
} from "../lib/hspp/assessHsppAssemblyEncounterContribution";

import {
  prepareHsppAssemblyEncounterContribution,
} from "../lib/hspp/prepareHsppAssemblyEncounterContribution";

import type {
  HsppAssemblyEncounterMembershipResult,
} from "../lib/hspp/evaluateHsppAssemblyEncounterMembership";


const organizationId =
  "11111111-1111-4111-8111-111111111111";

const parentEvidenceId =
  "00000000-0000-4000-8000-000000000002";

const parentFingerprint =
  "b".repeat(64);


function encounter():
  HsppAssemblyEncounterMembershipResult {
  return {
    policyVersion:
      "hspp-assembly-encounter-membership-v1",

    organizationId,

    sourceAssemblyId:
      "assembly-source",

    targetAssemblyId:
      "assembly-target",

    candidateEvidenceId:
      parentEvidenceId,

    targetAnchorEvidenceId:
      "00000000-0000-4000-8000-000000000001",

    state:
      "PAIR_MEMBERSHIP_ELIGIBLE",

    membershipDecision: {
      policyVersion:
        "hspp-assembly-membership-v1",

      eligible:
        true,

      reason:
        "ELIGIBLE",

      distanceMeters:
        0,

      timeDeltaMs:
        0,
    },

    authority:
      "NONE",
  };
}


function contribution() {
  return prepareHsppAssemblyEncounterContribution({
    organizationId,

    encounterMembership:
      encounter(),

    parentEvidence: {
      evidenceId:
        parentEvidenceId,

      integrityFingerprint:
        parentFingerprint,

      sourceClass:
        "external_intelligence",

      sourceProvider:
        "tomtom",
    },

    derivedSourceStream:
      "hspp-assembly-encounter",

    derivedSourceMessageId:
      "assembly-source:assembly-target:candidate-2",

    derivedObservedAt:
      "2026-09-03T18:00:00.000Z",

    derivedPayloadSchemaVersion:
      "hspp-assembly-encounter-contribution-v1",

    derivedNormalizedPayload: {
      eventType:
        "road-hazard",

      encounterSourceAssemblyId:
        "assembly-source",

      encounterTargetAssemblyId:
        "assembly-target",
    },
  });
}


function verification(
  status:
    | "MATCH"
    | "MISMATCH",
) {
  return {
    status,

    expectedFingerprint:
      "c".repeat(64),

    actualFingerprint:
      status === "MATCH"
        ? "c".repeat(64)
        : "d".repeat(64),
  } as const;
}


const parentAllowed = {
  policyVersion:
    "hspp-operational-use-v1",

  allowed:
    true,

  reason:
    "operational_use_allowed",
} as const;


test(
  "eligible encounter-derived evidence reaches only PLAUSIBLE trust",
  () => {
    const prepared =
      contribution();

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage:
          prepared
            .evidenceBuildInput
            .derivationLineage!,

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision:
          parentAllowed,
      });

    assert.equal(
      result.trustState,
      "PLAUSIBLE",
    );

    assert.equal(
      result.operationalEligible,
      true,
    );

    assert.equal(
      result.reason,
      "encounter_contribution_plausibility_passed",
    );

    assert.equal(
      result.crowdEligible,
      false,
    );

    assert.equal(
      result.trainingEligible,
      false,
    );

    assert.equal(
      result.validationEligible,
      false,
    );
  },
);


test(
  "parent operational denial prevents encounter-derived trust",
  () => {
    const prepared =
      contribution();

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage:
          prepared
            .evidenceBuildInput
            .derivationLineage!,

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision: {
          policyVersion:
            "hspp-operational-use-v1",

          allowed:
            false,

          reason:
            "trust_not_operational",
        },
      });

    assert.equal(
      result.trustState,
      "UNASSESSED",
    );

    assert.equal(
      result.operationalEligible,
      false,
    );

    assert.equal(
      result.reason,
      "parent_operational_use_denied",
    );
  },
);


test(
  "lineage parent mismatch is denied",
  () => {
    const prepared =
      contribution();

    const lineage =
      prepared
        .evidenceBuildInput
        .derivationLineage!;

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage: {
          ...lineage,

          parentEvidenceId:
            "00000000-0000-4000-8000-000000000099",
        },

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision:
          parentAllowed,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED",
    );

    assert.equal(
      result.reason,
      "lineage_parent_mismatch",
    );
  },
);


test(
  "lineage fingerprint mismatch is denied",
  () => {
    const prepared =
      contribution();

    const lineage =
      prepared
        .evidenceBuildInput
        .derivationLineage!;

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage: {
          ...lineage,

          parentIntegrityFingerprint:
            "a".repeat(64),
        },

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision:
          parentAllowed,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED",
    );

    assert.equal(
      result.reason,
      "lineage_fingerprint_mismatch",
    );
  },
);


test(
  "wrong derivation type is denied",
  () => {
    const prepared =
      contribution();

    const lineage =
      prepared
        .evidenceBuildInput
        .derivationLineage!;

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage: {
          ...lineage,

          derivationType:
            "SOMETHING_ELSE",
        },

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision:
          parentAllowed,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED",
    );

    assert.equal(
      result.reason,
      "lineage_type_mismatch",
    );
  },
);


test(
  "failed derived integrity cannot earn PLAUSIBLE trust",
  () => {
    const prepared =
      contribution();

    const result =
      assessHsppAssemblyEncounterContribution({
        verification:
          verification("MISMATCH"),

        validationState:
          "VALIDATED",

        contribution:
          prepared,

        derivedLineage:
          prepared
            .evidenceBuildInput
            .derivationLineage!,

        parentEvidenceId,

        parentIntegrityFingerprint:
          parentFingerprint,

        parentOperationalUseDecision:
          parentAllowed,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED",
    );

    assert.equal(
      result.operationalEligible,
      false,
    );

    assert.equal(
      result.reason,
      "integrity_not_verified",
    );
  },
);