import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,
  readHsppPostPositiveRevalidationCandidatesV2,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidatesV2";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidatePage";


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

const OTHER_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000999";

const FINGERPRINT =
  "a".repeat(64);

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
      FINGERPRINT,

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


function makePage(
  overrides: Record<string, unknown> = {},
) {
  return {
    readerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    requestedLimit:
      25,

    expectedCursor:
      null,

    proposedCursor:
      null,

    candidates:
      [],

    ...overrides,
  } as any;
}


function notFoundResult() {
  return {
    found:
      false,

    evidence:
      null,

    verification:
      null,
  } as const;
}


function makeDependencies(
  page: any,
  batch:
    Map<string, any> =
      new Map(),
) {
  const pageCalls:
    any[] =
      [];

  const batchCalls:
    any[] =
      [];


  const dependencies =
    {
      readCandidatePage:
        async (
          input: any,
        ) => {
          pageCalls.push(
            input,
          );

          return page;
        },

      readEvidenceBatch:
        async (
          input: any,
        ) => {
          batchCalls.push(
            input,
          );

          return batch;
        },
    } as any;


  return {
    dependencies,
    pageCalls,
    batchCalls,
  };
}


test(
  "V2 composes circular page identity with the canonical batch verifier",
  async () => {
    const page =
      makePage({
        requestedLimit:
          2,

        proposedCursor: {
          observedAt:
            "2026-08-25T02:00:00Z",

          evidenceId:
            R1_B,
        },

        candidates: [
          {
            evidenceId:
              R1_A,

            observedAt:
              "2026-08-25T01:00:00Z",

            position:
              1,
          },
          {
            evidenceId:
              R1_B,

            observedAt:
              "2026-08-25T02:00:00Z",

            position:
              2,
          },
        ],
      });


    const batch =
      new Map([
        [
          R1_A,
          notFoundResult(),
        ],
        [
          R1_B,
          notFoundResult(),
        ],
      ]);


    const mock =
      makeDependencies(
        page,
        batch,
      );


    const fakeSupabase =
      {} as any;


    const result =
      await readHsppPostPositiveRevalidationCandidatesV2(
        {
          supabase:
            fakeSupabase,

          workItem:
            makeWorkItem(),

          limit:
            2,
        },
        mock.dependencies,
      );


    assert.equal(
      result.readerVersion,
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,
    );

    assert.equal(
      mock.pageCalls.length,
      1,
    );

    assert.equal(
      mock.pageCalls[0].supabase,
      fakeSupabase,
    );

    assert.deepEqual(
      {
        positiveCheckpointId:
          mock.pageCalls[0].positiveCheckpointId,

        organizationId:
          mock.pageCalls[0].organizationId,

        assemblyId:
          mock.pageCalls[0].assemblyId,

        evidenceId:
          mock.pageCalls[0].evidenceId,

        integrityFingerprint:
          mock.pageCalls[0].integrityFingerprint,

        positiveAssessedAt:
          mock.pageCalls[0].positiveAssessedAt,

        limit:
          mock.pageCalls[0].limit,
      },
      {
        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          FINGERPRINT,

        positiveAssessedAt:
          POSITIVE_AT,

        limit:
          2,
      },
    );

    assert.equal(
      mock.batchCalls.length,
      1,
    );

    assert.equal(
      mock.batchCalls[0].supabase,
      fakeSupabase,
    );

    assert.equal(
      mock.batchCalls[0].organizationId,
      ORGANIZATION_ID,
    );

    assert.deepEqual(
      mock.batchCalls[0].evidenceIds,
      [
        R1_A,
        R1_B,
      ],
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

    assert.deepEqual(
      result.candidates.map(
        candidate =>
          candidate.evidenceId,
      ),
      [
        R1_A,
        R1_B,
      ],
    );
  },
);


test(
  "V2 empty page preserves expected cursor and performs no batch read",
  async () => {
    const expectedCursor =
      {
        observedAt:
          "2026-08-25T02:00:00Z",

        evidenceId:
          R1_B,
      };


    const mock =
      makeDependencies(
        makePage({
          expectedCursor,

          proposedCursor:
            null,

          candidates:
            [],
        }),
      );


    const result =
      await readHsppPostPositiveRevalidationCandidatesV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),
        },
        mock.dependencies,
      );


    assert.deepEqual(
      result.expectedCursor,
      expectedCursor,
    );

    assert.equal(
      result.proposedCursor,
      null,
    );

    assert.deepEqual(
      result.candidates,
      [],
    );

    assert.equal(
      mock.batchCalls.length,
      0,
    );
  },
);


test(
  "V2 preserves wrapped circular page order without timestamp resorting",
  async () => {
    const expectedCursor =
      {
        observedAt:
          "2026-08-25T02:00:00Z",

        evidenceId:
          R1_B,
      };


    const page =
      makePage({
        requestedLimit:
          2,

        expectedCursor,

        proposedCursor: {
          observedAt:
            "2026-08-25T01:00:00Z",

          evidenceId:
            R1_A,
        },

        candidates: [
          {
            evidenceId:
              R1_C,

            observedAt:
              "2026-08-25T03:00:00Z",

            position:
              1,
          },
          {
            evidenceId:
              R1_A,

            observedAt:
              "2026-08-25T01:00:00Z",

            position:
              2,
          },
        ],
      });


    const mock =
      makeDependencies(
        page,
        new Map([
          [
            R1_C,
            notFoundResult(),
          ],
          [
            R1_A,
            notFoundResult(),
          ],
        ]),
      );


    const result =
      await readHsppPostPositiveRevalidationCandidatesV2(
        {
          supabase:
            {} as any,

          workItem:
            makeWorkItem(),

          limit:
            2,
        },
        mock.dependencies,
      );


    assert.deepEqual(
      result.candidates.map(
        candidate =>
          candidate.evidenceId,
      ),
      [
        R1_C,
        R1_A,
      ],
    );

    assert.deepEqual(
      mock.batchCalls[0].evidenceIds,
      [
        R1_C,
        R1_A,
      ],
    );
  },
);


test(
  "V2 fails closed when batch verifier omits a selected candidate",
  async () => {
    const page =
      makePage({
        requestedLimit:
          1,

        proposedCursor: {
          observedAt:
            "2026-08-25T01:00:00Z",

          evidenceId:
            R1_A,
        },

        candidates: [
          {
            evidenceId:
              R1_A,

            observedAt:
              "2026-08-25T01:00:00Z",

            position:
              1,
          },
        ],
      });


    const mock =
      makeDependencies(
        page,
        new Map(),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),

            limit:
              1,
          },
          mock.dependencies,
        ),
      /omitted selected R1 candidate/i,
    );
  },
);


test(
  "V2 fails closed on conflicting verified evidence identity",
  async () => {
    const page =
      makePage({
        requestedLimit:
          1,

        proposedCursor: {
          observedAt:
            "2026-08-25T01:00:00Z",

          evidenceId:
            R1_A,
        },

        candidates: [
          {
            evidenceId:
              R1_A,

            observedAt:
              "2026-08-25T01:00:00Z",

            position:
              1,
          },
        ],
      });


    const conflicting =
      {
        found:
          true,

        evidence: {
          id:
            R1_A,

          organizationId:
            OTHER_ORGANIZATION_ID,
        },

        verification: {
          status:
            "MATCH",
        },
      };


    const mock =
      makeDependencies(
        page,
        new Map([
          [
            R1_A,
            conflicting,
          ],
        ]),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),

            limit:
              1,
          },
          mock.dependencies,
        ),
      /conflicting R1 candidate identity/i,
    );
  },
);


test(
  "V2 rejects conflicting immutable page authority",
  async () => {
    const mock =
      makeDependencies(
        makePage({
          organizationId:
            OTHER_ORGANIZATION_ID,
        }),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /conflicting immutable lifecycle authority/i,
    );

    assert.equal(
      mock.batchCalls.length,
      0,
    );
  },
);


test(
  "V2 rejects page requested-limit mismatch",
  async () => {
    const mock =
      makeDependencies(
        makePage({
          requestedLimit:
            24,
        }),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),
          },
          mock.dependencies,
        ),
      /conflicting requested limit/i,
    );
  },
);


test(
  "V2 requires proposed cursor to equal final selected candidate",
  async () => {
    const mock =
      makeDependencies(
        makePage({
          requestedLimit:
            1,

          proposedCursor: {
            observedAt:
              "2026-08-25T02:00:00Z",

            evidenceId:
              R1_B,
          },

          candidates: [
            {
              evidenceId:
                R1_A,

              observedAt:
                "2026-08-25T01:00:00Z",

              position:
                1,
            },
          ],
        }),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),

            limit:
              1,
          },
          mock.dependencies,
        ),
      /proposed cursor must equal the final selected candidate/i,
    );
  },
);


test(
  "V2 independently rejects candidate chronology preceding Q14p",
  async () => {
    const mock =
      makeDependencies(
        makePage({
          requestedLimit:
            1,

          proposedCursor: {
            observedAt:
              "2026-08-24T23:59:59Z",

            evidenceId:
              R1_A,
          },

          candidates: [
            {
              evidenceId:
                R1_A,

              observedAt:
                "2026-08-24T23:59:59Z",

              position:
                1,
            },
          ],
        }),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem(),

            limit:
              1,
          },
          mock.dependencies,
        ),
      /preceding the prior positive assessment/i,
    );
  },
);


test(
  "V2 rejects pre-existing Q14v before either dependency runs",
  async () => {
    const mock =
      makeDependencies(
        makePage(),
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatesV2(
          {
            supabase:
              {} as any,

            workItem:
              makeWorkItem({
                unsuitabilityCheckpointId:
                  "00000000-0000-4000-8000-000000000777",
              }),
          },
          mock.dependencies,
        ),
      /already contains Q14v authority/i,
    );


    assert.equal(
      mock.pageCalls.length,
      0,
    );

    assert.equal(
      mock.batchCalls.length,
      0,
    );
  },
);
