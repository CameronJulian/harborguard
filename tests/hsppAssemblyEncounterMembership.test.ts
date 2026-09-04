import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppAssemblyEncounterMembership,
} from "../lib/hspp/evaluateHsppAssemblyEncounterMembership";

import type {
  HsppAssemblyMembershipEvidence,
} from "../lib/hspp/evaluateHsppAssemblyMembership";

import type {
  HsppAssemblyEncounterMemberCandidate,
  HsppAssemblyEncounterSnapshot,
} from "../lib/hspp/evaluateHsppAssemblyEncounter";


const organizationId =
  "11111111-1111-4111-8111-111111111111";


function evidence({
  evidenceId,
  fingerprintCharacter,
  provider,
  latitude = -33.9249,
  longitude = 18.4241,
  eventType = "road-hazard",
}: {
  evidenceId: string;
  fingerprintCharacter: string;
  provider: string;
  latitude?: number;
  longitude?: number;
  eventType?: string;
}): HsppAssemblyMembershipEvidence {
  return {
    organizationId,

    evidenceId,

    integrityFingerprint:
      fingerprintCharacter.repeat(64),

    sourceClass:
      "external_intelligence",

    sourceProvider:
      provider,

    observedAt:
      "2026-09-03T18:00:00.000Z",

    latitude,

    longitude,

    eventType,
  };
}


function candidate({
  evidenceId,
  fingerprintCharacter,
  provider,
}: {
  evidenceId: string;
  fingerprintCharacter: string;
  provider: string;
}): HsppAssemblyEncounterMemberCandidate {
  return {
    sourceAssemblyId:
      "assembly-source",

    targetAssemblyId:
      "assembly-target",

    evidenceId,

    integrityFingerprint:
      fingerprintCharacter.repeat(64),

    memberOrdinal:
      1,

    sourceProvider:
      provider,

    sourceClass:
      "external_intelligence",

    observedAt:
      "2026-09-03T18:00:00.000Z",

    validationState:
      "VALID",
  };
}


function targetAssembly({
  anchorEvidenceId,
  anchorFingerprintCharacter,
  anchorProvider,
}: {
  anchorEvidenceId: string;
  anchorFingerprintCharacter: string;
  anchorProvider: string;
}): HsppAssemblyEncounterSnapshot {
  return {
    organizationId,

    assemblyId:
      "assembly-target",

    members: [
      {
        membershipId:
          "membership-anchor",

        evidenceId:
          anchorEvidenceId,

        integrityFingerprint:
          anchorFingerprintCharacter.repeat(
            64,
          ),

        memberOrdinal:
          0,

        sourceProvider:
          anchorProvider,

        sourceClass:
          "external_intelligence",

        observedAt:
          "2026-09-03T18:00:00.000Z",

        integrityStatus:
          "MATCH",

        validationState:
          "VALID",
      },
    ],
  };
}


test(
  "encounter candidate becomes pair-membership eligible only through existing B11A2",
  () => {
    const anchorId =
      "00000000-0000-4000-8000-000000000001";

    const candidateId =
      "00000000-0000-4000-8000-000000000002";

    const result =
      evaluateHsppAssemblyEncounterMembership({
        organizationId,

        candidate:
          candidate({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-b",
          }),

        candidateEvidence:
          evidence({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-b",
          }),

        targetAssembly:
          targetAssembly({
            anchorEvidenceId:
              anchorId,

            anchorFingerprintCharacter:
              "a",

            anchorProvider:
              "provider-a",
          }),

        targetAnchorEvidence:
          evidence({
            evidenceId:
              anchorId,

            fingerprintCharacter:
              "a",

            provider:
              "provider-a",
          }),
      });

    assert.equal(
      result.state,
      "PAIR_MEMBERSHIP_ELIGIBLE",
    );

    assert.equal(
      result.membershipDecision.eligible,
      true,
    );

    assert.equal(
      result.membershipDecision.reason,
      "ELIGIBLE",
    );

    assert.equal(
      result.authority,
      "NONE",
    );

    assert.equal(
      result.candidateEvidenceId,
      candidateId,
    );

    assert.equal(
      result.targetAnchorEvidenceId,
      anchorId,
    );
  },
);


test(
  "same-provider encounter candidate is denied by existing B11A2",
  () => {
    const anchorId =
      "00000000-0000-4000-8000-000000000001";

    const candidateId =
      "00000000-0000-4000-8000-000000000002";

    const result =
      evaluateHsppAssemblyEncounterMembership({
        organizationId,

        candidate:
          candidate({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-a",
          }),

        candidateEvidence:
          evidence({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-a",
          }),

        targetAssembly:
          targetAssembly({
            anchorEvidenceId:
              anchorId,

            anchorFingerprintCharacter:
              "a",

            anchorProvider:
              "provider-a",
          }),

        targetAnchorEvidence:
          evidence({
            evidenceId:
              anchorId,

            fingerprintCharacter:
              "a",

            provider:
              "provider-a",
          }),
      });

    assert.equal(
      result.state,
      "PAIR_MEMBERSHIP_DENIED",
    );

    assert.equal(
      result.membershipDecision.eligible,
      false,
    );

    assert.equal(
      result.membershipDecision.reason,
      "SAME_PROVIDER",
    );

    assert.equal(
      result.authority,
      "NONE",
    );
  },
);


test(
  "event-type mismatch is denied rather than treated as a fitting piece",
  () => {
    const anchorId =
      "00000000-0000-4000-8000-000000000001";

    const candidateId =
      "00000000-0000-4000-8000-000000000002";

    const result =
      evaluateHsppAssemblyEncounterMembership({
        organizationId,

        candidate:
          candidate({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-b",
          }),

        candidateEvidence:
          evidence({
            evidenceId:
              candidateId,

            fingerprintCharacter:
              "b",

            provider:
              "provider-b",

            eventType:
              "different-event",
          }),

        targetAssembly:
          targetAssembly({
            anchorEvidenceId:
              anchorId,

            anchorFingerprintCharacter:
              "a",

            anchorProvider:
              "provider-a",
          }),

        targetAnchorEvidence:
          evidence({
            evidenceId:
              anchorId,

            fingerprintCharacter:
              "a",

            provider:
              "provider-a",
          }),
      });

    assert.equal(
      result.state,
      "PAIR_MEMBERSHIP_DENIED",
    );

    assert.equal(
      result.membershipDecision.reason,
      "EVENT_TYPE_MISMATCH",
    );
  },
);


test(
  "bridge rejects a target anchor not present in the supplied target assembly",
  () => {
    const candidateId =
      "00000000-0000-4000-8000-000000000002";

    assert.throws(
      () =>
        evaluateHsppAssemblyEncounterMembership({
          organizationId,

          candidate:
            candidate({
              evidenceId:
                candidateId,

              fingerprintCharacter:
                "b",

              provider:
                "provider-b",
            }),

          candidateEvidence:
            evidence({
              evidenceId:
                candidateId,

              fingerprintCharacter:
                "b",

              provider:
                "provider-b",
            }),

          targetAssembly:
            targetAssembly({
              anchorEvidenceId:
                "00000000-0000-4000-8000-000000000001",

              anchorFingerprintCharacter:
                "a",

              anchorProvider:
                "provider-a",
            }),

          targetAnchorEvidence:
            evidence({
              evidenceId:
                "00000000-0000-4000-8000-000000000099",

              fingerprintCharacter:
                "c",

              provider:
                "provider-c",
            }),
        }),
      /not a member of the supplied target assembly/i,
    );
  },
);


test(
  "bridge rejects hydration that does not match structural encounter identity",
  () => {
    const structuralCandidateId =
      "00000000-0000-4000-8000-000000000002";

    const hydratedCandidateId =
      "00000000-0000-4000-8000-000000000003";

    assert.throws(
      () =>
        evaluateHsppAssemblyEncounterMembership({
          organizationId,

          candidate:
            candidate({
              evidenceId:
                structuralCandidateId,

              fingerprintCharacter:
                "b",

              provider:
                "provider-b",
            }),

          candidateEvidence:
            evidence({
              evidenceId:
                hydratedCandidateId,

              fingerprintCharacter:
                "b",

              provider:
                "provider-b",
            }),

          targetAssembly:
            targetAssembly({
              anchorEvidenceId:
                "00000000-0000-4000-8000-000000000001",

              anchorFingerprintCharacter:
                "a",

              anchorProvider:
                "provider-a",
            }),

          targetAnchorEvidence:
            evidence({
              evidenceId:
                "00000000-0000-4000-8000-000000000001",

              fingerprintCharacter:
                "a",

              provider:
                "provider-a",
            }),
        }),
      /identity does not match/i,
    );
  },
);