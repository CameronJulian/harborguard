import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_RPC,
  HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_VERSION,
  persistHsppEvidenceAssembly,
} from "../lib/hspp/persistHsppEvidenceAssembly";

function createSupabaseMock() {
  const calls: Array<{
    functionName: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase = {
    async rpc(functionName: string, args: Record<string, unknown>) {
      calls.push({
        functionName,
        args,
      });

      return {
        data: [
          {
            assembly_id: "assembly-1",

            organization_id: "org-1",

            assembly_version: "hspp-evidence-assembly-v1",

            membership_policy_version: "hspp-assembly-membership-v1",

            assembly_state: "OPEN",

            persisted_member_count: 2,
            persisted_membership_relation_count: 0,
          },
        ],
        error: null,
      };
    },
  };

  return {
    supabase,
    calls,
  };
}

test("B07C1 persists an OPEN assembly atomically through one RPC", async () => {
  const mock = createSupabaseMock();

  const result = await persistHsppEvidenceAssembly({
    supabase: mock.supabase as any,

    organizationId: "org-1",

    members: [
      {
        evidenceId: "11111111-1111-4111-8111-111111111111",

        integrityFingerprint: "a".repeat(64),
      },
      {
        evidenceId: "22222222-2222-4222-8222-222222222222",

        integrityFingerprint: "b".repeat(64),
      },
    ],
  });

  assert.equal(mock.calls.length, 1);

  assert.equal(
    mock.calls[0].functionName,
    HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_RPC,
  );

  assert.equal(
    result.persistenceVersion,
    HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_VERSION,
  );

  assert.equal(result.assemblyId, "assembly-1");

  assert.equal(result.assemblyState, "OPEN");

  assert.deepEqual(
    result.members.map((member) => member.memberOrdinal),
    [1, 2],
  );
});

test("B07C1 sends exact immutable evidence identities to the RPC", async () => {
  const mock = createSupabaseMock();

  await persistHsppEvidenceAssembly({
    supabase: mock.supabase as any,

    organizationId: "org-1",

    members: [
      {
        evidenceId: "11111111-1111-4111-8111-111111111111",

        integrityFingerprint: "a".repeat(64),
      },
      {
        evidenceId: "22222222-2222-4222-8222-222222222222",

        integrityFingerprint: "b".repeat(64),
      },
    ],
  });

  assert.deepEqual(mock.calls[0].args.p_members, [
    {
      evidenceId: "11111111-1111-4111-8111-111111111111",

      integrityFingerprint: "a".repeat(64),
    },
    {
      evidenceId: "22222222-2222-4222-8222-222222222222",

      integrityFingerprint: "b".repeat(64),
    },
  ]);
});

test("B07C1 rejects fewer than two members before RPC", async () => {
  const mock = createSupabaseMock();

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "org-1",

        members: [
          {
            evidenceId: "11111111-1111-4111-8111-111111111111",

            integrityFingerprint: "a".repeat(64),
          },
        ],
      }),
    /requires at least two members/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C1 rejects duplicate evidence identities before RPC", async () => {
  const mock = createSupabaseMock();

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "org-1",

        members: [
          {
            evidenceId: "11111111-1111-4111-8111-111111111111",

            integrityFingerprint: "a".repeat(64),
          },
          {
            evidenceId: "11111111-1111-4111-8111-111111111111",

            integrityFingerprint: "a".repeat(64),
          },
        ],
      }),
    /duplicate evidence identities/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C1 rejects invalid fingerprints before RPC", async () => {
  const mock = createSupabaseMock();

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "org-1",

        members: [
          {
            evidenceId: "11111111-1111-4111-8111-111111111111",

            integrityFingerprint: "invalid",
          },
          {
            evidenceId: "22222222-2222-4222-8222-222222222222",

            integrityFingerprint: "b".repeat(64),
          },
        ],
      }),
    /lowercase SHA-256 fingerprint/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C1 propagates RPC failure without a second application write", async () => {
  let callCount = 0;

  const supabase = {
    async rpc() {
      callCount += 1;

      return {
        data: null,
        error: new Error("member insert failed"),
      };
    },
  };

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: supabase as any,

        organizationId: "org-1",

        members: [
          {
            evidenceId: "11111111-1111-4111-8111-111111111111",

            integrityFingerprint: "a".repeat(64),
          },
          {
            evidenceId: "22222222-2222-4222-8222-222222222222",

            integrityFingerprint: "b".repeat(64),
          },
        ],
      }),
    /member insert failed/,
  );

  assert.equal(callCount, 1);
});
