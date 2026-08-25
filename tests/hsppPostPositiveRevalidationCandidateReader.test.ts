import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT,
  readHsppPostPositiveRevalidationCandidates,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidates";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "../lib/hspp/readHsppPostPositiveLifecycleWorkItems";

import type {
  ReadAndVerifyHsppEvidenceBatchInput,
  ReadAndVerifyHsppEvidenceBatchResult,
} from "../lib/hspp/readAndVerifyHsppEvidence";


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

const C_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const POSITIVE_AT =
  "2026-08-25T08:00:00.000Z";


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


type QueryCall =
  [
    string,
    unknown?,
    unknown?,
  ];


function makeSupabase(
  rows: unknown[],
  error: {
    message: string;
  } | null = null,
) {
  const calls:
    QueryCall[] =
      [];

  const builder = {
    select(
      value: string,
    ) {
      calls.push(
        [
          "select",
          value,
        ],
      );

      return this;
    },

    eq(
      column: string,
      value: unknown,
    ) {
      calls.push(
        [
          "eq",
          column,
          value,
        ],
      );

      return this;
    },

    gte(
      column: string,
      value: unknown,
    ) {
      calls.push(
        [
          "gte",
          column,
          value,
        ],
      );

      return this;
    },

    order(
      column: string,
      options: unknown,
    ) {
      calls.push(
        [
          "order",
          column,
          options,
        ],
      );

      return this;
    },

    limit(
      value: number,
    ) {
      calls.push(
        [
          "limit",
          value,
        ],
      );

      return Promise.resolve({
        data:
          rows,

        error,
      });
    },
  };


  const supabase = {
    from(
      table: string,
    ) {
      calls.push(
        [
          "from",
          table,
        ],
      );

      return builder;
    },
  };


  return {
    supabase:
      supabase as never,

    calls,
  };
}


function makeNotFoundBatch(
  evidenceIds: string[],
): ReadAndVerifyHsppEvidenceBatchResult {
  return new Map(
    evidenceIds.map(
      evidenceId =>
        [
          evidenceId,
          {
            found:
              false,

            evidence:
              null,

            verification:
              null,
          },
        ],
    ),
  );
}


test(
  "reader issues exact bounded R1 structural query and verifies selected ids",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        {
          id:
            R1_A,

          observed_at:
            "2026-08-25T08:05:00.000Z",
        },
        {
          id:
            R1_B,

          observed_at:
            "2026-08-25T08:06:00.000Z",
        },
      ]);


    const batchCapture: {
      value?: ReadAndVerifyHsppEvidenceBatchInput;
    } = {};


    const result =
      await readHsppPostPositiveRevalidationCandidates(
        {
          supabase,

          workItem:
            makeWorkItem(),

          limit:
            2,
        },
        {
          readEvidenceBatch:
            async input => {
              batchCapture.value =
                input;

              return makeNotFoundBatch(
                input.evidenceIds,
              );
            },
        },
      );


    assert.deepEqual(
      calls,
      [
        [
          "from",
          "hspp_evidence",
        ],
        [
          "select",
          "id,observed_at",
        ],
        [
          "eq",
          "organization_id",
          ORGANIZATION_ID,
        ],
        [
          "eq",
          "source_class",
          "derived",
        ],
        [
          "eq",
          "source_provider",
          "harborguard",
        ],
        [
          "eq",
          "source_stream",
          "post-positive-revalidation",
        ],
        [
          "eq",
          "payload_schema_version",
          "hspp-post-positive-revalidation-v1",
        ],
        [
          "eq",
          "parent_evidence_id",
          EVIDENCE_ID,
        ],
        [
          "eq",
          "parent_integrity_fingerprint",
          C_FINGERPRINT,
        ],
        [
          "eq",
          "derivation_type",
          "post_positive_revalidation",
        ],
        [
          "eq",
          "derivation_version",
          "hspp-post-positive-revalidation-v1",
        ],
        [
          "gte",
          "observed_at",
          POSITIVE_AT,
        ],
        [
          "order",
          "observed_at",
          {
            ascending:
              true,
          },
        ],
        [
          "order",
          "id",
          {
            ascending:
              true,
          },
        ],
        [
          "limit",
          2,
        ],
      ],
    );


    const batchInput =
      batchCapture.value;

    assert.ok(
      batchInput,
    );

    assert.equal(
      batchInput.organizationId,
      ORGANIZATION_ID,
    );

    assert.deepEqual(
      batchInput.evidenceIds,
      [
        R1_A,
        R1_B,
      ],
    );


    assert.equal(
      result.requestedLimit,
      2,
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
  "empty candidate page does not invoke batch evidence reader",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        [],
      );

    let batchCalls =
      0;


    const result =
      await readHsppPostPositiveRevalidationCandidates(
        {
          supabase,

          workItem:
            makeWorkItem(),

          limit:
            5,
        },
        {
          readEvidenceBatch:
            async () => {
              batchCalls +=
                1;

              return new Map();
            },
        },
      );


    assert.equal(
      batchCalls,
      0,
    );

    assert.deepEqual(
      result.candidates,
      [],
    );
  },
);


test(
  "reader rejects limits outside the bounded domain before querying",
  async () => {
    for (const limit of [
      0,
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT + 1,
      1.5,
    ]) {
      const {
        supabase,
        calls,
      } =
        makeSupabase(
          [],
        );


      await assert.rejects(
        readHsppPostPositiveRevalidationCandidates({
          supabase,

          workItem:
            makeWorkItem(),

          limit,
        }),
        /limit must be an integer/,
      );


      assert.equal(
        calls.length,
        0,
      );
    }
  },
);


test(
  "reader refuses already checkpointed cessation work",
  async () => {
    const workItem =
      makeWorkItem();

    workItem.workState =
      "CESSATION_REQUIRED";

    workItem.unsuitabilityCheckpointId =
      "88888888-8888-4888-8888-888888888888";

    workItem.unsuitabilityObservedAt =
      "2026-08-25T08:05:00.000Z";

    workItem.unsuitabilityDecidedAt =
      "2026-08-25T08:05:00.000Z";


    const {
      supabase,
      calls,
    } =
      makeSupabase(
        [],
      );


    await assert.rejects(
      readHsppPostPositiveRevalidationCandidates({
        supabase,

        workItem,
      }),
      /REEVALUATION_REQUIRED/,
    );


    assert.equal(
      calls.length,
      0,
    );
  },
);


test(
  "reader surfaces Supabase candidate-query failure",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        [],
        {
          message:
            "controlled read failure",
        },
      );


    await assert.rejects(
      readHsppPostPositiveRevalidationCandidates({
        supabase,

        workItem:
          makeWorkItem(),
      }),
      /controlled read failure/,
    );
  },
);


test(
  "reader fails closed on duplicate selected R1 identity",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        {
          id:
            R1_A,

          observed_at:
            "2026-08-25T08:05:00.000Z",
        },
        {
          id:
            R1_A,

          observed_at:
            "2026-08-25T08:06:00.000Z",
        },
      ]);


    await assert.rejects(
      readHsppPostPositiveRevalidationCandidates({
        supabase,

        workItem:
          makeWorkItem(),

        limit:
          2,
      }),
      /duplicate evidence/,
    );
  },
);


test(
  "reader independently rejects a row preceding Q14p despite database filter",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        {
          id:
            R1_A,

          observed_at:
            "2026-08-25T07:59:59.999Z",
        },
      ]);


    await assert.rejects(
      readHsppPostPositiveRevalidationCandidates({
        supabase,

        workItem:
          makeWorkItem(),
      }),
      /preceding the prior positive assessment/,
    );
  },
);


test(
  "reader fails closed if canonical batch reader omits a selected candidate",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        {
          id:
            R1_A,

          observed_at:
            "2026-08-25T08:05:00.000Z",
        },
      ]);


    await assert.rejects(
      readHsppPostPositiveRevalidationCandidates(
        {
          supabase,

          workItem:
            makeWorkItem(),
        },
        {
          readEvidenceBatch:
            async () =>
              new Map(),
        },
      ),
      /omitted selected R1 candidate/,
    );
  },
);
