import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION,
  planHsppEvidenceAssemblyReconstructionMembers,
} from "@/lib/hspp/planHsppEvidenceAssemblyReconstructionMembers";


const PARENT_ID =
  "10000000-0000-4000-8000-000000000001";

const HISTORICAL_MEMBERSHIP_ID =
  "20000000-0000-4000-8000-000000000003";

const EVIDENCE_A =
  "30000000-0000-4000-8000-000000000001";

const EVIDENCE_B =
  "30000000-0000-4000-8000-000000000002";

const EVIDENCE_C =
  "30000000-0000-4000-8000-000000000003";

const EVIDENCE_C2 =
  "30000000-0000-4000-8000-000000000004";

const EVIDENCE_D =
  "30000000-0000-4000-8000-000000000005";

const FINGERPRINT_A =
  "a".repeat(64);

const FINGERPRINT_B =
  "b".repeat(64);

const FINGERPRINT_C =
  "c".repeat(64);

const FINGERPRINT_C2 =
  "d".repeat(64);

const FINGERPRINT_D =
  "e".repeat(64);


function verifiedMember({
  membershipId,
  evidenceId,
  fingerprint,
  ordinal,
}: {
  membershipId: string;
  evidenceId: string;
  fingerprint: string;
  ordinal: number;
}) {
  return {
    membershipId,

    evidenceId,

    integrityFingerprint:
      fingerprint,

    memberOrdinal:
      ordinal,

    sourceProvider:
      "TEST",

    sourceClass:
      "TEST",

    observedAt:
      "2026-08-23T16:00:00.000Z",

    integrityStatus:
      "MATCH",

    validationState:
      "VALID",
  };
}


function parentAssembly(
  members = [
    verifiedMember({
      membershipId:
        "20000000-0000-4000-8000-000000000001",
      evidenceId:
        EVIDENCE_A,
      fingerprint:
        FINGERPRINT_A,
      ordinal:
        1,
    }),

    verifiedMember({
      membershipId:
        "20000000-0000-4000-8000-000000000002",
      evidenceId:
        EVIDENCE_B,
      fingerprint:
        FINGERPRINT_B,
      ordinal:
        2,
    }),

    verifiedMember({
      membershipId:
        HISTORICAL_MEMBERSHIP_ID,
      evidenceId:
        EVIDENCE_C,
      fingerprint:
        FINGERPRINT_C,
      ordinal:
        3,
    }),
  ],
) {
  return {
    readerVersion:
      "hspp-sealed-assembly-reader-v1",

    scanInput: {
      assemblyId:
        PARENT_ID,

      organizationId:
        "org-1",

      assemblyState:
        "SEALED",

      members:
        [],
    },

    verifiedMembers:
      members,

    membershipRelation:
      null,
  };
}


function historicalContext(
  overrides: Record<string, unknown> = {},
) {
  return {
    evidenceId:
      EVIDENCE_C,

    historicalMembershipId:
      HISTORICAL_MEMBERSHIP_ID,

    parentAssemblyId:
      PARENT_ID,

    evidenceIntegrityFingerprint:
      FINGERPRINT_C,

    parentMemberOrdinal:
      3,

    cessationId:
      "40000000-0000-4000-8000-000000000001",

    unsuitabilityCheckpointId:
      "50000000-0000-4000-8000-000000000001",

    cessationVersion:
      "hspp-assembly-member-effective-cessation-v1",

    cessationPolicyVersion:
      "hspp-member-cessation-policy-v1",

    cessationReason:
      "POST_POSITIVE_UNSUITABILITY",

    ceasedAt:
      "2026-08-23T16:01:00.000Z",

    ...overrides,
  };
}


function replacementCandidate(
  evidenceId: string = EVIDENCE_C2,
  fingerprint: string = FINGERPRINT_C2,
) {
  return {
    evidenceId,

    operationalRead: {
      evidence: {
        id:
          evidenceId,

        integrityFingerprint:
          fingerprint,
      },
    },

    hasAssemblyMembership:
      false,

    membershipClassification:
      "NEVER_ASSEMBLED",

    reservoirDecision: {
      eligible:
        true,

      reason:
        "RESERVOIR_ELIGIBLE",
    },
  };
}


test(
  "Q14ag18B plans A+B+C -> A+B+C2 with no historical C retained",
  () => {
    const result =
      planHsppEvidenceAssemblyReconstructionMembers({
        historicalContext:
          historicalContext() as any,

        parentAssembly:
          parentAssembly() as any,

        replacementCandidate:
          replacementCandidate() as any,
      });

    assert.equal(
      result.plannerVersion,
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION,
    );

    assert.equal(
      result.parentAssemblyId,
      PARENT_ID,
    );

    assert.equal(
      result.historicalMembershipId,
      HISTORICAL_MEMBERSHIP_ID,
    );

    assert.equal(
      result.historicalEvidenceId,
      EVIDENCE_C,
    );

    assert.equal(
      result.replacementEvidenceId,
      EVIDENCE_C2,
    );

    assert.deepEqual(
      result.members,
      [
        {
          evidenceId:
            EVIDENCE_A,
          integrityFingerprint:
            FINGERPRINT_A,
        },
        {
          evidenceId:
            EVIDENCE_B,
          integrityFingerprint:
            FINGERPRINT_B,
        },
        {
          evidenceId:
            EVIDENCE_C2,
          integrityFingerprint:
            FINGERPRINT_C2,
        },
      ],
    );
  },
);


test(
  "Q14ag18B preserves unaffected parent order and places the one new member after retained members",
  () => {
    const members =
      [
        verifiedMember({
          membershipId:
            "20000000-0000-4000-8000-000000000001",
          evidenceId:
            EVIDENCE_A,
          fingerprint:
            FINGERPRINT_A,
          ordinal:
            1,
        }),

        verifiedMember({
          membershipId:
            HISTORICAL_MEMBERSHIP_ID,
          evidenceId:
            EVIDENCE_B,
          fingerprint:
            FINGERPRINT_B,
          ordinal:
            2,
        }),

        verifiedMember({
          membershipId:
            "20000000-0000-4000-8000-000000000004",
          evidenceId:
            EVIDENCE_C,
          fingerprint:
            FINGERPRINT_C,
          ordinal:
            3,
        }),
      ];

    const context =
      historicalContext({
        evidenceId:
          EVIDENCE_B,

        historicalMembershipId:
          HISTORICAL_MEMBERSHIP_ID,

        evidenceIntegrityFingerprint:
          FINGERPRINT_B,

        parentMemberOrdinal:
          2,
      });

    const result =
      planHsppEvidenceAssemblyReconstructionMembers({
        historicalContext:
          context as any,

        parentAssembly:
          parentAssembly(
            members,
          ) as any,

        replacementCandidate:
          replacementCandidate(
            EVIDENCE_D,
            FINGERPRINT_D,
          ) as any,
      });

    assert.deepEqual(
      result.members.map(
        (member) =>
          member.evidenceId,
      ),
      [
        EVIDENCE_A,
        EVIDENCE_C,
        EVIDENCE_D,
      ],
    );
  },
);


test(
  "Q14ag18B fails closed when the context parent differs from the SEALED parent",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext({
              parentAssemblyId:
                "10000000-0000-4000-8000-000000000099",
            }) as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /parent assembly does not match/,
    );
  },
);


test(
  "Q14ag18B fails closed when the exact historical membership id is absent from H1",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext({
              historicalMembershipId:
                "20000000-0000-4000-8000-000000000099",
            }) as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /was not found in the exact SEALED parent/,
    );
  },
);


test(
  "Q14ag18B fails closed when context evidence does not match the exact historical membership",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext({
              evidenceId:
                EVIDENCE_B,
            }) as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /evidence identity does not match/,
    );
  },
);


test(
  "Q14ag18B fails closed when context fingerprint does not match the exact historical membership",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext({
              evidenceIntegrityFingerprint:
                "f".repeat(64),
            }) as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /fingerprint does not match/,
    );
  },
);


test(
  "Q14ag18B fails closed when context ordinal does not match the exact historical membership",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext({
              parentMemberOrdinal:
                2,
            }) as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /member ordinal does not match/,
    );
  },
);


test(
  "Q14ag18B requires a SEALED parent",
  () => {
    const parent =
      parentAssembly() as any;

    parent.scanInput.assemblyState =
      "OPEN";

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parent,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /exact SEALED historical parent/,
    );
  },
);


test(
  "Q14ag18B requires the replacement to be NEVER_ASSEMBLED",
  () => {
    const replacement =
      replacementCandidate() as any;

    replacement.membershipClassification =
      "HISTORICAL_NOT_CURRENT";

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacement,
        }),
      /must be NEVER_ASSEMBLED/,
    );
  },
);


test(
  "Q14ag18B rejects a replacement with current-effective assembly membership",
  () => {
    const replacement =
      replacementCandidate() as any;

    replacement.hasAssemblyMembership =
      true;

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacement,
        }),
      /unexpectedly has current-effective assembly membership/,
    );
  },
);


test(
  "Q14ag18B requires the replacement to remain Reservoir-eligible",
  () => {
    const replacement =
      replacementCandidate() as any;

    replacement.reservoirDecision.eligible =
      false;

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacement,
        }),
      /is not Reservoir-eligible/,
    );
  },
);


test(
  "Q14ag18B requires persisted replacement evidence with exact identity",
  () => {
    const replacement =
      replacementCandidate() as any;

    replacement.operationalRead.evidence.id =
      EVIDENCE_D;

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacement,
        }),
      /Replacement evidence identity mismatch/,
    );
  },
);


test(
  "Q14ag18B requires a lowercase immutable replacement SHA-256 fingerprint",
  () => {
    const replacement =
      replacementCandidate() as any;

    replacement.operationalRead.evidence.integrityFingerprint =
      "NOT-A-FINGERPRINT";

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacement,
        }),
      /lowercase SHA-256 fingerprint/,
    );
  },
);


test(
  "Q14ag18B rejects replacement evidence already present anywhere in H1",
  () => {
    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parentAssembly() as any,

          replacementCandidate:
            replacementCandidate(
              EVIDENCE_A,
              FINGERPRINT_A,
            ) as any,
        }),
      /already exists in the historical parent/,
    );
  },
);


test(
  "Q14ag18B rejects duplicate immutable parent membership identities",
  () => {
    const parent =
      parentAssembly() as any;

    parent.verifiedMembers[1].membershipId =
      parent.verifiedMembers[0].membershipId;

    assert.throws(
      () =>
        planHsppEvidenceAssemblyReconstructionMembers({
          historicalContext:
            historicalContext() as any,

          parentAssembly:
            parent,

          replacementCandidate:
            replacementCandidate() as any,
        }),
      /duplicate membership identity/,
    );
  },
);
