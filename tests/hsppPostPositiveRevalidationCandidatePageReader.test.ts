import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_RPC,
  readHsppPostPositiveRevalidationCandidatePage,
} from "../lib/hspp/readHsppPostPositiveRevalidationCandidatePage";


const POSITIVE_CHECKPOINT_ID =
  "00000000-0000-4000-8000-000000000101";

const ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000102";

const ASSEMBLY_ID =
  "00000000-0000-4000-8000-000000000103";

const EVIDENCE_ID =
  "00000000-0000-4000-8000-000000000104";

const R1_A =
  "00000000-0000-4000-8000-000000000201";

const R1_B =
  "00000000-0000-4000-8000-000000000202";

const R1_C =
  "00000000-0000-4000-8000-000000000203";

const FINGERPRINT =
  "a".repeat(64);

const POSITIVE_AT =
  "2026-08-25T00:00:00Z";


function makeRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    reader_version:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,

    positive_checkpoint_id:
      POSITIVE_CHECKPOINT_ID,

    organization_id:
      ORGANIZATION_ID,

    assembly_id:
      ASSEMBLY_ID,

    subject_evidence_id:
      EVIDENCE_ID,

    subject_integrity_fingerprint:
      FINGERPRINT,

    positive_assessed_at:
      POSITIVE_AT,

    cursor_expected_observed_at:
      null,

    cursor_expected_evidence_id:
      null,

    cursor_proposed_observed_at:
      null,

    cursor_proposed_evidence_id:
      null,

    candidate_evidence_id:
      null,

    candidate_observed_at:
      null,

    candidate_position:
      null,

    ...overrides,
  };
}


function makeSupabase(
  rows: unknown[],
  error: { message: string } | null = null,
) {
  const calls:
    Array<{
      name:
        string;

      args:
        unknown;
    }> =
      [];

  const supabase =
    {
      rpc:
        async (
          name: string,
          args: unknown,
        ) => {
          calls.push({
            name,
            args,
          });

          return {
            data:
              rows,

            error,
          };
        },
    } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}


function baseInput(
  supabase: SupabaseClient,
) {
  return {
    supabase,

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
  };
}


test(
  "initial page returns ordered candidates and proposes its final candidate",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeRow({
          cursor_proposed_observed_at:
            "2026-08-25T02:00:00Z",

          cursor_proposed_evidence_id:
            R1_B,

          candidate_evidence_id:
            R1_A,

          candidate_observed_at:
            "2026-08-25T01:00:00Z",

          candidate_position:
            1,
        }),

        makeRow({
          cursor_proposed_observed_at:
            "2026-08-25T02:00:00Z",

          cursor_proposed_evidence_id:
            R1_B,

          candidate_evidence_id:
            R1_B,

          candidate_observed_at:
            "2026-08-25T02:00:00Z",

          candidate_position:
            2,
        }),
      ]);


    const result =
      await readHsppPostPositiveRevalidationCandidatePage({
        ...baseInput(
          supabase,
        ),

        limit:
          2,
      });


    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_RPC,
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_positive_checkpoint_id:
          POSITIVE_CHECKPOINT_ID,

        p_limit:
          2,
      },
    );

    assert.equal(
      result.expectedCursor,
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

    assert.deepEqual(
      result.candidates,
      [
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
    );
  },
);


test(
  "wrapped circular page preserves page position instead of assuming global timestamp monotonicity",
  async () => {
    const expectedObservedAt =
      "2026-08-25T02:00:00Z";

    const expectedEvidenceId =
      R1_B;

    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          cursor_expected_observed_at:
            expectedObservedAt,

          cursor_expected_evidence_id:
            expectedEvidenceId,

          cursor_proposed_observed_at:
            "2026-08-25T01:00:00Z",

          cursor_proposed_evidence_id:
            R1_A,

          candidate_evidence_id:
            R1_C,

          candidate_observed_at:
            "2026-08-25T03:00:00Z",

          candidate_position:
            1,
        }),

        makeRow({
          cursor_expected_observed_at:
            expectedObservedAt,

          cursor_expected_evidence_id:
            expectedEvidenceId,

          cursor_proposed_observed_at:
            "2026-08-25T01:00:00Z",

          cursor_proposed_evidence_id:
            R1_A,

          candidate_evidence_id:
            R1_A,

          candidate_observed_at:
            "2026-08-25T01:00:00Z",

          candidate_position:
            2,
        }),
      ]);


    const result =
      await readHsppPostPositiveRevalidationCandidatePage({
        ...baseInput(
          supabase,
        ),

        limit:
          2,
      });


    assert.deepEqual(
      result.expectedCursor,
      {
        observedAt:
          expectedObservedAt,

        evidenceId:
          expectedEvidenceId,
      },
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
  "empty structural page is represented by one sentinel and proposes no advancement",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow(),
      ]);


    const result =
      await readHsppPostPositiveRevalidationCandidatePage(
        baseInput(
          supabase,
        ),
      );


    assert.deepEqual(
      result.candidates,
      [],
    );

    assert.equal(
      result.expectedCursor,
      null,
    );

    assert.equal(
      result.proposedCursor,
      null,
    );
  },
);


test(
  "invalid limit fails before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage({
          ...baseInput(
            supabase,
          ),

          limit:
            26,
        }),
      /limit must be an integer between 1 and 25/i,
    );


    assert.equal(
      calls.length,
      0,
    );
  },
);


test(
  "conflicting immutable page authority fails closed",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          organization_id:
            "00000000-0000-4000-8000-000000000999",
        }),
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /conflicting immutable lifecycle authority/i,
    );
  },
);


test(
  "partial cursor identity fails closed",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          cursor_expected_observed_at:
            "2026-08-25T01:00:00Z",

          cursor_expected_evidence_id:
            null,
        }),
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /requires both observedAt and evidenceId or neither/i,
    );
  },
);


test(
  "proposed cursor must equal the final page candidate",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          cursor_proposed_observed_at:
            "2026-08-25T02:00:00Z",

          cursor_proposed_evidence_id:
            R1_B,

          candidate_evidence_id:
            R1_A,

          candidate_observed_at:
            "2026-08-25T01:00:00Z",

          candidate_position:
            1,
        }),
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /proposed cursor must equal its final selected candidate/i,
    );
  },
);


test(
  "candidate positions must be contiguous",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          cursor_proposed_observed_at:
            "2026-08-25T01:00:00Z",

          cursor_proposed_evidence_id:
            R1_A,

          candidate_evidence_id:
            R1_A,

          candidate_observed_at:
            "2026-08-25T01:00:00Z",

          candidate_position:
            2,
        }),
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /positions must be contiguous and deterministic/i,
    );
  },
);


test(
  "missing metadata sentinel fails closed",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([]);


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /required page metadata row/i,
    );
  },
);


test(
  "RPC failure is preserved",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        [],
        {
          message:
            "controlled candidate page failure",
        },
      );


    await assert.rejects(
      () =>
        readHsppPostPositiveRevalidationCandidatePage(
          baseInput(
            supabase,
          ),
        ),
      /controlled candidate page failure/i,
    );
  },
);
