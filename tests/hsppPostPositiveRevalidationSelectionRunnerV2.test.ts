import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION,
  runHsppPostPositiveRevalidationSelectionV2,
} from "../lib/hspp/runHsppPostPositiveRevalidationSelectionV2";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidatesV2";


const ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000101";

const ASSEMBLY_ID =
  "00000000-0000-4000-8000-000000000102";

const POSITIVE_CHECKPOINT_ID =
  "00000000-0000-4000-8000-000000000103";

const EVIDENCE_ID =
  "00000000-0000-4000-8000-000000000104";

const R1_A =
  "00000000-0000-4000-8000-000000000201";

const R1_B =
  "00000000-0000-4000-8000-000000000202";

const R1_C =
  "00000000-0000-4000-8000-000000000203";

const SUBJECT_FINGERPRINT =
  "a".repeat(64);

const R1_FINGERPRINT =
  "b".repeat(64);

const POSITIVE_AT =
  "2026-08-25T00:00:00Z";


function makeWorkItem(
  overrides: Record<string, unknown> = {},
) {
  return {
    workState:
      "REEVALUATION_REQUIRED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      SUBJECT_FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    ...overrides,
  } as any;
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
        false,

      evidence:
        null,

      verification:
        null,
    },
  } as any;
}


function makeDiscovery(
  candidates: any[],
  overrides: Record<string, unknown> = {},
) {
  const finalCandidate =
    candidates.length === 0
      ? null
      : candidates[
          candidates.length - 1
        ];


  return {
    readerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      SUBJECT_FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    requestedLimit:
      25,

    expectedCursor:
      null,

    proposedCursor:
      finalCandidate === null
        ? null
        : {
            observedAt:
              finalCandidate.observedAt,

            evidenceId:
              finalCandidate.evidenceId,
          },

    candidates,

    ...overrides,
  } as any;
}


function nonQualifyingEvaluation() {
  return {
    qualifiesUnsuitability:
      false,

    state:
      "NOT_QUALIFYING",
  } as any;
}


function qualifyingEvaluation(
  evidenceId: string,
  observedAt: string,
) {
  return {
    qualifiesUnsuitability:
      true,

    state:
      "QUALIFYING_UNSUITABILITY_BASIS",

    reason:
      "R1_UNSUITABILITY_BASIS_CONFIRMED",

    revalidationEvidenceId:
      evidenceId,

    revalidationIntegrityFingerprint:
      R1_FINGERPRINT,

    observedAt,

    policyVersion:
      "hspp-post-positive-member-unsuitability-v2",

    persistenceReason:
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
  } as any;
}


function makeDependencies(
  discovery: any,
  evaluator: (input: any) => any,
) {
  const readerCalls:
    any[] =
      [];

  const evaluatorCalls:
    any[] =
      [];


  return {
    readerCalls,

    evaluatorCalls,

    dependencies: {
      readCandidates:
        async (
          input: any,
        ) => {
          readerCalls.push(
            input,
          );

          return discovery;
        },

      evaluateCandidate:
        (
          input: any,
        ) => {
          evaluatorCalls.push(
            input,
          );

          return evaluator(
            input,
          );
        },
    } as any,
  };
}


test(
  "Selection V2 chooses first qualifying R1 but preserves the whole-page cursor proposal",
  async () => {
    const discovery =
      makeDiscovery([
        makeCandidate(
          R1_A,
          "2026-08-25T01:00:00Z",
        ),

        makeCandidate(
          R1_B,
          "2026-08-25T02:00:00Z",
        ),

        makeCandidate(
          R1_C,
          "2026-08-25T03:00:00Z",
        ),
      ]);


    const mock =
      makeDependencies(
        discovery,
        () => {
          const callNumber =
            mock.evaluatorCalls.length;

          if (callNumber === 2) {
            return qualifyingEvaluation(
              R1_B,
              "2026-08-25T02:00:00Z",
            );
          }

          return nonQualifyingEvaluation();
        },
      );


    const result =
      await runHsppPostPositiveRevalidationSelectionV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),
        },
        mock.dependencies,
      );


    assert.equal(
      result.runnerVersion,
      HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION,
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

    assert.equal(
      mock.evaluatorCalls.length,
      2,
    );

    assert.equal(
      result.selectedBasis?.revalidationEvidenceId,
      R1_B,
    );


    assert.deepEqual(
      result.proposedCursor,
      {
        observedAt:
          "2026-08-25T03:00:00Z",

        evidenceId:
          R1_C,
      },
    );
  },
);


test(
  "Selection V2 preserves a wrapped expected cursor while first qualifying selection remains deterministic",
  async () => {
    const expectedCursor =
      {
        observedAt:
          "2026-08-25T02:00:00Z",

        evidenceId:
          R1_B,
      };


    const discovery =
      makeDiscovery(
        [
          makeCandidate(
            R1_C,
            "2026-08-25T03:00:00Z",
          ),

          makeCandidate(
            R1_A,
            "2026-08-25T01:00:00Z",
          ),
        ],
        {
          expectedCursor,
        },
      );


    const mock =
      makeDependencies(
        discovery,
        () =>
          qualifyingEvaluation(
            R1_C,
            "2026-08-25T03:00:00Z",
          ),
      );


    const result =
      await runHsppPostPositiveRevalidationSelectionV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),
        },
        mock.dependencies,
      );


    assert.equal(
      result.evaluatedCount,
      1,
    );

    assert.deepEqual(
      result.expectedCursor,
      expectedCursor,
    );

    assert.deepEqual(
      result.proposedCursor,
      {
        observedAt:
          "2026-08-25T01:00:00Z",

        evidenceId:
          R1_A,
      },
    );
  },
);


test(
  "all non-qualifying candidates evaluate completely and preserve page cursor progress",
  async () => {
    const discovery =
      makeDiscovery([
        makeCandidate(
          R1_A,
          "2026-08-25T01:00:00Z",
        ),

        makeCandidate(
          R1_B,
          "2026-08-25T02:00:00Z",
        ),
      ]);


    const mock =
      makeDependencies(
        discovery,
        () =>
          nonQualifyingEvaluation(),
      );


    const result =
      await runHsppPostPositiveRevalidationSelectionV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),
        },
        mock.dependencies,
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

    assert.deepEqual(
      result.proposedCursor,
      {
        observedAt:
          "2026-08-25T02:00:00Z",

        evidenceId:
          R1_B,
      },
    );
  },
);


test(
  "empty page returns NO_CANDIDATES preserves expected cursor and performs no evaluation",
  async () => {
    const expectedCursor =
      {
        observedAt:
          "2026-08-25T02:00:00Z",

        evidenceId:
          R1_B,
      };


    const discovery =
      makeDiscovery(
        [],
        {
          expectedCursor,
        },
      );


    const mock =
      makeDependencies(
        discovery,
        () => {
          throw new Error(
            "evaluator must not run",
          );
        },
      );


    const result =
      await runHsppPostPositiveRevalidationSelectionV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),
        },
        mock.dependencies,
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
      mock.evaluatorCalls.length,
      0,
    );

    assert.deepEqual(
      result.expectedCursor,
      expectedCursor,
    );

    assert.equal(
      result.proposedCursor,
      null,
    );
  },
);


test(
  "Selection V2 fails closed on conflicting discovery authority",
  async () => {
    const discovery =
      makeDiscovery(
        [],
        {
          assemblyId:
            "99999999-9999-4999-8999-999999999999",
        },
      );


    const mock =
      makeDependencies(
        discovery,
        () =>
          nonQualifyingEvaluation(),
      );


    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationSelectionV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /conflicting lifecycle authority/i,
    );


    assert.equal(
      mock.evaluatorCalls.length,
      0,
    );
  },
);


test(
  "Selection V2 rejects unsupported reader version",
  async () => {
    const discovery =
      makeDiscovery(
        [],
        {
          readerVersion:
            "unsupported-reader-version",
        },
      );


    const mock =
      makeDependencies(
        discovery,
        () =>
          nonQualifyingEvaluation(),
      );


    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationSelectionV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /unsupported candidate reader version/i,
    );
  },
);


test(
  "qualifying semantic identity must match the selected candidate",
  async () => {
    const discovery =
      makeDiscovery([
        makeCandidate(
          R1_A,
          "2026-08-25T01:00:00Z",
        ),
      ]);


    const mock =
      makeDependencies(
        discovery,
        () =>
          qualifyingEvaluation(
            R1_B,
            "2026-08-25T01:00:00Z",
          ),
      );


    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationSelectionV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /conflicts with its selected candidate identity/i,
    );
  },
);


test(
  "non-empty page must preserve final-candidate proposed cursor identity",
  async () => {
    const discovery =
      makeDiscovery(
        [
          makeCandidate(
            R1_A,
            "2026-08-25T01:00:00Z",
          ),
        ],
        {
          proposedCursor: {
            observedAt:
              "2026-08-25T02:00:00Z",

            evidenceId:
              R1_B,
          },
        },
      );


    const mock =
      makeDependencies(
        discovery,
        () =>
          nonQualifyingEvaluation(),
      );


    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationSelectionV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /proposal must equal the final structural candidate/i,
    );


    assert.equal(
      mock.evaluatorCalls.length,
      0,
    );
  },
);


test(
  "reader failure propagates without semantic evaluation or invented basis",
  async () => {
    const evaluatorCalls:
      any[] =
      [];


    const dependencies =
      {
        readCandidates:
          async () => {
            throw new Error(
              "controlled V2 reader failure",
            );
          },

        evaluateCandidate:
          (
            input: any,
          ) => {
            evaluatorCalls.push(
              input,
            );

            return nonQualifyingEvaluation();
          },
      } as any;


    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationSelectionV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          dependencies,
        ),
      /controlled V2 reader failure/i,
    );


    assert.equal(
      evaluatorCalls.length,
      0,
    );
  },
);
