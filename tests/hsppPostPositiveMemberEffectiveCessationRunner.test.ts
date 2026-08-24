import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION,
  runHsppPostPositiveMemberEffectiveCessation,
} from "../lib/hspp/runHsppPostPositiveMemberEffectiveCessation";

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

const CESSATION_ID =
  "77777777-7777-4777-8777-777777777777";

const LEASE_TOKEN =
  "88888888-8888-4888-8888-888888888888";

const FINGERPRINT =
  "a".repeat(64);

const OBSERVED_AT =
  "2026-08-24T11:00:00.000Z";

const DECIDED_AT =
  "2026-08-24T11:00:01.000Z";

const CREATED_AT =
  "2026-08-24T11:00:02.000Z";

const SUPABASE =
  {} as SupabaseClient;

function createCessationWorkItem(
  overrides: Record<string, unknown> = {},
) {
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
      FINGERPRINT,

    positiveAssessedAt:
      "2026-08-24T10:00:00.000Z",

    unsuitabilityCheckpointId:
      UNSUITABILITY_CHECKPOINT_ID,

    unsuitabilityObservedAt:
      OBSERVED_AT,

    unsuitabilityDecidedAt:
      DECIDED_AT,

    workState:
      "CESSATION_REQUIRED",

    ...overrides,
  } as any;
}

type HarnessOptions = {
  acquireState?:
    "ACQUIRED" |
    "BUSY";

  persistError?:
    Error | null;

  releaseError?:
    Error | null;

  cessationOverrides?:
    Record<string, unknown>;
};

function createHarness(
  {
    acquireState =
      "ACQUIRED",

    persistError =
      null,

    releaseError =
      null,

    cessationOverrides =
      {},
  }: HarnessOptions = {},
) {
  const calls = {
    acquire:
      [] as any[],

    persist:
      [] as any[],

    release:
      [] as any[],
  };

  const dependencies = {
    async acquireLease(
      input: any,
    ) {
      calls.acquire.push(
        input,
      );

      if (
        acquireState ===
        "BUSY"
      ) {
        return {
          state:
            "BUSY",

          leaseToken:
            null,

          expiresAt:
            "2026-08-24T11:05:00.000Z",

          acquiredAt:
            "2026-08-24T10:55:00.000Z",

          renewedAt:
            "2026-08-24T10:55:00.000Z",
        };
      }

      return {
        state:
          "ACQUIRED",

        leaseToken:
          LEASE_TOKEN,

        expiresAt:
          "2026-08-24T11:05:00.000Z",

        acquiredAt:
          "2026-08-24T11:00:00.000Z",

        renewedAt:
          "2026-08-24T11:00:00.000Z",
      };
    },

    async persistCessation(
      input: any,
    ) {
      calls.persist.push(
        input,
      );

      if (persistError) {
        throw persistError;
      }

      return {
        writerVersion:
          "hspp-assembly-member-effective-cessation-under-execution-lease-v1",

        state:
          "ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_PERSISTED",

        cessationId:
          CESSATION_ID,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          FINGERPRINT,

        historicalMembershipId:
          MEMBERSHIP_ID,

        unsuitabilityCheckpointId:
          UNSUITABILITY_CHECKPOINT_ID,

        cessationVersion:
          "hspp-assembly-member-effective-cessation-v1",

        cessationPolicyVersion:
          "hspp-post-positive-effective-membership-cessation-v1",

        cessationReason:
          "POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP",

        ceasedAt:
          DECIDED_AT,

        createdAt:
          CREATED_AT,

        ...cessationOverrides,
      };
    },

    async releaseLease(
      input: any,
    ) {
      calls.release.push(
        input,
      );

      if (releaseError) {
        throw releaseError;
      }

      return {
        state:
          "RELEASED",

        leaseToken:
          LEASE_TOKEN,
      };
    },
  } as any;

  return {
    calls,
    dependencies,
  };
}

function runWithHarness(
  dependencies: any,
  workItem: any =
    createCessationWorkItem(),
) {
  return runHsppPostPositiveMemberEffectiveCessation(
    {
      supabase:
        SUPABASE,

      workItem,

      leaseToken:
        LEASE_TOKEN,

      leaseSeconds:
        60,
    },

    dependencies,
  );
}

test(
  "runner rejects REEVALUATION_REQUIRED before acquiring a lease",
  async () => {
    const harness =
      createHarness();

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,

          createCessationWorkItem({
            workState:
              "REEVALUATION_REQUIRED",

            unsuitabilityCheckpointId:
              null,

            unsuitabilityObservedAt:
              null,

            unsuitabilityDecidedAt:
              null,
          }),
        ),
      /requires CESSATION_REQUIRED work/,
    );

    assert.equal(
      harness.calls.acquire.length,
      0,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );
  },
);

test(
  "runner rejects incomplete CESSATION_REQUIRED Q14v authority before lease acquisition",
  async () => {
    const harness =
      createHarness();

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,

          createCessationWorkItem({
            unsuitabilityDecidedAt:
              null,
          }),
        ),
      /must expose complete persisted Q14v authority/,
    );

    assert.equal(
      harness.calls.acquire.length,
      0,
    );
  },
);

test(
  "BUSY lease performs no Q14ac persistence or release",
  async () => {
    const harness =
      createHarness({
        acquireState:
          "BUSY",
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION,
    );

    assert.equal(
      result.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      result.busyUntil,
      "2026-08-24T11:05:00.000Z",
    );

    assert.equal(
      result.cessation,
      null,
    );

    assert.equal(
      result.leaseRelease,
      null,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );

    assert.equal(
      harness.calls.release.length,
      0,
    );
  },
);

test(
  "CESSATION_REQUIRED maps only scope lease and Q14v identity into Q14ac",
  async () => {
    const harness =
      createHarness();

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "CESSATION_PERSISTED",
    );

    assert.deepEqual(
      harness.calls.acquire[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,

        leaseSeconds:
          60,
      },
    );

    assert.deepEqual(
      harness.calls.persist[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,

        unsuitabilityCheckpointId:
          UNSUITABILITY_CHECKPOINT_ID,
      },
    );

    assert.equal(
      result.cessation?.historicalMembershipId,
      MEMBERSHIP_ID,
    );

    assert.equal(
      result.cessation?.ceasedAt,
      DECIDED_AT,
    );

    assert.deepEqual(
      harness.calls.release[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,
      },
    );

    assert.deepEqual(
      result.leaseRelease,
      {
        state:
          "RELEASED",

        error:
          null,
      },
    );
  },
);

test(
  "runner rejects a Q14ac result for a different historical membership and releases the lease",
  async () => {
    const harness =
      createHarness({
        cessationOverrides: {
          historicalMembershipId:
            "99999999-9999-4999-8999-999999999999",
        },
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /different historical membership than discovery/,
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "runner verifies database-derived ceasedAt equals persisted Q14v decidedAt",
  async () => {
    const harness =
      createHarness({
        cessationOverrides: {
          ceasedAt:
            "2026-08-24T11:00:03.000Z",
        },
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /cessation time does not equal the persisted Q14v decision time/,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "Q14ac failure still releases the acquired lease",
  async () => {
    const harness =
      createHarness({
        persistError:
          new Error(
            "synthetic Q14ac failure",
          ),
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /synthetic Q14ac failure/,
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "release failure does not erase an already persisted effective cessation",
  async () => {
    const harness =
      createHarness({
        releaseError:
          new Error(
            "synthetic cessation release failure",
          ),
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "CESSATION_PERSISTED",
    );

    assert.equal(
      result.cessation?.cessationId,
      CESSATION_ID,
    );

    assert.deepEqual(
      result.leaseRelease,
      {
        state:
          "ERROR",

        error:
          "synthetic cessation release failure",
      },
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);
