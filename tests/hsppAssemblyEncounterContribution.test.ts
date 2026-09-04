import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  prepareHsppAssemblyEncounterContribution,
  HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE,
  HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION,
} from "../lib/hspp/prepareHsppAssemblyEncounterContribution";

import type {
  HsppAssemblyEncounterMembershipResult,
} from "../lib/hspp/evaluateHsppAssemblyEncounterMembership";


const organizationId =
  "11111111-1111-4111-8111-111111111111";

const candidateEvidenceId =
  "00000000-0000-4000-8000-000000000002";

const candidateFingerprint =
  "b".repeat(64);


function eligibleEncounter():
  HsppAssemblyEncounterMembershipResult {
  return {
    policyVersion:
      "hspp-assembly-encounter-membership-v1",

    organizationId,

    sourceAssemblyId:
      "assembly-source",

    targetAssemblyId:
      "assembly-target",

    candidateEvidenceId,

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


test(
  "positive encounter prepares lineage-bound derived evidence input",
  () => {
    const prepared =
      prepareHsppAssemblyEncounterContribution({
        organizationId,

        encounterMembership:
          eligibleEncounter(),

        parentEvidence: {
          evidenceId:
            candidateEvidenceId,

          integrityFingerprint:
            candidateFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "provider-b",
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

          latitude:
            -33.9249,

          longitude:
            18.4241,

          encounterSourceAssemblyId:
            "assembly-source",

          encounterTargetAssemblyId:
            "assembly-target",
        },
      });

    assert.equal(
      prepared.state,
      "ENCOUNTER_CONTRIBUTION_PREPARED",
    );

    assert.equal(
      prepared.authority,
      "NONE",
    );

    assert.equal(
      prepared.parentEvidenceId,
      candidateEvidenceId,
    );

    assert.equal(
      prepared.evidenceBuildInput
        .derivationLineage
        ?.parentEvidenceId,
      candidateEvidenceId,
    );

    assert.equal(
      prepared.evidenceBuildInput
        .derivationLineage
        ?.parentIntegrityFingerprint,
      candidateFingerprint,
    );

    assert.equal(
      prepared.evidenceBuildInput
        .derivationLineage
        ?.derivationType,
      HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE,
    );

    assert.equal(
      prepared.evidenceBuildInput
        .derivationLineage
        ?.derivationVersion,
      HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION,
    );
  },
);


test(
  "prepared contribution can use existing HSPP evidence builder and canonical lineage v2",
  () => {
    const prepared =
      prepareHsppAssemblyEncounterContribution({
        organizationId,

        encounterMembership:
          eligibleEncounter(),

        parentEvidence: {
          evidenceId:
            candidateEvidenceId,

          integrityFingerprint:
            candidateFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "provider-b",
        },

        derivedSourceStream:
          "hspp-assembly-encounter",

        derivedSourceMessageId:
          "encounter-message-1",

        derivedObservedAt:
          "2026-09-03T18:00:00.000Z",

        derivedPayloadSchemaVersion:
          "hspp-assembly-encounter-contribution-v1",

        derivedNormalizedPayload: {
          eventType:
            "road-hazard",

          latitude:
            -33.9249,

          longitude:
            18.4241,
        },
      });

    const built =
      buildHsppEvidence(
        prepared.evidenceBuildInput,
      );

    assert.equal(
      built.canonicalizationVersion,
      "hspp-canonical-json-lineage-v2",
    );

    assert.equal(
      built.derivationLineage
        ?.parentEvidenceId,
      candidateEvidenceId,
    );

    assert.equal(
      built.derivationLineage
        ?.parentIntegrityFingerprint,
      candidateFingerprint,
    );

    assert.equal(
      built.trustState,
      "UNASSESSED",
    );

    assert.equal(
      built.trainingEligible,
      false,
    );
  },
);


test(
  "denied encounter cannot prepare contribution",
  () => {
    const denied = {
      ...eligibleEncounter(),

      state:
        "PAIR_MEMBERSHIP_DENIED" as const,

      membershipDecision: {
        ...eligibleEncounter()
          .membershipDecision,

        eligible:
          false,

        reason:
          "SAME_PROVIDER" as const,
      },
    };

    assert.throws(
      () =>
        prepareHsppAssemblyEncounterContribution({
          organizationId,

          encounterMembership:
            denied,

          parentEvidence: {
            evidenceId:
              candidateEvidenceId,

            integrityFingerprint:
              candidateFingerprint,

            sourceClass:
              "external_intelligence",

            sourceProvider:
              "provider-b",
          },

          derivedSourceStream:
            "hspp-assembly-encounter",

          derivedSourceMessageId:
            "encounter-message-2",

          derivedObservedAt:
            "2026-09-03T18:00:00.000Z",

          derivedPayloadSchemaVersion:
            "hspp-assembly-encounter-contribution-v1",

          derivedNormalizedPayload: {
            eventType:
              "road-hazard",
          },
        }),
      /PAIR_MEMBERSHIP_ELIGIBLE/,
    );
  },
);


test(
  "parent identity must match encounter candidate identity",
  () => {
    assert.throws(
      () =>
        prepareHsppAssemblyEncounterContribution({
          organizationId,

          encounterMembership:
            eligibleEncounter(),

          parentEvidence: {
            evidenceId:
              "00000000-0000-4000-8000-000000000099",

            integrityFingerprint:
              candidateFingerprint,

            sourceClass:
              "external_intelligence",

            sourceProvider:
              "provider-b",
          },

          derivedSourceStream:
            "hspp-assembly-encounter",

          derivedSourceMessageId:
            "encounter-message-3",

          derivedObservedAt:
            "2026-09-03T18:00:00.000Z",

          derivedPayloadSchemaVersion:
            "hspp-assembly-encounter-contribution-v1",

          derivedNormalizedPayload: {
            eventType:
              "road-hazard",
          },
        }),
      /does not match encounter candidate evidence identity/,
    );
  },
);


test(
  "payload remains explicit caller-owned transformation input",
  () => {
    const payload = {
      eventType:
        "road-hazard",

      contributionReason:
        "encounter-compatible",
    };

    const prepared =
      prepareHsppAssemblyEncounterContribution({
        organizationId,

        encounterMembership:
          eligibleEncounter(),

        parentEvidence: {
          evidenceId:
            candidateEvidenceId,

          integrityFingerprint:
            candidateFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "provider-b",
        },

        derivedSourceStream:
          "hspp-assembly-encounter",

        derivedSourceMessageId:
          "encounter-message-4",

        derivedObservedAt:
          "2026-09-03T18:00:00.000Z",

        derivedPayloadSchemaVersion:
          "hspp-assembly-encounter-contribution-v1",

        derivedNormalizedPayload:
          payload,
      });

    assert.deepEqual(
      prepared.evidenceBuildInput
        .normalizedPayload,
      payload,
    );
  },
);