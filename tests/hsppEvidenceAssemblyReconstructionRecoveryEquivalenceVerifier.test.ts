import assert from "node:assert/strict";
import test from "node:test";

import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";

import type {
  ReadHsppSealedEvidenceAssemblyResult,
} from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import type {
  HsppEvidenceAssemblyReconstructionRecoverySnapshot,
} from "@/lib/hspp/readHsppEvidenceAssemblyReconstructionRecovery";

import {
  HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION,
  verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence,
  verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence,
} from "@/lib/hspp/verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const PARENT_ID =
  "20000000-0000-4000-8000-000000000001";

const CHILD_ID =
  "20000000-0000-4000-8000-000000000002";

const RECONSTRUCTION_ID =
  "30000000-0000-4000-8000-000000000001";


const A =
  "60000000-0000-4000-8000-000000000001";

const B =
  "60000000-0000-4000-8000-000000000002";

const C =
  "60000000-0000-4000-8000-000000000003";

const C2 =
  "60000000-0000-4000-8000-000000000004";

const D =
  "60000000-0000-4000-8000-000000000005";


const M_A =
  "70000000-0000-4000-8000-000000000001";

const M_B =
  "70000000-0000-4000-8000-000000000002";

const M_C =
  "70000000-0000-4000-8000-000000000003";


const H2_M_A =
  "80000000-0000-4000-8000-000000000001";

const H2_M_B =
  "80000000-0000-4000-8000-000000000002";

const H2_M_C2 =
  "80000000-0000-4000-8000-000000000003";


const FP_A =
  "a".repeat(64);

const FP_B =
  "b".repeat(64);

const FP_C =
  "c".repeat(64);

const FP_C2 =
  "d".repeat(64);

const FP_D =
  "e".repeat(64);


const MEMBERSHIP_POLICY_VERSION =
  "hspp-assembly-membership-v1";

const RECONSTRUCTION_POLICY_VERSION =
  "hspp-reconstruction-policy-v1";

const RECONSTRUCTION_REASON =
  "REPLACE_UNSUITABLE_MEMBER";


function candidate(
  evidenceId: string,
  integrityFingerprint: string,
  membershipClassification:
    | "NEVER_ASSEMBLED"
    | "HISTORICAL_NOT_CURRENT"
    | "CURRENT_EFFECTIVE",
): HsppReservoirCandidate {
  return {
    evidenceId,

    operationalRead: {
      evidence: {
        id:
          evidenceId,

        organizationId:
          ORGANIZATION_ID,

        integrityFingerprint,
      },
    },

    hasAssemblyMembership:
      membershipClassification ===
      "CURRENT_EFFECTIVE",

    membershipClassification,

    reservoirDecision: {
      eligible:
        true,
    },
  } as unknown as HsppReservoirCandidate;
}


function parentAssembly(): ReadHsppSealedEvidenceAssemblyResult {
  return {
    scanInput: {
      assemblyId:
        PARENT_ID,

      organizationId:
        ORGANIZATION_ID,

      assemblyState:
        "SEALED",

      members:
        [],
    },

    verifiedMembers: [
      {
        membershipId:
          M_A,

        evidenceId:
          A,

        integrityFingerprint:
          FP_A,

        memberOrdinal:
          1,
      },

      {
        membershipId:
          M_B,

        evidenceId:
          B,

        integrityFingerprint:
          FP_B,

        memberOrdinal:
          2,
      },

      {
        membershipId:
          M_C,

        evidenceId:
          C,

        integrityFingerprint:
          FP_C,

        memberOrdinal:
          3,
      },
    ],

    membershipRelation:
      null,
  } as unknown as ReadHsppSealedEvidenceAssemblyResult;
}


function recovery(
  assemblyState:
    | "OPEN"
    | "SEALED" =
      "OPEN",
): HsppEvidenceAssemblyReconstructionRecoverySnapshot {
  return {
    reconstructionId:
      RECONSTRUCTION_ID,

    organizationId:
      ORGANIZATION_ID,

    parentAssemblyId:
      PARENT_ID,

    childAssemblyId:
      CHILD_ID,

    assemblyVersion:
      "hspp-evidence-assembly-v1",

    membershipPolicyVersion:
      MEMBERSHIP_POLICY_VERSION,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY_VERSION,

    reconstructionReason:
      RECONSTRUCTION_REASON,

    assemblyState,

    sealedAt:
      assemblyState === "SEALED"
        ? "2026-08-23T15:00:00.000Z"
        : null,

    persistedMemberCount:
      3,

    retainedMemberCount:
      2,

    originalMemberCount:
      1,

    removedChangeCount:
      1,

    addedChangeCount:
      1,

    members: [
      {
        membershipId:
          H2_M_A,

        evidenceId:
          A,

        integrityFingerprint:
          FP_A,

        memberOrdinal:
          1,

        membershipKind:
          "RETAINED",

        sourceMembershipId:
          M_A,
      },

      {
        membershipId:
          H2_M_B,

        evidenceId:
          B,

        integrityFingerprint:
          FP_B,

        memberOrdinal:
          2,

        membershipKind:
          "RETAINED",

        sourceMembershipId:
          M_B,
      },

      {
        membershipId:
          H2_M_C2,

        evidenceId:
          C2,

        integrityFingerprint:
          FP_C2,

        memberOrdinal:
          3,

        membershipKind:
          "ORIGINAL",

        sourceMembershipId:
          null,
      },
    ],
  };
}


function validInput() {
  return {
    organizationId:
      ORGANIZATION_ID,

    childAssemblyId:
      CHILD_ID,

    historicalCandidate:
      candidate(
        C,
        FP_C,
        "HISTORICAL_NOT_CURRENT",
      ),

    replacementCandidate:
      candidate(
        C2,
        FP_C2,
        "NEVER_ASSEMBLED",
      ),

    membershipPolicyVersion:
      MEMBERSHIP_POLICY_VERSION,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY_VERSION,

    reconstructionReason:
      RECONSTRUCTION_REASON,

    parentAssembly:
      parentAssembly(),

    recovery:
      recovery(),
  };
}


test(
  "Q14ag24 proves exact OPEN A+B+C -> A+B+C2 recovery",
  () => {
    const result =
      verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
        validInput(),
      );

    assert.deepEqual(
      result,
      {
        verifierVersion:
          HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION,

        state:
          "EXACT_RECOVERY",

        organizationId:
          ORGANIZATION_ID,

        parentAssemblyId:
          PARENT_ID,

        childAssemblyId:
          CHILD_ID,

        historicalEvidenceId:
          C,

        replacementEvidenceId:
          C2,

        membershipPolicyVersion:
          MEMBERSHIP_POLICY_VERSION,

        reconstructionPolicyVersion:
          RECONSTRUCTION_POLICY_VERSION,

        reconstructionReason:
          RECONSTRUCTION_REASON,

        assemblyState:
          "OPEN",

        memberCount:
          3,
      },
    );
  },
);


test(
  "Q14ag24 proves exact recovery after H2 has progressed to SEALED",
  () => {
    const input =
      validInput();

    input.recovery =
      recovery(
        "SEALED",
      );

    const result =
      verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
        input,
      );

    assert.equal(
      result.state,
      "EXACT_RECOVERY",
    );

    assert.equal(
      result.assemblyState,
      "SEALED",
    );
  },
);


test(
  "Q14ag24 rejects recovery organization mismatch",
  () => {
    const input =
      validInput();

    input.recovery.organizationId =
      "10000000-0000-4000-8000-000000000099";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /organization does not match the expected organization/,
    );
  },
);


test(
  "Q14ag24 rejects recovery child mismatch",
  () => {
    const input =
      validInput();

    input.recovery.childAssemblyId =
      "20000000-0000-4000-8000-000000000099";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /child does not match the caller-owned child identity/,
    );
  },
);


test(
  "Q14ag24 rejects recovery parent mismatch",
  () => {
    const input =
      validInput();

    input.recovery.parentAssemblyId =
      "20000000-0000-4000-8000-000000000099";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /parent does not match the immutable SEALED H1/,
    );
  },
);


test(
  "Q14ag24 requires a SEALED H1",
  () => {
    const input =
      validInput();

    (
      input.parentAssembly.scanInput as {
        assemblyState: string;
      }
    ).assemblyState =
      "OPEN";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /parent must be SEALED/,
    );
  },
);


test(
  "Q14ag24 requires historical side to be HISTORICAL_NOT_CURRENT",
  () => {
    const input =
      validInput();

    input.historicalCandidate =
      candidate(
        C,
        FP_C,
        "NEVER_ASSEMBLED",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /historicalCandidate must be lifecycle-classified HISTORICAL_NOT_CURRENT/,
    );
  },
);


test(
  "Q14ag24 requires replacement side to be NEVER_ASSEMBLED",
  () => {
    const input =
      validInput();

    input.replacementCandidate =
      candidate(
        C2,
        FP_C2,
        "HISTORICAL_NOT_CURRENT",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /replacementCandidate must be lifecycle-classified NEVER_ASSEMBLED/,
    );
  },
);


test(
  "Q14ag24 rejects selected evidence with current-effective membership",
  () => {
    const input =
      validInput();

    input.replacementCandidate =
      {
        ...input.replacementCandidate,

        hasAssemblyMembership:
          true,
      };

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /cannot have current-effective assembly membership/,
    );
  },
);


test(
  "Q14ag24 requires both selected evidence records to remain Reservoir eligible",
  () => {
    const input =
      validInput();

    input.replacementCandidate =
      {
        ...input.replacementCandidate,

        reservoirDecision: {
          ...input.replacementCandidate.reservoirDecision,

          eligible:
            false,
        },
      };

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /must remain Reservoir eligible/,
    );
  },
);


test(
  "Q14ag24 rejects persisted selected evidence identity mismatch",
  () => {
    const input =
      validInput();

    (
      input.replacementCandidate
        .operationalRead
        .evidence as {
          id: string;
        }
    ).id =
      D;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /persisted evidence identity does not match/,
    );
  },
);


test(
  "Q14ag24 rejects selected evidence organization mismatch",
  () => {
    const input =
      validInput();

    (
      input.replacementCandidate
        .operationalRead
        .evidence as {
          organizationId: string;
        }
    ).organizationId =
      "10000000-0000-4000-8000-000000000099";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /evidence organization does not match/,
    );
  },
);


test(
  "Q14ag24 rejects malformed selected immutable fingerprint",
  () => {
    const input =
      validInput();

    (
      input.replacementCandidate
        .operationalRead
        .evidence as {
          integrityFingerprint: string;
        }
    ).integrityFingerprint =
      "BAD";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /lowercase SHA-256 fingerprint/,
    );
  },
);


test(
  "Q14ag24 requires historical and replacement identities to differ",
  () => {
    const input =
      validInput();

    input.replacementCandidate =
      candidate(
        C,
        FP_C,
        "NEVER_ASSEMBLED",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /must be distinct/,
    );
  },
);


test(
  "Q14ag24 requires the selected historical evidence to exist in exact H1",
  () => {
    const input =
      validInput();

    input.historicalCandidate =
      candidate(
        D,
        FP_D,
        "HISTORICAL_NOT_CURRENT",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /must identify exactly one immutable H1 membership/,
    );
  },
);


test(
  "Q14ag24 binds selected historical fingerprint to exact H1 membership",
  () => {
    const input =
      validInput();

    input.historicalCandidate =
      candidate(
        C,
        FP_D,
        "HISTORICAL_NOT_CURRENT",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /historical evidence fingerprint does not match/,
    );
  },
);


test(
  "Q14ag24 rejects replacement evidence already present in H1",
  () => {
    const input =
      validInput();

    input.replacementCandidate =
      candidate(
        B,
        FP_B,
        "NEVER_ASSEMBLED",
      );

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /replacement evidence is already present in H1/,
    );
  },
);


test(
  "Q14ag24 requires recovered membership policy to equal selected B07B policy",
  () => {
    const input =
      validInput();

    input.recovery.membershipPolicyVersion =
      "wrong-membership-policy";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /membership policy does not match/,
    );
  },
);


test(
  "Q14ag24 requires recovered reconstruction policy to equal exact request",
  () => {
    const input =
      validInput();

    input.recovery.reconstructionPolicyVersion =
      "wrong-reconstruction-policy";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /reconstruction policy does not match/,
    );
  },
);


test(
  "Q14ag24 requires recovered reconstruction reason to equal exact request",
  () => {
    const input =
      validInput();

    input.recovery.reconstructionReason =
      "WRONG_REASON";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /reconstruction reason does not match/,
    );
  },
);


test(
  "Q14ag24 requires one-for-one recovered member count",
  () => {
    const input =
      validInput();

    input.recovery.persistedMemberCount =
      4;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /preserve the one-for-one H1 member count/,
    );
  },
);


test(
  "Q14ag24 requires exactly one ORIGINAL recovered member",
  () => {
    const input =
      validInput();

    input.recovery.originalMemberCount =
      2;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /exactly one ORIGINAL member/,
    );
  },
);


test(
  "Q14ag24 requires exactly one removed and one added delta count",
  () => {
    const input =
      validInput();

    input.recovery.removedChangeCount =
      2;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /exactly one REMOVED and one ADDED delta/,
    );
  },
);


test(
  "Q14ag24 rejects retained H2 evidence identity that changes the inferred removed member",
  () => {
    const input =
      validInput();

    input.recovery.members[1].evidenceId =
      C;

    input.recovery.members[1].integrityFingerprint =
      FP_C;

    input.recovery.members[1].sourceMembershipId =
      M_C;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /evidence identity conflicts with immutable H1 order/,
    );
  },
);


test(
  "Q14ag24 rejects retained H2 source-membership mismatch",
  () => {
    const input =
      validInput();

    input.recovery.members[1].sourceMembershipId =
      M_A;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /does not reference its exact immutable H1 membership/,
    );
  },
);


test(
  "Q14ag24 rejects retained H2 fingerprint mutation",
  () => {
    const input =
      validInput();

    input.recovery.members[1].integrityFingerprint =
      FP_D;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /changed its immutable fingerprint/,
    );
  },
);


test(
  "Q14ag24 rejects retained H2 ordering drift",
  () => {
    const input =
      validInput();

    const first =
      input.recovery.members[0];

    const second =
      input.recovery.members[1];

    input.recovery.members[0] =
      {
        ...second,

        memberOrdinal:
          1,
      };

    input.recovery.members[1] =
      {
        ...first,

        memberOrdinal:
          2,
      };

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /evidence identity conflicts with immutable H1 order/,
    );
  },
);


test(
  "Q14ag24 requires recovered ORIGINAL member to equal authorized replacement",
  () => {
    const input =
      validInput();

    input.recovery.members[2].evidenceId =
      D;

    input.recovery.members[2].integrityFingerprint =
      FP_D;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /not the authorized NEVER_ASSEMBLED replacement/,
    );
  },
);


test(
  "Q14ag24 requires recovered replacement immutable fingerprint",
  () => {
    const input =
      validInput();

    input.recovery.members[2].integrityFingerprint =
      FP_D;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /replacement fingerprint does not match/,
    );
  },
);


test(
  "Q14ag24 requires replacement to remain ORIGINAL with no H1 source",
  () => {
    const input =
      validInput();

    input.recovery.members[2] = {
      ...input.recovery.members[2],

      membershipKind:
        "RETAINED",

      sourceMembershipId:
        M_C,
    };

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          input,
        ),
      /replacement member must be ORIGINAL/,
    );
  },
);

function immutableRecoveryInput(
  assemblyState:
    | "OPEN"
    | "SEALED" =
      "OPEN",
) {
  return {
    organizationId:
      ORGANIZATION_ID,

    childAssemblyId:
      CHILD_ID,

    historicalEvidenceId:
      C,

    historicalEvidenceIntegrityFingerprint:
      FP_C,

    replacementEvidenceId:
      C2,

    replacementEvidenceIntegrityFingerprint:
      FP_C2,

    membershipPolicyVersion:
      MEMBERSHIP_POLICY_VERSION,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY_VERSION,

    reconstructionReason:
      RECONSTRUCTION_REASON,

    parentAssembly:
      parentAssembly(),

    recovery:
      recovery(
        assemblyState,
      ),
  };
}


test(
  "Q14ag31K immutable core produces the exact legacy Q14ag24 result",
  () => {
    for (
      const assemblyState of [
        "OPEN",
        "SEALED",
      ] as const
    ) {
      const legacyInput =
        validInput();

      legacyInput.recovery =
        recovery(
          assemblyState,
        );

      const legacyResult =
        verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence(
          legacyInput,
        );

      const immutableResult =
        verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence(
          immutableRecoveryInput(
            assemblyState,
          ),
        );

      assert.deepEqual(
        immutableResult,
        legacyResult,
      );
    }
  },
);


test(
  "Q14ag31K immutable core verifies SEALED post-persistence recovery without B07B candidate lifecycle state",
  () => {
    const result =
      verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence(
        immutableRecoveryInput(
          "SEALED",
        ),
      );

    assert.equal(
      result.state,
      "EXACT_RECOVERY",
    );

    assert.equal(
      result.assemblyState,
      "SEALED",
    );

    assert.equal(
      result.historicalEvidenceId,
      C,
    );

    assert.equal(
      result.replacementEvidenceId,
      C2,
    );
  },
);


test(
  "Q14ag31K immutable core validates replacement fingerprint format",
  () => {
    const input =
      immutableRecoveryInput();

    input.replacementEvidenceIntegrityFingerprint =
      "BAD";

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence(
          input,
        ),
      /lowercase SHA-256 fingerprint/,
    );
  },
);


test(
  "Q14ag31K immutable core binds historical fingerprint to exact H1",
  () => {
    const input =
      immutableRecoveryInput();

    input.historicalEvidenceIntegrityFingerprint =
      FP_D;

    assert.throws(
      () =>
        verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence(
          input,
        ),
      /historical evidence fingerprint does not match/,
    );
  },
);
