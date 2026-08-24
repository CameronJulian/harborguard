import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_WORK_READER_VERSION,
  HSPP_POST_POSITIVE_LIFECYCLE_WORK_RPC,
  readHsppPostPositiveLifecycleWorkItems,
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

const UNSUITABILITY_CHECKPOINT_ID =
  "66666666-6666-4666-8666-666666666666";

const FINGERPRINT =
  "a".repeat(64);

function createSupabase(
  rows: unknown[],
) {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  return {
    calls,

    supabase: {
      async rpc(
        name: string,
        args: Record<string, unknown>,
      ) {
        calls.push({
          name,
          args,
        });

        return {
          data: rows,
          error: null,
        };
      },
    },
  };
}

test(
  "post-positive lifecycle reader exposes bounded reevaluation work",
  async () => {
    const fixture =
      createSupabase([
        {
          positive_checkpoint_id:
            POSITIVE_CHECKPOINT_ID,

          organization_id:
            ORGANIZATION_ID,

          assembly_id:
            ASSEMBLY_ID,

          membership_id:
            MEMBERSHIP_ID,

          evidence_id:
            EVIDENCE_ID,

          integrity_fingerprint:
            FINGERPRINT,

          positive_assessed_at:
            "2026-08-24T10:00:00.000Z",

          unsuitability_checkpoint_id:
            null,

          unsuitability_observed_at:
            null,

          unsuitability_decided_at:
            null,

          work_state:
            "REEVALUATION_REQUIRED",
        },
      ]);

    const result =
      await readHsppPostPositiveLifecycleWorkItems({
        supabase:
          fixture.supabase as any,

        organizationId:
          ORGANIZATION_ID,

        limit:
          25,
      });

    assert.equal(
      fixture.calls.length,
      1,
    );

    assert.equal(
      fixture.calls[0]?.name,
      HSPP_POST_POSITIVE_LIFECYCLE_WORK_RPC,
    );

    assert.deepEqual(
      fixture.calls[0]?.args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_limit:
          25,
      },
    );

    assert.equal(
      result.readerVersion,
      HSPP_POST_POSITIVE_LIFECYCLE_WORK_READER_VERSION,
    );

    assert.equal(
      result.requestedLimit,
      25,
    );

    assert.equal(
      result.workItems.length,
      1,
    );

    assert.equal(
      result.workItems[0]?.workState,
      "REEVALUATION_REQUIRED",
    );

    assert.equal(
      result.workItems[0]?.unsuitabilityCheckpointId,
      null,
    );
  },
);

test(
  "post-positive lifecycle reader preserves Q14v crash-recovery authority",
  async () => {
    const fixture =
      createSupabase([
        {
          positive_checkpoint_id:
            POSITIVE_CHECKPOINT_ID,

          organization_id:
            ORGANIZATION_ID,

          assembly_id:
            ASSEMBLY_ID,

          membership_id:
            MEMBERSHIP_ID,

          evidence_id:
            EVIDENCE_ID,

          integrity_fingerprint:
            FINGERPRINT,

          positive_assessed_at:
            "2026-08-24T10:00:00.000Z",

          unsuitability_checkpoint_id:
            UNSUITABILITY_CHECKPOINT_ID,

          unsuitability_observed_at:
            "2026-08-24T11:00:00.000Z",

          unsuitability_decided_at:
            "2026-08-24T11:00:01.000Z",

          work_state:
            "CESSATION_REQUIRED",
        },
      ]);

    const result =
      await readHsppPostPositiveLifecycleWorkItems({
        supabase:
          fixture.supabase as any,

        organizationId:
          ORGANIZATION_ID,
      });

    assert.equal(
      result.workItems[0]?.workState,
      "CESSATION_REQUIRED",
    );

    assert.equal(
      result.workItems[0]?.unsuitabilityCheckpointId,
      UNSUITABILITY_CHECKPOINT_ID,
    );

    assert.equal(
      result.workItems[0]?.unsuitabilityObservedAt,
      "2026-08-24T11:00:00.000Z",
    );
  },
);

test(
  "post-positive lifecycle reader rejects contradictory Q14v state",
  async () => {
    const fixture =
      createSupabase([
        {
          positive_checkpoint_id:
            POSITIVE_CHECKPOINT_ID,

          organization_id:
            ORGANIZATION_ID,

          assembly_id:
            ASSEMBLY_ID,

          membership_id:
            MEMBERSHIP_ID,

          evidence_id:
            EVIDENCE_ID,

          integrity_fingerprint:
            FINGERPRINT,

          positive_assessed_at:
            "2026-08-24T10:00:00.000Z",

          unsuitability_checkpoint_id:
            UNSUITABILITY_CHECKPOINT_ID,

          unsuitability_observed_at:
            "2026-08-24T11:00:00.000Z",

          unsuitability_decided_at:
            "2026-08-24T11:00:01.000Z",

          work_state:
            "REEVALUATION_REQUIRED",
        },
      ]);

    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleWorkItems({
          supabase:
            fixture.supabase as any,

          organizationId:
            ORGANIZATION_ID,
        }),
      /REEVALUATION_REQUIRED work must not expose persisted Q14v authority/,
    );
  },
);
