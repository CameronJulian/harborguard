import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,
  persistHsppReservoirAssemblyCandidate,
  persistHsppReservoirAssemblyCandidateFromSnapshot,
} from "../lib/hspp/persistHsppReservoirAssemblyCandidate";

import {
  createHsppReservoirDownstreamSnapshotFromB07B,
  createHsppReservoirDownstreamSnapshotFromScheduledPairs,
} from "../lib/hspp/createHsppReservoirDownstreamSnapshot";

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

      membershipClassification: "NEVER_ASSEMBLED",

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

      membershipClassification: "NEVER_ASSEMBLED",

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

      membershipClassification: "NEVER_ASSEMBLED",

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
            persisted_membership_relation_count: 1,
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


for (
  const testCase of [
    {
      name: "first HISTORICAL_NOT_CURRENT member",
      first: "HISTORICAL_NOT_CURRENT",
      second: "NEVER_ASSEMBLED",
    },
    {
      name: "second HISTORICAL_NOT_CURRENT member",
      first: "NEVER_ASSEMBLED",
      second: "HISTORICAL_NOT_CURRENT",
    },
    {
      name: "two HISTORICAL_NOT_CURRENT members",
      first: "HISTORICAL_NOT_CURRENT",
      second: "HISTORICAL_NOT_CURRENT",
    },
    {
      name: "first CURRENT_EFFECTIVE member",
      first: "CURRENT_EFFECTIVE",
      second: "NEVER_ASSEMBLED",
    },
    {
      name: "second CURRENT_EFFECTIVE member",
      first: "NEVER_ASSEMBLED",
      second: "CURRENT_EFFECTIVE",
    },
  ] as const
) {
  test(
    `B07C2 fails closed before persistence for ${testCase.name}`,
    async () => {
      const mock = createSupabaseMock();

      const input = lifeguardResult();

      input.discovery.candidates[0].membershipClassification =
        testCase.first;

      input.discovery.candidates[1].membershipClassification =
        testCase.second;

      await assert.rejects(
        () =>
          persistHsppReservoirAssemblyCandidate({
            supabase: mock.supabase as any,
            lifeguardResult: input as any,
          }),
        /cannot use initial assembly persistence.*not NEVER_ASSEMBLED/,
      );

      assert.equal(
        mock.calls.length,
        0,
      );
    },
  );
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

// PERSISTENCE_NEUTRALIZATION_TESTS_V1

function neutralSnapshotFromB07B(
  input: ReturnType<
    typeof lifeguardResult
  >,
) {
  return createHsppReservoirDownstreamSnapshotFromB07B(
    input as any,
  );
}


for (
  const state of [
    "NO_COUNTERPART",
    "MEMBERSHIP_DENIED",
  ] as const
) {
  test(
    `legacy B07B wrapper and neutral core return identical no-candidate result for ${state}`,
    async () => {
      const input =
        lifeguardResult(
          state,
        );

      const legacyMock =
        createSupabaseMock();

      const neutralMock =
        createSupabaseMock();


      const legacy =
        await persistHsppReservoirAssemblyCandidate({
          supabase:
            legacyMock.supabase as any,

          lifeguardResult:
            input as any,
        });


      const neutral =
        await persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            neutralMock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        });


      assert.deepEqual(
        neutral,
        legacy,
      );

      assert.equal(
        legacyMock.calls.length,
        0,
      );

      assert.equal(
        neutralMock.calls.length,
        0,
      );
    },
  );
}


test(
  "legacy B07B wrapper and neutral core persist identical deterministic fresh pair",
  async () => {
    const input =
      lifeguardResult();

    const legacyMock =
      createSupabaseMock();

    const neutralMock =
      createSupabaseMock();


    const legacy =
      await persistHsppReservoirAssemblyCandidate({
        supabase:
          legacyMock.supabase as any,

        lifeguardResult:
          input as any,
      });


    const neutral =
      await persistHsppReservoirAssemblyCandidateFromSnapshot({
        supabase:
          neutralMock.supabase as any,

        snapshot:
          neutralSnapshotFromB07B(
            input,
          ),
      });


    assert.deepEqual(
      neutral,
      legacy,
    );

    assert.equal(
      legacy.state,
      "ASSEMBLY_PERSISTED",
    );

    assert.deepEqual(
      legacy.selectedEvidenceIds,
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    );

    assert.equal(
      legacyMock.calls.length,
      1,
    );

    assert.equal(
      neutralMock.calls.length,
      1,
    );

    assert.equal(
      neutralMock.calls[0]
        .functionName,
      legacyMock.calls[0]
        .functionName,
    );

    assert.deepEqual(
      neutralMock.calls[0]
        .args
        .p_members,
      legacyMock.calls[0]
        .args
        .p_members,
    );

    assert.equal(
      neutralMock.calls[0]
        .args
        .p_membership_policy_version,
      legacyMock.calls[0]
        .args
        .p_membership_policy_version,
    );
  },
);


for (
  const testCase of [
    {
      name:
        "first HISTORICAL_NOT_CURRENT member",

      first:
        "HISTORICAL_NOT_CURRENT",

      second:
        "NEVER_ASSEMBLED",
    },

    {
      name:
        "second HISTORICAL_NOT_CURRENT member",

      first:
        "NEVER_ASSEMBLED",

      second:
        "HISTORICAL_NOT_CURRENT",
    },

    {
      name:
        "CURRENT_EFFECTIVE member",

      first:
        "CURRENT_EFFECTIVE",

      second:
        "NEVER_ASSEMBLED",
    },
  ] as const
) {
  test(
    `neutral B07C2 core fails closed before persistence for ${testCase.name}`,
    async () => {
      const input =
        lifeguardResult();

      input.discovery
        .candidates[0]
        .membershipClassification =
        testCase.first;

      input.discovery
        .candidates[1]
        .membershipClassification =
        testCase.second;


      const mock =
        createSupabaseMock();


      await assert.rejects(
        () =>
          persistHsppReservoirAssemblyCandidateFromSnapshot({
            supabase:
              mock.supabase as any,

            snapshot:
              neutralSnapshotFromB07B(
                input,
              ),
          }),

        /cannot use initial assembly persistence.*not NEVER_ASSEMBLED/,
      );


      assert.equal(
        mock.calls.length,
        0,
      );
    },
  );
}


test(
  "neutral B07C2 core fails closed when selected evidence is absent",
  async () => {
    const input =
      lifeguardResult();

    input.discovery.candidates =
      input.discovery
        .candidates
        .filter(
          (candidate) =>
            candidate.evidenceId !==
            "22222222-2222-4222-8222-222222222222",
        );


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        }),

      /was not found in discovery candidates/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "neutral B07C2 core fails closed when selected evidence has no persisted evidence",
  async () => {
    const input =
      lifeguardResult();

    input.discovery
      .candidates[0]
      .operationalRead
      .evidence =
      null as any;


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        }),

      /has no persisted evidence/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "neutral B07C2 core fails closed when persisted evidence identity diverges",
  async () => {
    const input =
      lifeguardResult();

    input.discovery
      .candidates[0]
      .operationalRead
      .evidence
      .id =
      "99999999-9999-4999-8999-999999999999";


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        }),

      /identity mismatch/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "neutral B07C2 core fails closed when immutable fingerprint is absent",
  async () => {
    const input =
      lifeguardResult();

    input.discovery
      .candidates[0]
      .operationalRead
      .evidence
      .integrityFingerprint =
      "";


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        }),

      /no immutable integrity fingerprint/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "neutral B07C2 core fails closed for an ineligible selected membership decision",
  async () => {
    const input =
      lifeguardResult();


    input.reevaluation
      .assemblyCandidates[0]
      .membershipDecision
      .eligible =
      false;


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot:
            neutralSnapshotFromB07B(
              input,
            ),
        }),

      /not membership eligible/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "legacy B07B wrapper still rejects runner/discovery organization mismatch before adaptation",
  async () => {
    const input =
      lifeguardResult();


    input.discovery
      .organizationId =
      "org-2";


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidate({
          supabase:
            mock.supabase as any,

          lifeguardResult:
            input as any,
        }),

      /discovery organization does not match/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "legacy B07B wrapper still rejects blank runner organization before adaptation",
  async () => {
    const input =
      lifeguardResult();


    input.organizationId =
      "   ";


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidate({
          supabase:
            mock.supabase as any,

          lifeguardResult:
            input as any,
        }),

      /lifeguardResult\.organizationId is required/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "neutral B07C2 core rejects blank snapshot organization",
  async () => {
    const input =
      lifeguardResult();

    const snapshot = {
      ...neutralSnapshotFromB07B(
        input,
      ),

      organizationId:
        "   ",
    };


    const mock =
      createSupabaseMock();


    await assert.rejects(
      () =>
        persistHsppReservoirAssemblyCandidateFromSnapshot({
          supabase:
            mock.supabase as any,

          snapshot,
        }),

      /snapshot\.organizationId is required/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "ASSEMBLY_CANDIDATE without a selected pair preserves existing no-write B07C2 behavior",
  async () => {
    const input =
      lifeguardResult();


    input.reevaluation
      .assemblyCandidates =
      [];


    const legacyMock =
      createSupabaseMock();

    const neutralMock =
      createSupabaseMock();


    const legacy =
      await persistHsppReservoirAssemblyCandidate({
        supabase:
          legacyMock.supabase as any,

        lifeguardResult:
          input as any,
      });


    const neutral =
      await persistHsppReservoirAssemblyCandidateFromSnapshot({
        supabase:
          neutralMock.supabase as any,

        snapshot:
          neutralSnapshotFromB07B(
            input,
          ),
      });


    assert.deepEqual(
      neutral,
      legacy,
    );

    assert.equal(
      legacy.state,
      "NO_ASSEMBLY_CANDIDATE",
    );

    assert.equal(
      legacyMock.calls.length,
      0,
    );

    assert.equal(
      neutralMock.calls.length,
      0,
    );
  },
);


test(
  "scheduled-pair neutral adapter is directly compatible with neutral B07C2 core",
  async () => {
    const input =
      lifeguardResult();


    const scheduledPairResult = {
      pairPage: {
        organizationId:
          input.discovery
            .organizationId,
      },

      endpointEvidenceIds:
        input.discovery
          .candidates
          .map(
            (candidate) =>
              candidate.evidenceId,
          ),

      eligibleEvidence:
        input.discovery
          .candidates,

      reevaluation:
        input.reevaluation,
    };


    const snapshot =
      createHsppReservoirDownstreamSnapshotFromScheduledPairs(
        scheduledPairResult as any,
      );


    const mock =
      createSupabaseMock();


    const result =
      await persistHsppReservoirAssemblyCandidateFromSnapshot({
        supabase:
          mock.supabase as any,

        snapshot,
      });


    assert.equal(
      result.state,
      "ASSEMBLY_PERSISTED",
    );

    assert.deepEqual(
      result.selectedEvidenceIds,
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    );

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      mock.calls[0]
        .args
        .p_membership_policy_version,
      "hspp-assembly-membership-v1",
    );
  },
);