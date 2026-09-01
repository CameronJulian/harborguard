import assert from "node:assert/strict";
import test from "node:test";

import {
  createHsppReservoirDownstreamSnapshotFromB07B,
  createHsppReservoirDownstreamSnapshotFromScheduledPairs,
} from "../lib/hspp/createHsppReservoirDownstreamSnapshot";

import type {
  RunHsppReservoirReevaluationResult,
} from "../lib/hspp/runHsppReservoirReevaluation";

import type {
  RunHsppReservoirScheduledPairReevaluationResult,
} from "../lib/hspp/runHsppReservoirScheduledPairReevaluation";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";


function semanticCandidate() {
  return {
    evidenceId:
      "00000000-0000-4000-8000-000000000001",

    operationalRead: {
      evidence: {
        id:
          "00000000-0000-4000-8000-000000000001",
      },
    },

    hasAssemblyMembership:
      false,

    membershipClassification:
      "NEVER_ASSEMBLED",

    reservoirDecision: {
      eligible:
        true,
    },
  };
}


function semanticReevaluation() {
  return {
    policyVersion:
      "hspp-reservoir-reevaluation-v1",

    state:
      "NO_COUNTERPART",

    candidateCount:
      1,

    comparisonCount:
      0,

    comparisonLimit:
      100,

    evaluations: [],

    assemblyCandidates: [],
  };
}


test(
  "B07B adapter emits only the neutral organization/candidates/reevaluation shape",
  () => {
    const candidate =
      semanticCandidate();

    const candidates = [
      candidate,
    ];

    const reevaluation =
      semanticReevaluation();


    const input = {
      runnerVersion:
        "b07b-test-runner",

      discoveryPolicyVersion:
        "discovery-test-policy",

      reevaluationPolicyVersion:
        "reevaluation-test-policy",

      discovery: {
        organizationId:
          ORGANIZATION_ID,

        candidates,

        scheduling: {
          ignored:
            true,
        },

        rawEvidenceCount:
          999,
      },

      reevaluation,
    } as unknown as
      RunHsppReservoirReevaluationResult;


    const snapshot =
      createHsppReservoirDownstreamSnapshotFromB07B(
        input,
      );


    assert.deepEqual(
      Object.keys(snapshot).sort(),
      [
        "candidates",
        "organizationId",
        "reevaluation",
      ],
    );

    assert.equal(
      snapshot.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      snapshot.candidates,
      candidates,
    );

    assert.equal(
      snapshot.reevaluation,
      reevaluation,
    );

    assert.equal(
      "discovery" in snapshot,
      false,
    );

    assert.equal(
      "pairPage" in snapshot,
      false,
    );

    assert.equal(
      "rawEvidenceCount" in snapshot,
      false,
    );
  },
);


test(
  "scheduled-pair adapter emits the identical neutral semantic shape",
  () => {
    const candidate =
      semanticCandidate();

    const eligibleEvidence = [
      candidate,
    ];

    const reevaluation =
      semanticReevaluation();


    const input = {
      runnerVersion:
        "pair-runner-test",

      pairPage: {
        organizationId:
          ORGANIZATION_ID,

        pairs: [],

        expectedCursor: {
          ignored:
            true,
        },

        proposedCursor: {
          ignored:
            true,
        },
      },

      endpointEvidenceIds: [
        candidate.evidenceId,
      ],

      eligibleEvidence,

      reevaluation,
    } as unknown as
      RunHsppReservoirScheduledPairReevaluationResult;


    const snapshot =
      createHsppReservoirDownstreamSnapshotFromScheduledPairs(
        input,
      );


    assert.deepEqual(
      Object.keys(snapshot).sort(),
      [
        "candidates",
        "organizationId",
        "reevaluation",
      ],
    );

    assert.equal(
      snapshot.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      snapshot.candidates,
      eligibleEvidence,
    );

    assert.equal(
      snapshot.reevaluation,
      reevaluation,
    );

    assert.equal(
      "pairPage" in snapshot,
      false,
    );

    assert.equal(
      "endpointEvidenceIds" in snapshot,
      false,
    );

    assert.equal(
      "expectedCursor" in snapshot,
      false,
    );

    assert.equal(
      "proposedCursor" in snapshot,
      false,
    );
  },
);


test(
  "B07B and scheduled-pair adapters produce equivalent semantic snapshot shape",
  () => {
    const candidate =
      semanticCandidate();

    const candidates = [
      candidate,
    ];

    const reevaluation =
      semanticReevaluation();


    const b07b =
      createHsppReservoirDownstreamSnapshotFromB07B(
        {
          discovery: {
            organizationId:
              ORGANIZATION_ID,

            candidates,
          },

          reevaluation,
        } as unknown as
          RunHsppReservoirReevaluationResult,
      );


    const pair =
      createHsppReservoirDownstreamSnapshotFromScheduledPairs(
        {
          pairPage: {
            organizationId:
              ORGANIZATION_ID,
          },

          eligibleEvidence:
            candidates,

          reevaluation,
        } as unknown as
          RunHsppReservoirScheduledPairReevaluationResult,
      );


    assert.deepEqual(
      Object.keys(b07b).sort(),
      Object.keys(pair).sort(),
    );

    assert.equal(
      b07b.organizationId,
      pair.organizationId,
    );

    assert.equal(
      b07b.candidates,
      pair.candidates,
    );

    assert.equal(
      b07b.reevaluation,
      pair.reevaluation,
    );

    assert.deepEqual(
      b07b,
      pair,
    );
  },
);


test(
  "adapters do not mutate producer results",
  () => {
    const b07bInput = {
      discovery: {
        organizationId:
          ORGANIZATION_ID,

        candidates: [],
      },

      reevaluation:
        semanticReevaluation(),
    } as unknown as
      RunHsppReservoirReevaluationResult;


    const pairInput = {
      pairPage: {
        organizationId:
          ORGANIZATION_ID,
      },

      eligibleEvidence: [],

      reevaluation:
        semanticReevaluation(),
    } as unknown as
      RunHsppReservoirScheduledPairReevaluationResult;


    const b07bBefore =
      JSON.stringify(
        b07bInput,
      );

    const pairBefore =
      JSON.stringify(
        pairInput,
      );


    createHsppReservoirDownstreamSnapshotFromB07B(
      b07bInput,
    );

    createHsppReservoirDownstreamSnapshotFromScheduledPairs(
      pairInput,
    );


    assert.equal(
      JSON.stringify(
        b07bInput,
      ),
      b07bBefore,
    );

    assert.equal(
      JSON.stringify(
        pairInput,
      ),
      pairBefore,
    );
  },
);