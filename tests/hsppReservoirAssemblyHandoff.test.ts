import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,
  persistHsppReservoirAssemblyCandidate,
} from "../lib/hspp/persistHsppReservoirAssemblyCandidate";

function lifeguardResult(
  state:
    | "ASSEMBLY_CANDIDATE"
    | "MEMBERSHIP_DENIED"
    | "NO_COUNTERPART" = "ASSEMBLY_CANDIDATE",
) {
  const firstFingerprint = "a".repeat(64);
  const secondFingerprint = "b".repeat(64);
  const thirdFingerprint = "c".repeat(64);

  const candidates = [
    {
      evidenceId: "11111111-1111-4111-8111-111111111111",

      operationalRead: {
        evidence: {
          id: "11111111-1111-4111-8111-111111111111",

          integrityFingerprint: firstFingerprint,
        },
      },

      hasAssemblyMembership: false,

      reservoirDecision: {
        eligible: true,
      },
    },

    {
      evidenceId: "22222222-2222-4222-8222-222222222222",

      operationalRead: {
        evidence: {
          id: "22222222-2222-4222-8222-222222222222",

          integrityFingerprint: secondFingerprint,
        },
      },

      hasAssemblyMembership: false,

      reservoirDecision: {
        eligible: true,
      },
    },

    {
      evidenceId: "33333333-3333-4333-8333-333333333333",

      operationalRead: {
        evidence: {
          id: "33333333-3333-4333-8333-333333333333",

          integrityFingerprint: thirdFingerprint,
        },
      },

      hasAssemblyMembership: false,

      reservoirDecision: {
        eligible: true,
      },
    },
  ];

  const assemblyCandidates =
    state === "ASSEMBLY_CANDIDATE"
      ? [
          {
            firstEvidenceId: "11111111-1111-4111-8111-111111111111",

            secondEvidenceId: "22222222-2222-4222-8222-222222222222",

            membershipDecision: {
              policyVersion: "hspp-assembly-membership-v1",

              eligible: true,

              reason: "ELIGIBLE",

              distanceMeters: 25,

              timeDeltaMs: 1000,
            },
          },

          {
            firstEvidenceId: "11111111-1111-4111-8111-111111111111",

            secondEvidenceId: "33333333-3333-4333-8333-333333333333",

            membershipDecision: {
              policyVersion: "hspp-assembly-membership-v1",

              eligible: true,

              reason: "ELIGIBLE",

              distanceMeters: 30,

              timeDeltaMs: 2000,
            },
          },
        ]
      : [];

  return {
    runnerVersion: "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion: "hspp-reservoir-discovery-v1",

    reevaluationPolicyVersion: "hspp-reservoir-reevaluation-v1",

    organizationId: "org-1",

    discovery: {
      policyVersion: "hspp-reservoir-discovery-v1",

      organizationId: "org-1",

      requestedLimit: 100,

      candidates,
    },

    reevaluation: {
      policyVersion: "hspp-reservoir-reevaluation-v1",

      state,

      candidateCount: candidates.length,

      comparisonCount: assemblyCandidates.length,

      comparisonLimit: 100,

      evaluations: assemblyCandidates,

      assemblyCandidates,
    },
  };
}

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

test("B07C2 persists only the first deterministic Lifeguard assembly candidate", async () => {
  const mock = createSupabaseMock();

  const result = await persistHsppReservoirAssemblyCandidate({
    supabase: mock.supabase as any,

    lifeguardResult: lifeguardResult() as any,
  });

  assert.equal(result.handoffVersion, HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION);

  assert.equal(result.state, "ASSEMBLY_PERSISTED");

  assert.equal(mock.calls.length, 1);

  assert.deepEqual(result.selectedEvidenceIds, [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ]);

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

  assert.equal(
    mock.calls[0].args.p_membership_policy_version,
    "hspp-assembly-membership-v1",
  );
});

for (const state of ["NO_COUNTERPART", "MEMBERSHIP_DENIED"] as const) {
  test(`B07C2 performs no write for ${state}`, async () => {
    const mock = createSupabaseMock();

    const result = await persistHsppReservoirAssemblyCandidate({
      supabase: mock.supabase as any,

      lifeguardResult: lifeguardResult(state) as any,
    });

    assert.equal(result.state, "NO_ASSEMBLY_CANDIDATE");

    assert.equal(result.assembly, null);

    assert.deepEqual(result.selectedEvidenceIds, []);

    assert.equal(mock.calls.length, 0);
  });
}

test("B07C2 fails closed when selected evidence is absent from discovery", async () => {
  const mock = createSupabaseMock();

  const input = lifeguardResult();

  input.discovery.candidates = input.discovery.candidates.filter(
    (candidate) =>
      candidate.evidenceId !== "22222222-2222-4222-8222-222222222222",
  );

  await assert.rejects(
    () =>
      persistHsppReservoirAssemblyCandidate({
        supabase: mock.supabase as any,

        lifeguardResult: input as any,
      }),

    /was not found in discovery candidates/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C2 fails closed when selected evidence has no persisted evidence", async () => {
  const mock = createSupabaseMock();

  const input = lifeguardResult();

  input.discovery.candidates[0].operationalRead.evidence = null as any;

  await assert.rejects(
    () =>
      persistHsppReservoirAssemblyCandidate({
        supabase: mock.supabase as any,

        lifeguardResult: input as any,
      }),

    /has no persisted evidence/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C2 fails closed when persisted evidence identity does not match discovery identity", async () => {
  const mock = createSupabaseMock();

  const input = lifeguardResult();

  input.discovery.candidates[0].operationalRead.evidence.id =
    "99999999-9999-4999-8999-999999999999";

  await assert.rejects(
    () =>
      persistHsppReservoirAssemblyCandidate({
        supabase: mock.supabase as any,

        lifeguardResult: input as any,
      }),

    /identity mismatch/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C2 fails closed when immutable fingerprint is absent", async () => {
  const mock = createSupabaseMock();

  const input = lifeguardResult();

  input.discovery.candidates[0].operationalRead.evidence.integrityFingerprint =
    "";

  await assert.rejects(
    () =>
      persistHsppReservoirAssemblyCandidate({
        supabase: mock.supabase as any,

        lifeguardResult: input as any,
      }),

    /no immutable integrity fingerprint/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C2 rejects organization provenance mismatch before persistence", async () => {
  const mock = createSupabaseMock();

  const input = lifeguardResult();

  input.discovery.organizationId = "org-2";

  await assert.rejects(
    () =>
      persistHsppReservoirAssemblyCandidate({
        supabase: mock.supabase as any,

        lifeguardResult: input as any,
      }),

    /discovery organization does not match/,
  );

  assert.equal(mock.calls.length, 0);
});
