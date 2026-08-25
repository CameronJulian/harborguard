import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppPostPositiveRevalidationSelection,
} from "../lib/hspp/runHsppPostPositiveRevalidationSelection";

import type {
  HsppPostPositiveRevalidationEvaluation,
} from "../lib/hspp/evaluateHsppPostPositiveRevalidationEvidence";

import type {
  ReadHsppPostPositiveRevalidationCandidatesResult,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidates";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "../lib/hspp/readHsppPostPositiveLifecycleWorkItems";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID =
  "33333333-3333-4333-8333-333333333333";

const EVIDENCE_ID =
  "44444444-4444-4444-8444-444444444444";

const POSITIVE_CHECKPOINT_ID =
  "55555555-5555-4555-8555-555555555555";

const R1_A =
  "66666666-6666-4666-8666-666666666666";

const R1_B =
  "77777777-7777-4777-8777-777777777777";

const R1_C =
  "88888888-8888-4888-8888-888888888888";

const C_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const R1_FINGERPRINT =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const POSITIVE_AT =
  "2026-08-25T08:00:00.000Z";

const R1_AT =
  "2026-08-25T08:05:00.000Z";


function makeWorkItem(): HsppPostPositiveLifecycleWorkItem {
  return {
    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    membershipId:
      MEMBERSHIP_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      C_FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    workState:
      "REEVALUATION_REQUIRED",
  };
}


function makeCandidate(
  evidenceId: string,
  observedAt: string,
) {
  return {
    evidenceId,

    observedAt,

    readResult: {
      found:
        false as const,

      evidence:
        null,

      verification:
        null,
    },
  };
}


function makeDiscovery(
  evidenceIds: string[],
): ReadHsppPostPositiveRevalidationCandidatesResult {
  return {
    readerVersion:
      "hspp-post-positive-revalidation-candidate-reader-v1",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      C_FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    requestedLimit:
      25,

    candidates:
      evidenceIds.map(
        (
          evidenceId,
          index,
        ) =>
          makeCandidate(
            evidenceId,
            `2026-08-25T08:0${index + 5}:00.000Z`,
          ),
      ),
  };
}


function makeEvaluation(
  qualifies:
    boolean,

  revalidationEvidenceId:
    string,
): HsppPostPositiveRevalidationEvaluation {
  if (qualifies) {
    return {
      evaluatorVersion:
        "hspp-post-positive-revalidation-evaluator-v1",

      policyVersion:
        "hspp-post-positive-member-unsuitability-v2",

      persistenceReason:
        "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",

      state:
        "QUALIFYING_UNSUITABILITY_BASIS",

      reason:
        "R1_UNSUITABILITY_BASIS_CONFIRMED",

      qualifiesUnsuitability:
        true,

      organizationId:
        ORGANIZATION_ID,

      assemblyId:
        ASSEMBLY_ID,

      positiveCheckpointId:
        POSITIVE_CHECKPOINT_ID,

      evidenceId:
        EVIDENCE_ID,

      integrityFingerprint:
        C_FINGERPRINT,

      revalidationEvidenceId,

      revalidationIntegrityFingerprint:
        R1_FINGERPRINT,

      observedAt:
        R1_AT,
    };
  }


  return {
    evaluatorVersion:
      "hspp-post-positive-revalidation-evaluator-v1",

    policyVersion:
      "hspp-post-positive-member-unsuitability-v2",

    persistenceReason:
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",

    state:
      "NON_QUALIFYING_REVALIDATION",

    reason:
      "R1_PAYLOAD_DECISION_MISMATCH",

    qualifiesUnsuitability:
      false,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      C_FINGERPRINT,

    revalidationEvidenceId,

    revalidationIntegrityFingerprint:
      R1_FINGERPRINT,

    observedAt:
      R1_AT,
  };
}


test(
  "selection runner chooses first qualifying R1 in reader order and stops",
  async () => {
    const discovery =
      makeDiscovery([
        R1_A,
        R1_B,
        R1_C,
      ]);

    let readerCalls =
      0;

    let evaluatorCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),

          limit:
            3,
        },
        {
          readCandidates:
            async () => {
              readerCalls +=
                1;

              return discovery;
            },

          evaluateCandidate:
            () => {
              evaluatorCalls +=
                1;

              if (evaluatorCalls === 1) {
                return makeEvaluation(
                  false,
                  R1_A,
                );
              }

              if (evaluatorCalls === 2) {
                return makeEvaluation(
                  true,
                  R1_B,
                );
              }

              return makeEvaluation(
                true,
                R1_C,
              );
            },
        },
      );


    assert.equal(
      readerCalls,
      1,
    );

    assert.equal(
      evaluatorCalls,
      2,
    );

    assert.equal(
      result.status,
      "QUALIFYING_REVALIDATION_FOUND",
    );

    assert.equal(
      result.candidateCount,
      3,
    );

    assert.equal(
      result.evaluatedCount,
      2,
    );

    assert.deepEqual(
      result.selectedBasis,
      {
        revalidationEvidenceId:
          R1_B,

        revalidationIntegrityFingerprint:
          R1_FINGERPRINT,

        observedAt:
          R1_AT,

        policyVersion:
          "hspp-post-positive-member-unsuitability-v2",

        persistenceReason:
          "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
      },
    );
  },
);


test(
  "empty discovery returns NO_CANDIDATES without semantic evaluation",
  async () => {
    let evaluatorCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),
        },
        {
          readCandidates:
            async () =>
              makeDiscovery(
                [],
              ),

          evaluateCandidate:
            () => {
              evaluatorCalls +=
                1;

              return makeEvaluation(
                true,
                R1_A,
              );
            },
        },
      );


    assert.equal(
      evaluatorCalls,
      0,
    );

    assert.equal(
      result.status,
      "NO_CANDIDATES",
    );

    assert.equal(
      result.candidateCount,
      0,
    );

    assert.equal(
      result.evaluatedCount,
      0,
    );

    assert.equal(
      result.selectedBasis,
      null,
    );
  },
);


test(
  "all non-qualifying R1 candidates remain non-authoritative",
  async () => {
    const discovery =
      makeDiscovery([
        R1_A,
        R1_B,
      ]);

    let evaluatorCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),
        },
        {
          readCandidates:
            async () =>
              discovery,

          evaluateCandidate:
            () => {
              evaluatorCalls +=
                1;

              return makeEvaluation(
                false,
                evaluatorCalls === 1
                  ? R1_A
                  : R1_B,
              );
            },
        },
      );


    assert.equal(
      evaluatorCalls,
      2,
    );

    assert.equal(
      result.status,
      "NO_QUALIFYING_REVALIDATION",
    );

    assert.equal(
      result.candidateCount,
      2,
    );

    assert.equal(
      result.evaluatedCount,
      2,
    );

    assert.equal(
      result.selectedBasis,
      null,
    );
  },
);


test(
  "reader failure propagates without inventing a basis",
  async () => {
    await assert.rejects(
      runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),
        },
        {
          readCandidates:
            async () => {
              throw new Error(
                "controlled candidate discovery failure",
              );
            },

          evaluateCandidate:
            () =>
              makeEvaluation(
                true,
                R1_A,
              ),
        },
      ),
      /controlled candidate discovery failure/,
    );
  },
);


test(
  "qualifying semantic result must match selected candidate identity",
  async () => {
    const discovery =
      makeDiscovery([
        R1_A,
      ]);


    await assert.rejects(
      runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),
        },
        {
          readCandidates:
            async () =>
              discovery,

          evaluateCandidate:
            () =>
              makeEvaluation(
                true,
                R1_B,
              ),
        },
      ),
      /conflicts with its selected candidate identity/,
    );
  },
);


test(
  "selection runner fails closed on conflicting discovery authority",
  async () => {
    const discovery =
      makeDiscovery([
        R1_A,
      ]);

    discovery.assemblyId =
      "99999999-9999-4999-8999-999999999999";


    await assert.rejects(
      runHsppPostPositiveRevalidationSelection(
        {
          supabase:
            {} as never,

          workItem:
            makeWorkItem(),
        },
        {
          readCandidates:
            async () =>
              discovery,

          evaluateCandidate:
            () =>
              makeEvaluation(
                true,
                R1_A,
              ),
        },
      ),
      /conflicting lifecycle authority/,
    );
  },
);
