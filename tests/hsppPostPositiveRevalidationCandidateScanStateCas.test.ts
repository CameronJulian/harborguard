import test from "node:test";
import assert from "node:assert/strict";

import {
  compareAndSwapHsppPostPositiveRevalidationCandidateScanState,
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_RPC,
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION,
  type HsppPostPositiveRevalidationCandidateScanCursor,
} from "../lib/hspp/compareAndSwapHsppPostPositiveRevalidationCandidateScanState";


const ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000001";

const POSITIVE_CHECKPOINT_ID =
  "00000000-0000-4000-8000-0000000000a1";

const OTHER_POSITIVE_CHECKPOINT_ID =
  "00000000-0000-4000-8000-0000000000a2";

const SUBJECT_EVIDENCE_ID =
  "00000000-0000-4000-8000-0000000000b1";

const SUBJECT_FINGERPRINT =
  "a".repeat(64);


const CURSOR_A:
  HsppPostPositiveRevalidationCandidateScanCursor = {
    observedAt:
      "2026-08-25T15:00:00.123456+00:00",

    evidenceId:
      "00000000-0000-4000-8000-0000000000c1",
  };


const CURSOR_B:
  HsppPostPositiveRevalidationCandidateScanCursor = {
    observedAt:
      "2026-08-25T15:01:00.654321+00:00",

    evidenceId:
      "00000000-0000-4000-8000-0000000000c2",
  };


function makeRow(
  options: any = {},
) {
  const state =
    options.state ??
    "ADVANCED";

  const current =
    options.current === undefined
      ? CURSOR_B
      : options.current;

  const previous =
    options.previous === undefined
      ? CURSOR_A
      : options.previous;

  return {
    cas_state:
      state,

    state_version:
      options.stateVersion ??
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION,

    positive_checkpoint_id:
      options.positiveCheckpointId ??
      POSITIVE_CHECKPOINT_ID,

    organization_id:
      options.organizationId ??
      ORGANIZATION_ID,

    subject_evidence_id:
      options.subjectEvidenceId ??
      SUBJECT_EVIDENCE_ID,

    subject_integrity_fingerprint:
      options.subjectFingerprint ??
      SUBJECT_FINGERPRINT,

    cursor_observed_at:
      current?.observedAt ??
      null,

    cursor_evidence_id:
      current?.evidenceId ??
      null,

    previous_cursor_observed_at:
      previous?.observedAt ??
      null,

    previous_cursor_evidence_id:
      previous?.evidenceId ??
      null,

    created_at:
      options.createdAt === undefined
        ? "2026-08-25T15:02:00.000000+00:00"
        : options.createdAt,

    updated_at:
      options.updatedAt === undefined
        ? "2026-08-25T15:03:00.000000+00:00"
        : options.updatedAt,
  };
}


function createSupabase({
  data,
  error = null,
}: {
  data: unknown;
  error?: unknown;
}) {
  const calls:
    Array<{
      name: string;
      args: Record<string, unknown>;
    }> =
      [];


  const supabase = {
    rpc(
      name: string,
      args: Record<string, unknown>,
    ) {
      calls.push({
        name,
        args,
      });

      return {
        async maybeSingle() {
          return {
            data,
            error,
          };
        },
      };
    },
  };


  return {
    supabase:
      supabase as any,

    calls,
  };
}


test(
  "first null cursor advances to the proposed R1 candidate",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "ADVANCED",

            current:
              CURSOR_B,

            previous:
              null,
          }),
      });


    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          null,

        proposedCursor:
          CURSOR_B,
      });


    assert.deepEqual(
      mock.calls,
      [
        {
          name:
            HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_RPC,

          args: {
            p_positive_checkpoint_id:
              POSITIVE_CHECKPOINT_ID,

            p_expected_cursor_observed_at:
              null,

            p_expected_cursor_evidence_id:
              null,

            p_proposed_cursor_observed_at:
              CURSOR_B.observedAt,

            p_proposed_cursor_evidence_id:
              CURSOR_B.evidenceId,
          },
        },
      ],
    );


    assert.equal(
      result.operationVersion,
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_VERSION,
    );

    assert.equal(
      result.state,
      "ADVANCED",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );

    assert.equal(
      result.previousCursor,
      null,
    );
  },
);


test(
  "ordinary expected to proposed transition preserves previous cursor",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "ADVANCED",

            current:
              CURSOR_B,

            previous:
              CURSOR_A,
          }),
      });


    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });


    assert.equal(
      result.state,
      "ADVANCED",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );

    assert.deepEqual(
      result.previousCursor,
      CURSOR_A,
    );
  },
);


test(
  "exact retry returns durable proposed and previous identities",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "EXACT_RETRY",

            current:
              CURSOR_B,

            previous:
              CURSOR_A,
          }),
      });


    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });


    assert.equal(
      result.state,
      "EXACT_RETRY",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );

    assert.deepEqual(
      result.previousCursor,
      CURSOR_A,
    );
  },
);


test(
  "no change requires current expected and proposed identity to agree",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "NO_CHANGE",

            current:
              CURSOR_B,

            previous:
              CURSOR_A,
          }),
      });


    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          CURSOR_B,

        proposedCursor:
          CURSOR_B,
      });


    assert.equal(
      result.state,
      "NO_CHANGE",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );
  },
);


test(
  "stale with no persisted state is a valid scheduling result",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "STALE",

            current:
              null,

            previous:
              null,

            createdAt:
              null,

            updatedAt:
              null,
          }),
      });


    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });


    assert.equal(
      result.state,
      "STALE",
    );

    assert.equal(
      result.currentCursor,
      null,
    );

    assert.equal(
      result.createdAt,
      null,
    );
  },
);


test(
  "invalid proposed timestamp fails before RPC",
  async () => {
    const mock =
      createSupabase({
        data:
          null,
      });


    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
          supabase:
            mock.supabase,

          positiveCheckpointId:
            POSITIVE_CHECKPOINT_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor: {
            ...CURSOR_B,

            observedAt:
              "not-a-timestamp",
          },
        }),

      /proposedCursor\.observedAt must be a valid timestamp/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "partial persisted cursor pair fails closed",
  async () => {
    const row =
      makeRow({
        state:
          "STALE",
      });

    row.cursor_evidence_id =
      null;


    const mock =
      createSupabase({
        data:
          row,
      });


    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
          supabase:
            mock.supabase,

          positiveCheckpointId:
            POSITIVE_CHECKPOINT_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /partial cursor pair/,
    );
  },
);


test(
  "returned positive checkpoint must match requested Q14p",
  async () => {
    const mock =
      createSupabase({
        data:
          makeRow({
            state:
              "STALE",

            positiveCheckpointId:
              OTHER_POSITIVE_CHECKPOINT_ID,
          }),
      });


    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
          supabase:
            mock.supabase,

          positiveCheckpointId:
            POSITIVE_CHECKPOINT_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /wrong positive checkpoint/,
    );
  },
);


test(
  "RPC failure is preserved",
  async () => {
    const expectedError =
      new Error(
        "synthetic candidate scan CAS failure",
      );

    const mock =
      createSupabase({
        data:
          null,

        error:
          expectedError,
      });


    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
          supabase:
            mock.supabase,

          positiveCheckpointId:
            POSITIVE_CHECKPOINT_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      error =>
        error ===
        expectedError,
    );
  },
);

test(
  "contended returns requested scope without claiming unobserved durable state",
  async () => {
    const mock =
      createSupabase({
        data: {
          cas_state:
            "CONTENDED",

          state_version:
            "hspp-post-positive-revalidation-candidate-scan-state-v1",

          positive_checkpoint_id:
            POSITIVE_CHECKPOINT_ID,

          organization_id:
            null,

          subject_evidence_id:
            null,

          subject_integrity_fingerprint:
            null,

          cursor_observed_at:
            null,

          cursor_evidence_id:
            null,

          previous_cursor_observed_at:
            null,

          previous_cursor_evidence_id:
            null,

          created_at:
            null,

          updated_at:
            null,
        },
      });

    const result =
      await compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
        supabase:
          mock.supabase,

        positiveCheckpointId:
          POSITIVE_CHECKPOINT_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      result.state,
      "CONTENDED",
    );

    assert.equal(
      result.positiveCheckpointId,
      POSITIVE_CHECKPOINT_ID,
    );

    assert.equal(
      result.organizationId,
      null,
    );

    assert.equal(
      result.subjectEvidenceId,
      null,
    );

    assert.equal(
      result.subjectIntegrityFingerprint,
      null,
    );

    assert.equal(
      result.currentCursor,
      null,
    );

    assert.equal(
      result.previousCursor,
      null,
    );

    assert.equal(
      result.createdAt,
      null,
    );

    assert.equal(
      result.updatedAt,
      null,
    );
  },
);
