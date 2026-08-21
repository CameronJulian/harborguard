import assert from "node:assert/strict";
import test from "node:test";

import { persistHsppEvidenceAssembly } from "../lib/hspp/persistHsppEvidenceAssembly";

const organizationId = "11111111-1111-4111-8111-111111111111";

const firstEvidenceId = "22222222-2222-4222-8222-222222222222";

const secondEvidenceId = "33333333-3333-4333-8333-333333333333";

const assemblyId = "44444444-4444-4444-8444-444444444444";

const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

test("B07C1 passes exact B11A2 membership provenance through the atomic RPC", async () => {
  let calledRpc = "";
  let calledArgs: Record<string, unknown> | null = null;

  const supabase = {
    rpc: async (rpc: string, args: Record<string, unknown>) => {
      calledRpc = rpc;
      calledArgs = args;

      return {
        data: {
          assembly_id: assemblyId,
          organization_id: organizationId,
          assembly_version: "hspp-evidence-assembly-v1",
          membership_policy_version: "hspp-assembly-membership-v1",
          assembly_state: "OPEN",
          persisted_member_count: 2,
          persisted_membership_relation_count: 1,
        },
        error: null,
      };
    },
  };

  const result = await persistHsppEvidenceAssembly({
    supabase: supabase as never,

    organizationId,

    members: [
      {
        evidenceId: firstEvidenceId,
        integrityFingerprint: fingerprintA,
      },
      {
        evidenceId: secondEvidenceId,
        integrityFingerprint: fingerprintB,
      },
    ],

    membershipRelation: {
      firstEvidenceId,
      secondEvidenceId,

      membershipEligible: true,

      membershipPolicyVersion: "hspp-assembly-membership-v1",

      membershipReason: "ELIGIBLE",

      distanceMeters: 125.5,
      timeDeltaMs: 45000,
    },
  });

  assert.equal(calledRpc, "persist_hspp_evidence_assembly");

  assert.notEqual(calledArgs, null);

  const rpcArgs = calledArgs as unknown as Record<string, unknown>;

  assert.deepEqual(rpcArgs.p_membership_relation, {
    firstEvidenceId,
    secondEvidenceId,
    membershipEligible: true,
    membershipPolicyVersion: "hspp-assembly-membership-v1",
    membershipReason: "ELIGIBLE",
    distanceMeters: 125.5,
    timeDeltaMs: 45000,
  });

  assert.deepEqual(result.membershipRelation, {
    firstEvidenceId,
    secondEvidenceId,
    membershipEligible: true,
    membershipPolicyVersion: "hspp-assembly-membership-v1",
    membershipReason: "ELIGIBLE",
    distanceMeters: 125.5,
    timeDeltaMs: 45000,
  });
});

test("B07C1 rejects membership provenance that references evidence outside the assembly", async () => {
  let rpcCalled = false;

  const supabase = {
    rpc: async () => {
      rpcCalled = true;

      return {
        data: null,
        error: null,
      };
    },
  };

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: supabase as never,

        organizationId,

        members: [
          {
            evidenceId: firstEvidenceId,
            integrityFingerprint: fingerprintA,
          },
          {
            evidenceId: secondEvidenceId,
            integrityFingerprint: fingerprintB,
          },
        ],

        membershipRelation: {
          firstEvidenceId,
          secondEvidenceId: "55555555-5555-4555-8555-555555555555",

          membershipEligible: true,

          membershipPolicyVersion: "hspp-assembly-membership-v1",

          membershipReason: "ELIGIBLE",

          distanceMeters: 10,
          timeDeltaMs: 1000,
        },
      }),
    /must reference persisted assembly members/,
  );

  assert.equal(rpcCalled, false);
});

test("B07C1 rejects a non-eligible relation instead of fabricating eligibility", async () => {
  let rpcCalled = false;

  const supabase = {
    rpc: async () => {
      rpcCalled = true;

      return {
        data: null,
        error: null,
      };
    },
  };

  await assert.rejects(
    () =>
      persistHsppEvidenceAssembly({
        supabase: supabase as never,

        organizationId,

        members: [
          {
            evidenceId: firstEvidenceId,
            integrityFingerprint: fingerprintA,
          },
          {
            evidenceId: secondEvidenceId,
            integrityFingerprint: fingerprintB,
          },
        ],

        membershipRelation: {
          firstEvidenceId,
          secondEvidenceId,

          membershipEligible: false,

          membershipPolicyVersion: "hspp-assembly-membership-v1",

          membershipReason: "SAME_PROVIDER",

          distanceMeters: null,
          timeDeltaMs: null,
        },
      }),
    /must be membership eligible/,
  );

  assert.equal(rpcCalled, false);
});
