import assert from "node:assert/strict";
import test from "node:test";

import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";

import {
  HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION,
  runHsppReservoirReconstruction,
} from "@/lib/hspp/runHsppReservoirReconstruction";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const OTHER_ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000099";

const CHILD_ID =
  "20000000-0000-4000-8000-000000000001";


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


const MEMBERSHIP_POLICY =
  "hspp-assembly-membership-v1";

const SECOND_MEMBERSHIP_POLICY =
  "hspp-assembly-membership-v2";

const RECONSTRUCTION_POLICY =
  "hspp-reconstruction-policy-v1";

const RECONSTRUCTION_REASON =
  "REPLACE_UNSUITABLE_MEMBER";


function candidate(
  evidenceId: string,
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

        integrityFingerprint:
          "a".repeat(64),
      },
    },

    hasAssemblyMembership:
      membershipClassification ===
      "CURRENT_EFFECTIVE",

    membershipClassification,

    reservoirDecision: {
      policyVersion:
        "hspp-reservoir-eligibility-v1",

      eligible:
        true,

      reason:
        "RESERVOIR_ELIGIBLE",
    },
  } as unknown as HsppReservoirCandidate;
}


function pair(
  firstEvidenceId: string,
  secondEvidenceId: string,
  policyVersion:
    string =
      MEMBERSHIP_POLICY,
  eligible:
    boolean =
      true,
) {
  return {
    firstEvidenceId,

    secondEvidenceId,

    membershipDecision: {
      eligible,

      policyVersion,

      reason:
        "TEST_MEMBERSHIP",

      distanceMeters:
        null,

      timeDeltaMs:
        null,
    },
  };
}


function lifeguardResult({
  candidates,
  assemblyCandidates,
  state =
    "ASSEMBLY_CANDIDATE",
  organizationId =
    ORGANIZATION_ID,
  discoveryOrganizationId =
    ORGANIZATION_ID,
}: {
  candidates:
    HsppReservoirCandidate[];

  assemblyCandidates:
    ReturnType<typeof pair>[];

  state?:
    "NO_COUNTERPART"
    | "MEMBERSHIP_DENIED"
    | "ASSEMBLY_CANDIDATE";

  organizationId?:
    string;

  discoveryOrganizationId?:
    string;
}): RunHsppReservoirReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      "hspp-reservoir-discovery-v1",

    reevaluationPolicyVersion:
      "hspp-reservoir-reevaluation-v1",

    organizationId,

    discovery: {
      policyVersion:
        "hspp-reservoir-discovery-v1",

      organizationId:
        discoveryOrganizationId,

      requestedLimit:
        100,

      candidates,
    },

    reevaluation: {
      policyVersion:
        "hspp-reservoir-reevaluation-v1",

      state,

      candidateCount:
        candidates.length,

      comparisonCount:
        assemblyCandidates.length,

      comparisonLimit:
        100,

      evaluations:
        assemblyCandidates,

      assemblyCandidates,
    },
  } as unknown as RunHsppReservoirReevaluationResult;
}


type RpcCall = {
  name: string;

  args:
    Record<string, unknown>;
};


function makeRpcOnlySupabase({
  recoveryResponses =
    [
      [],
      [],
    ],
  contextResponse =
    [],
}: {
  recoveryResponses?:
    unknown[][];

  contextResponse?:
    unknown[];
} = {}) {
  const calls:
    RpcCall[] =
    [];

  let recoveryIndex =
    0;


  const client = {
    rpc: async (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({
        name,
        args,
      });


      if (
        name ===
        "read_hspp_evidence_assembly_reconstruction_recovery"
      ) {
        const data =
          recoveryResponses[
            recoveryIndex
          ] ?? [];

        recoveryIndex +=
          1;

        return {
          data,

          error:
            null,
        };
      }


      if (
        name ===
        "read_hspp_historical_reconstruction_contexts"
      ) {
        return {
          data:
            contextResponse,

          error:
            null,
        };
      }


      throw new Error(
        `Unexpected RPC ${name}`,
      );
    },
  };


  return {
    client:
      client as any,

    calls,
  };
}


function reconstructionInput(
  reevaluationResult:
    RunHsppReservoirReevaluationResult,
  supabase:
    any,
) {
  return {
    supabase,

    organizationId:
      ORGANIZATION_ID,

    childAssemblyId:
      CHILD_ID,

    reevaluationResult,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY,

    reconstructionReason:
      RECONSTRUCTION_REASON,
  };
}


test(
  "Q14ag26 returns NO_RECONSTRUCTION_CANDIDATE with zero external reads when B07A has no candidates",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    const result =
      await runHsppReservoirReconstruction(
        reconstructionInput(
          lifeguardResult({
            candidates: [
              candidate(
                A,
                "NEVER_ASSEMBLED",
              ),
            ],

            assemblyCandidates:
              [],

            state:
              "MEMBERSHIP_DENIED",
          }),
          mock.client,
        ),
      );

    assert.deepEqual(
      result,
      {
        runnerVersion:
          HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION,

        state:
          "NO_RECONSTRUCTION_CANDIDATE",

        organizationId:
          ORGANIZATION_ID,

        childAssemblyId:
          CHILD_ID,

        selectedEvidenceIds:
          [],

        historicalEvidenceId:
          null,

        replacementEvidenceId:
          null,

        membershipPolicyVersion:
          null,

        reconstructionPolicyVersion:
          RECONSTRUCTION_POLICY,

        reconstructionReason:
          RECONSTRUCTION_REASON,

        parentAssemblyId:
          null,

        reconstructionId:
          null,

        assemblyState:
          null,

        idempotentRecovery:
          null,

        memberCount:
          null,
      },
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 leaves fresh NEVER plus NEVER assembly candidates to B07C2",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    const result =
      await runHsppReservoirReconstruction(
        reconstructionInput(
          lifeguardResult({
            candidates: [
              candidate(
                A,
                "NEVER_ASSEMBLED",
              ),

              candidate(
                B,
                "NEVER_ASSEMBLED",
              ),
            ],

            assemblyCandidates: [
              pair(
                A,
                B,
              ),
            ],
          }),
          mock.client,
        ),
      );

    assert.equal(
      result.state,
      "NO_RECONSTRUCTION_CANDIDATE",
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 scans existing deterministic B07A order and chooses the first reconstruction lifecycle pair",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    const result =
      await runHsppReservoirReconstruction(
        reconstructionInput(
          lifeguardResult({
            candidates: [
              candidate(
                A,
                "NEVER_ASSEMBLED",
              ),

              candidate(
                B,
                "NEVER_ASSEMBLED",
              ),

              candidate(
                C,
                "HISTORICAL_NOT_CURRENT",
              ),

              candidate(
                C2,
                "NEVER_ASSEMBLED",
              ),

              candidate(
                D,
                "NEVER_ASSEMBLED",
              ),
            ],

            assemblyCandidates: [
              pair(
                A,
                B,
                MEMBERSHIP_POLICY,
              ),

              pair(
                C,
                C2,
                SECOND_MEMBERSHIP_POLICY,
              ),

              pair(
                C,
                D,
                "should-not-be-selected",
              ),
            ],
          }),
          mock.client,
        ),
      );

    assert.equal(
      result.state,
      "NO_RECONSTRUCTION_CONTEXT",
    );

    assert.deepEqual(
      result.selectedEvidenceIds,
      [
        C,
        C2,
      ],
    );

    assert.equal(
      result.historicalEvidenceId,
      C,
    );

    assert.equal(
      result.replacementEvidenceId,
      C2,
    );

    assert.equal(
      result.membershipPolicyVersion,
      SECOND_MEMBERSHIP_POLICY,
    );


    assert.equal(
      mock.calls.length,
      3,
    );


    assert.equal(
      mock.calls[0].name,
      "read_hspp_evidence_assembly_reconstruction_recovery",
    );

    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_child_assembly_id:
          CHILD_ID,
      },
    );


    assert.equal(
      mock.calls[1].name,
      "read_hspp_historical_reconstruction_contexts",
    );

    assert.deepEqual(
      mock.calls[1].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_evidence_ids: [
          C,
        ],
      },
    );


    assert.equal(
      mock.calls[2].name,
      "read_hspp_evidence_assembly_reconstruction_recovery",
    );
  },
);


test(
  "Q14ag26 normalizes reverse B07A orientation to historical and replacement roles without changing pair order",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    const result =
      await runHsppReservoirReconstruction(
        reconstructionInput(
          lifeguardResult({
            candidates: [
              candidate(
                C,
                "HISTORICAL_NOT_CURRENT",
              ),

              candidate(
                C2,
                "NEVER_ASSEMBLED",
              ),
            ],

            assemblyCandidates: [
              pair(
                C2,
                C,
              ),
            ],
          }),
          mock.client,
        ),
      );

    assert.equal(
      result.state,
      "NO_RECONSTRUCTION_CONTEXT",
    );

    assert.deepEqual(
      result.selectedEvidenceIds,
      [
        C2,
        C,
      ],
    );

    assert.equal(
      result.historicalEvidenceId,
      C,
    );

    assert.equal(
      result.replacementEvidenceId,
      C2,
    );

    assert.deepEqual(
      mock.calls[1].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_evidence_ids: [
          C,
        ],
      },
    );
  },
);


test(
  "Q14ag26 performs only one bounded recovery recheck after missing actionable context",
  async () => {
    const mock =
      makeRpcOnlySupabase({
        recoveryResponses: [
          [],
          [],
          [],
        ],
      });

    await runHsppReservoirReconstruction(
      reconstructionInput(
        lifeguardResult({
          candidates: [
            candidate(
              C,
              "HISTORICAL_NOT_CURRENT",
            ),

            candidate(
              C2,
              "NEVER_ASSEMBLED",
            ),
          ],

          assemblyCandidates: [
            pair(
              C,
              C2,
            ),
          ],
        }),
        mock.client,
      ),
    );


    const recoveryCalls =
      mock.calls.filter(
        (call) =>
          call.name ===
          "read_hspp_evidence_assembly_reconstruction_recovery",
      );


    const contextCalls =
      mock.calls.filter(
        (call) =>
          call.name ===
          "read_hspp_historical_reconstruction_contexts",
      );


    assert.equal(
      recoveryCalls.length,
      2,
    );

    assert.equal(
      contextCalls.length,
      1,
    );
  },
);


test(
  "Q14ag26 fails before external reads when the B07B runner organization conflicts",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              organizationId:
                OTHER_ORGANIZATION_ID,

              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /runner organization does not match/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 fails before external reads when B07B discovery organization conflicts",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              discoveryOrganizationId:
                OTHER_ORGANIZATION_ID,

              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /discovery organization does not match/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 fails closed if an assembly candidate does not resolve to discovery evidence",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /must resolve to exactly one discovery candidate/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 fails closed on duplicate discovery identity used by the selected pair",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /must resolve to exactly one discovery candidate/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 rejects an ineligible pair inside B07A assemblyCandidates",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                  MEMBERSHIP_POLICY,
                  false,
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /must preserve an eligible membership decision/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 rejects blank selected membership policy before recovery preflight",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                  " ",
                ),
              ],
            }),
            mock.client,
          ),
        ),
      /selected\.membershipDecision\.policyVersion must be a non-empty string/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 rejects inconsistent non-candidate B07A state with candidate rows",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],

              state:
                "MEMBERSHIP_DENIED",
            }),
            mock.client,
          ),
        ),
      /non-candidate state cannot expose assembly candidates/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 rejects ASSEMBLY_CANDIDATE state with no candidate rows",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReservoirReconstruction(
          reconstructionInput(
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                ),
              ],

              assemblyCandidates:
                [],
            }),
            mock.client,
          ),
        ),
      /must expose at least one assembly candidate/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag26 rejects blank bridge scalar inputs before any external read",
  async () => {
    const mock =
      makeRpcOnlySupabase();

    const reevaluationResult =
      lifeguardResult({
        candidates: [
          candidate(
            C,
            "HISTORICAL_NOT_CURRENT",
          ),

          candidate(
            C2,
            "NEVER_ASSEMBLED",
          ),
        ],

        assemblyCandidates: [
          pair(
            C,
            C2,
          ),
        ],
      });


    await assert.rejects(
      () =>
        runHsppReservoirReconstruction({
          ...reconstructionInput(
            reevaluationResult,
            mock.client,
          ),

          organizationId:
            " ",
        }),
      /organizationId must be a non-empty string/,
    );


    await assert.rejects(
      () =>
        runHsppReservoirReconstruction({
          ...reconstructionInput(
            reevaluationResult,
            mock.client,
          ),

          childAssemblyId:
            "",
        }),
      /childAssemblyId must be a non-empty string/,
    );


    await assert.rejects(
      () =>
        runHsppReservoirReconstruction({
          ...reconstructionInput(
            reevaluationResult,
            mock.client,
          ),

          reconstructionPolicyVersion:
            " ",
        }),
      /reconstructionPolicyVersion must be a non-empty string/,
    );


    await assert.rejects(
      () =>
        runHsppReservoirReconstruction({
          ...reconstructionInput(
            reevaluationResult,
            mock.client,
          ),

          reconstructionReason:
            "",
        }),
      /reconstructionReason must be a non-empty string/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);
