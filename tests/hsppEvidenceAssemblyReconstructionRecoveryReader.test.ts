import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION,
  readHsppEvidenceAssemblyReconstructionRecovery,
} from "@/lib/hspp/readHsppEvidenceAssemblyReconstructionRecovery";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const PARENT_ID =
  "20000000-0000-4000-8000-000000000001";

const CHILD_ID =
  "20000000-0000-4000-8000-000000000002";

const RECONSTRUCTION_ID =
  "30000000-0000-4000-8000-000000000001";

const RETAINED_MEMBERSHIP_ID =
  "40000000-0000-4000-8000-000000000001";

const ORIGINAL_MEMBERSHIP_ID =
  "40000000-0000-4000-8000-000000000002";

const SOURCE_MEMBERSHIP_ID =
  "50000000-0000-4000-8000-000000000001";

const EVIDENCE_A =
  "60000000-0000-4000-8000-000000000001";

const EVIDENCE_C2 =
  "60000000-0000-4000-8000-000000000002";

const FINGERPRINT_A =
  "a".repeat(64);

const FINGERPRINT_C2 =
  "b".repeat(64);


function recoveryRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    reconstruction_id:
      RECONSTRUCTION_ID,

    organization_id:
      ORGANIZATION_ID,

    parent_assembly_id:
      PARENT_ID,

    child_assembly_id:
      CHILD_ID,

    assembly_version:
      "hspp-evidence-assembly-v1",

    membership_policy_version:
      "hspp-assembly-membership-v1",

    reconstruction_policy_version:
      "hspp-reconstruction-policy-v1",

    reconstruction_reason:
      "REPLACE_UNSUITABLE_MEMBER",

    assembly_state:
      "OPEN",

    sealed_at:
      null,

    persisted_member_count:
      2,

    retained_member_count:
      1,

    original_member_count:
      1,

    removed_change_count:
      1,

    added_change_count:
      1,

    members: [
      {
        membership_id:
          RETAINED_MEMBERSHIP_ID,

        evidence_id:
          EVIDENCE_A,

        evidence_integrity_fingerprint:
          FINGERPRINT_A,

        member_ordinal:
          1,

        membership_kind:
          "RETAINED",

        source_membership_id:
          SOURCE_MEMBERSHIP_ID,
      },

      {
        membership_id:
          ORIGINAL_MEMBERSHIP_ID,

        evidence_id:
          EVIDENCE_C2,

        evidence_integrity_fingerprint:
          FINGERPRINT_C2,

        member_ordinal:
          2,

        membership_kind:
          "ORIGINAL",

        source_membership_id:
          null,
      },
    ],

    ...overrides,
  };
}


function makeSupabase(
  data: unknown,
  error: unknown = null,
) {
  const calls:
    Array<{
      name: string;
      args: unknown;
    }> =
    [];


  return {
    calls,

    client: {
      rpc: async (
        name: string,
        args: unknown,
      ) => {
        calls.push({
          name,
          args,
        });

        return {
          data,
          error,
        };
      },
    } as any,
  };
}


test(
  "Q14ag22B maps zero Q14ag22A rows to explicit NOT_FOUND",
  async () => {
    const mock =
      makeSupabase(
        [],
      );

    const result =
      await readHsppEvidenceAssemblyReconstructionRecovery({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,

        childAssemblyId:
          CHILD_ID,
      });

    assert.deepEqual(
      result,
      {
        readerVersion:
          HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION,

        organizationId:
          ORGANIZATION_ID,

        childAssemblyId:
          CHILD_ID,

        state:
          "NOT_FOUND",

        reconstruction:
          null,
      },
    );

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.deepEqual(
      mock.calls[0],
      {
        name:
          "read_hspp_evidence_assembly_reconstruction_recovery",

        args: {
          p_organization_id:
            ORGANIZATION_ID,

          p_child_assembly_id:
            CHILD_ID,
        },
      },
    );
  },
);


test(
  "Q14ag22B normalizes one OPEN reconstruction snapshot",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow(),
        ],
      );

    const result =
      await readHsppEvidenceAssemblyReconstructionRecovery({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,

        childAssemblyId:
          CHILD_ID,
      });

    assert.equal(
      result.state,
      "FOUND",
    );

    if (result.state !== "FOUND") {
      assert.fail(
        "Expected FOUND.",
      );
    }

    assert.equal(
      result.reconstruction.reconstructionId,
      RECONSTRUCTION_ID,
    );

    assert.equal(
      result.reconstruction.parentAssemblyId,
      PARENT_ID,
    );

    assert.equal(
      result.reconstruction.childAssemblyId,
      CHILD_ID,
    );

    assert.equal(
      result.reconstruction.assemblyState,
      "OPEN",
    );

    assert.equal(
      result.reconstruction.sealedAt,
      null,
    );

    assert.equal(
      result.reconstruction.persistedMemberCount,
      2,
    );

    assert.deepEqual(
      result.reconstruction.members,
      [
        {
          membershipId:
            RETAINED_MEMBERSHIP_ID,

          evidenceId:
            EVIDENCE_A,

          integrityFingerprint:
            FINGERPRINT_A,

          memberOrdinal:
            1,

          membershipKind:
            "RETAINED",

          sourceMembershipId:
            SOURCE_MEMBERSHIP_ID,
        },

        {
          membershipId:
            ORIGINAL_MEMBERSHIP_ID,

          evidenceId:
            EVIDENCE_C2,

          integrityFingerprint:
            FINGERPRINT_C2,

          memberOrdinal:
            2,

          membershipKind:
            "ORIGINAL",

          sourceMembershipId:
            null,
        },
      ],
    );
  },
);


test(
  "Q14ag22B accepts a recovered child that has progressed to SEALED",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            assembly_state:
              "SEALED",

            sealed_at:
              "2026-08-23T17:00:00+02:00",
          }),
        ],
      );

    const result =
      await readHsppEvidenceAssemblyReconstructionRecovery({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,

        childAssemblyId:
          CHILD_ID,
      });

    assert.equal(
      result.state,
      "FOUND",
    );

    if (result.state !== "FOUND") {
      assert.fail(
        "Expected FOUND.",
      );
    }

    assert.equal(
      result.reconstruction.assemblyState,
      "SEALED",
    );

    assert.equal(
      result.reconstruction.sealedAt,
      "2026-08-23T15:00:00.000Z",
    );
  },
);


test(
  "Q14ag22B rejects blank organization before RPC",
  async () => {
    const mock =
      makeSupabase(
        [],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            " ",

          childAssemblyId:
            CHILD_ID,
        }),
      /organizationId must be a non-empty string/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag22B rejects blank child identity before RPC",
  async () => {
    const mock =
      makeSupabase(
        [],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            "",
        }),
      /childAssemblyId must be a non-empty string/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag22B propagates Q14ag22A RPC error without retry",
  async () => {
    const rpcError =
      new Error(
        "recovery read failed",
      );

    const mock =
      makeSupabase(
        null,
        rpcError,
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      rpcError,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag22B rejects non-array RPC data",
  async () => {
    const mock =
      makeSupabase(
        recoveryRow(),
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /must return an array/,
    );
  },
);


test(
  "Q14ag22B rejects more than one reconstruction row",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow(),
          recoveryRow(),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /more than one reconstruction/,
    );
  },
);


test(
  "Q14ag22B rejects returned organization mismatch",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            organization_id:
              "10000000-0000-4000-8000-000000000099",
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /organization does not match/,
    );
  },
);


test(
  "Q14ag22B rejects returned child identity mismatch",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            child_assembly_id:
              "20000000-0000-4000-8000-000000000099",
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /child does not match/,
    );
  },
);


test(
  "Q14ag22B rejects parent and child identity equality",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            parent_assembly_id:
              CHILD_ID,
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /parent and child identities must be distinct/,
    );
  },
);


test(
  "Q14ag22B rejects unsupported recovered lifecycle state",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            assembly_state:
              "INVALID",
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /must be OPEN or SEALED/,
    );
  },
);


test(
  "Q14ag22B rejects OPEN child with sealed_at",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            sealed_at:
              "2026-08-23T15:00:00.000Z",
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /OPEN reconstruction child cannot already have sealed_at/,
    );
  },
);


test(
  "Q14ag22B rejects SEALED child without sealed_at",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            assembly_state:
              "SEALED",

            sealed_at:
              null,
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /sealed_at must be a non-empty string/,
    );
  },
);


test(
  "Q14ag22B rejects malformed immutable member fingerprint",
  async () => {
    const row =
      recoveryRow();

    const members =
      row.members as Array<Record<string, unknown>>;

    members[0].evidence_integrity_fingerprint =
      "NOT-A-FINGERPRINT";

    const mock =
      makeSupabase(
        [
          row,
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /lowercase SHA-256 fingerprint/,
    );
  },
);


test(
  "Q14ag22B rejects duplicate recovered evidence identity",
  async () => {
    const row =
      recoveryRow();

    const members =
      row.members as Array<Record<string, unknown>>;

    members[1].evidence_id =
      EVIDENCE_A;

    const mock =
      makeSupabase(
        [
          row,
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /duplicate evidence identity/,
    );
  },
);


test(
  "Q14ag22B rejects non-contiguous recovered ordinals",
  async () => {
    const row =
      recoveryRow();

    const members =
      row.members as Array<Record<string, unknown>>;

    members[1].member_ordinal =
      3;

    const mock =
      makeSupabase(
        [
          row,
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /contiguous ordinal order/,
    );
  },
);


test(
  "Q14ag22B requires RETAINED member source identity",
  async () => {
    const row =
      recoveryRow();

    const members =
      row.members as Array<Record<string, unknown>>;

    members[0].source_membership_id =
      null;

    const mock =
      makeSupabase(
        [
          row,
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /must preserve sourceMembershipId/,
    );
  },
);


test(
  "Q14ag22B rejects ORIGINAL member claiming historical source identity",
  async () => {
    const row =
      recoveryRow();

    const members =
      row.members as Array<Record<string, unknown>>;

    members[1].source_membership_id =
      SOURCE_MEMBERSHIP_ID;

    const mock =
      makeSupabase(
        [
          row,
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /cannot claim historical sourceMembershipId/,
    );
  },
);


test(
  "Q14ag22B rejects persisted member count mismatch",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            persisted_member_count:
              3,
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /persisted member count does not match/,
    );
  },
);


test(
  "Q14ag22B rejects internally inconsistent membership-kind counts",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            retained_member_count:
              2,

            original_member_count:
              0,
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /RETAINED count does not match member metadata/,
    );
  },
);


test(
  "Q14ag22B rejects a recovered no-op reconstruction delta",
  async () => {
    const mock =
      makeSupabase(
        [
          recoveryRow({
            removed_change_count:
              0,

            added_change_count:
              0,
          }),
        ],
      );

    await assert.rejects(
      () =>
        readHsppEvidenceAssemblyReconstructionRecovery({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          childAssemblyId:
            CHILD_ID,
        }),
      /at least one immutable composition delta/,
    );
  },
);
