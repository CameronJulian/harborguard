import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_RPC,
  HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION,
  persistHsppEvidenceAssemblyReconstruction,
} from "@/lib/hspp/persistHsppEvidenceAssemblyReconstruction";


const ORGANIZATION_ID =
  "00000000-0000-0000-0000-0000000000a1";

const PARENT_ASSEMBLY_ID =
  "00000000-0000-0000-0000-0000000000b1";

const CHILD_ASSEMBLY_ID =
  "00000000-0000-0000-0000-0000000000c1";

const MEMBERSHIP_POLICY_VERSION =
  "hspp-assembly-membership-test-v1";

const RECONSTRUCTION_POLICY_VERSION =
  "hspp-reconstruction-test-v1";

const RECONSTRUCTION_REASON =
  "POST_POSITIVE_MEMBER_REPLACEMENT";

const FIRST_EVIDENCE_ID =
  "00000000-0000-0000-0000-000000000001";

const SECOND_EVIDENCE_ID =
  "00000000-0000-0000-0000-000000000002";

const FIRST_FINGERPRINT =
  "a".repeat(64);

const SECOND_FINGERPRINT =
  "b".repeat(64);


function validRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    reconstruction_id:
      "00000000-0000-0000-0000-0000000000d1",

    organization_id:
      ORGANIZATION_ID,

    parent_assembly_id:
      PARENT_ASSEMBLY_ID,

    child_assembly_id:
      CHILD_ASSEMBLY_ID,

    assembly_version:
      "hspp-evidence-assembly-v1",

    membership_policy_version:
      MEMBERSHIP_POLICY_VERSION,

    reconstruction_policy_version:
      RECONSTRUCTION_POLICY_VERSION,

    reconstruction_reason:
      RECONSTRUCTION_REASON,

    assembly_state:
      "OPEN",

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

    idempotent_recovery:
      false,

    ...overrides,
  };
}


function createSupabaseMock(
  options: {
    data?: unknown;
    error?: unknown;
  } = {},
) {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase = {
    rpc: async (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({
        name,
        args,
      });

      return {
        data:
          options.data ??
          [validRow()],

        error:
          options.error ??
          null,
      };
    },
  };

  return {
    supabase,
    calls,
  };
}


function validInput(
  supabase: unknown,
) {
  return {
    supabase:
      supabase as any,

    organizationId:
      ORGANIZATION_ID,

    parentAssemblyId:
      PARENT_ASSEMBLY_ID,

    childAssemblyId:
      CHILD_ASSEMBLY_ID,

    membershipPolicyVersion:
      MEMBERSHIP_POLICY_VERSION,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY_VERSION,

    reconstructionReason:
      RECONSTRUCTION_REASON,

    members: [
      {
        evidenceId:
          FIRST_EVIDENCE_ID,

        integrityFingerprint:
          FIRST_FINGERPRINT,
      },
      {
        evidenceId:
          SECOND_EVIDENCE_ID,

        integrityFingerprint:
          SECOND_FINGERPRINT,
      },
    ],
  };
}


test(
  "Q14ag16A invokes Q14h exactly once with the caller-owned child identity and final member set",
  async () => {
    const mock =
      createSupabaseMock();

    const result =
      await persistHsppEvidenceAssemblyReconstruction(
        validInput(
          mock.supabase,
        ),
      );

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      mock.calls[0].name,
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_RPC,
    );

    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_parent_assembly_id:
          PARENT_ASSEMBLY_ID,

        p_child_assembly_id:
          CHILD_ASSEMBLY_ID,

        p_assembly_version:
          "hspp-evidence-assembly-v1",

        p_membership_policy_version:
          MEMBERSHIP_POLICY_VERSION,

        p_reconstruction_policy_version:
          RECONSTRUCTION_POLICY_VERSION,

        p_reconstruction_reason:
          RECONSTRUCTION_REASON,

        p_members: [
          {
            evidenceId:
              FIRST_EVIDENCE_ID,

            integrityFingerprint:
              FIRST_FINGERPRINT,
          },
          {
            evidenceId:
              SECOND_EVIDENCE_ID,

            integrityFingerprint:
              SECOND_FINGERPRINT,
          },
        ],
      },
    );

    assert.equal(
      result.persistenceVersion,
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION,
    );

    assert.equal(
      result.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      result.parentAssemblyId,
      PARENT_ASSEMBLY_ID,
    );

    assert.equal(
      result.childAssemblyId,
      CHILD_ASSEMBLY_ID,
    );

    assert.equal(
      result.persistedMemberCount,
      2,
    );

    assert.equal(
      result.retainedMemberCount,
      1,
    );

    assert.equal(
      result.originalMemberCount,
      1,
    );

    assert.equal(
      result.removedChangeCount,
      1,
    );

    assert.equal(
      result.addedChangeCount,
      1,
    );

    assert.equal(
      result.idempotentRecovery,
      false,
    );

    assert.deepEqual(
      result.members,
      validInput(
        mock.supabase,
      ).members,
    );
  },
);


test(
  "Q14ag16A preserves Q14h exact idempotent-recovery result",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow({
            idempotent_recovery:
              true,
          }),
        ],
      });

    const result =
      await persistHsppEvidenceAssemblyReconstruction(
        validInput(
          mock.supabase,
        ),
      );

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      result.childAssemblyId,
      CHILD_ASSEMBLY_ID,
    );

    assert.equal(
      result.idempotentRecovery,
      true,
    );
  },
);


for (
  const testCase of [
    {
      name:
        "blank organization identity",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.organizationId =
            " ";
        },
    },
    {
      name:
        "same parent and child identity",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.childAssemblyId =
            PARENT_ASSEMBLY_ID;
        },
    },
    {
      name:
        "blank membership policy",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.membershipPolicyVersion =
            " ";
        },
    },
    {
      name:
        "blank reconstruction policy",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.reconstructionPolicyVersion =
            " ";
        },
    },
    {
      name:
        "blank reconstruction reason",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.reconstructionReason =
            " ";
        },
    },
    {
      name:
        "fewer than two final members",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.members =
            [
              input.members[0],
            ];
        },
    },
    {
      name:
        "duplicate final evidence identity",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.members[1] = {
            ...input.members[1],

            evidenceId:
              input.members[0].evidenceId,
          };
        },
    },
    {
      name:
        "non SHA-256 member fingerprint",

      mutate:
        (input: ReturnType<typeof validInput>) => {
          input.members[1] = {
            ...input.members[1],

            integrityFingerprint:
              "not-a-sha256",
          };
        },
    },
  ]
) {
  test(
    `Q14ag16A fails before Q14h for ${testCase.name}`,
    async () => {
      const mock =
        createSupabaseMock();

      const input =
        validInput(
          mock.supabase,
        );

      testCase.mutate(
        input,
      );

      await assert.rejects(
        () =>
          persistHsppEvidenceAssemblyReconstruction(
            input,
          ),
      );

      assert.equal(
        mock.calls.length,
        0,
      );
    },
  );
}


test(
  "Q14ag16A fails closed on a Q14h result that conflicts with the exact request",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow({
            child_assembly_id:
              "00000000-0000-0000-0000-000000000099",
          }),
        ],
      });

    await assert.rejects(
      () =>
        persistHsppEvidenceAssemblyReconstruction(
          validInput(
            mock.supabase,
          ),
        ),
      /conflicts with the exact request/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16A rejects internally inconsistent Q14h reconstruction counts",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow({
            retained_member_count:
              2,

            original_member_count:
              1,
          }),
        ],
      });

    await assert.rejects(
      () =>
        persistHsppEvidenceAssemblyReconstruction(
          validInput(
            mock.supabase,
          ),
        ),
      /conflicts with the exact request/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16A propagates Q14h RPC errors without retrying",
  async () => {
    const rpcError =
      new Error(
        "Q14h rejected reconstruction",
      );

    const mock =
      createSupabaseMock({
        data:
          null,

        error:
          rpcError,
      });

    await assert.rejects(
      () =>
        persistHsppEvidenceAssemblyReconstruction(
          validInput(
            mock.supabase,
          ),
        ),
      (error) =>
        error === rpcError,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);
