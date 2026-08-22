import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { HsppAssemblyRecoveryWorkItem } from "../lib/hspp/readHsppAssemblyRecoveryWorkItems";

import {
  HSPP_SEALED_ASSEMBLY_RECOVERY_ASSESSMENT_RUNNER_VERSION,
  runHsppSealedAssemblyRecoveryAssessment,
} from "../lib/hspp/runHsppSealedAssemblyRecoveryAssessment";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID = "22222222-2222-4222-8222-222222222222";

const COMPLETION_CREATED_AT = "2026-08-22T14:45:00.000Z";

const PROPOSED_ASSESSED_AT = "2026-08-22T15:00:00.000Z";

const LEASE_TOKEN = "33333333-3333-4333-8333-333333333333";

const LEASE_SECONDS = 300;

const LEASE_ACQUIRED_AT = "2026-08-22T15:01:00.000Z";

const LEASE_RENEWED_AT = "2026-08-22T15:01:00.000Z";

const LEASE_EXPIRES_AT = "2026-08-22T15:06:00.000Z";

type RecordedCall =
  | {
      method: "from";
      table: string;
    }
  | {
      method: "select";
      columns: string;
    }
  | {
      method: "eq";
      column: string;
      value: unknown;
    }
  | {
      method: "maybeSingle";
    }
  | {
      method: "rpc";
      name: string;
      args: unknown;
    };

type MockResult = {
  completionData?: unknown;
  completionError?: unknown;

  rpcData?: unknown;
  rpcError?: unknown;
};

function makeWorkItem(
  overrides: Record<string, unknown> = {},
): HsppAssemblyRecoveryWorkItem {
  return {
    organizationId: ORGANIZATION_ID,

    assemblyId: ASSEMBLY_ID,

    assemblyState: "SEALED",

    sealedAt: "2026-08-22T14:30:00.000Z",

    ...overrides,
  } as unknown as HsppAssemblyRecoveryWorkItem;
}

function canonicalCompletionRow() {
  return {
    organization_id: ORGANIZATION_ID,

    assembly_id: ASSEMBLY_ID,

    completion_version: "hspp-assembly-assessment-completion-v1",

    created_at: COMPLETION_CREATED_AT,
  };
}

function mockSupabase(result: MockResult = {}) {
  const calls: RecordedCall[] = [];

  const builder = {
    select(columns: string) {
      calls.push({
        method: "select",

        columns,
      });

      return builder;
    },

    eq(column: string, value: unknown) {
      calls.push({
        method: "eq",

        column,

        value,
      });

      return builder;
    },

    async maybeSingle() {
      calls.push({
        method: "maybeSingle",
      });

      return {
        data: result.completionData ?? null,

        error: result.completionError ?? null,
      };
    },
  };

  const supabase = {
    from(table: string) {
      calls.push({
        method: "from",

        table,
      });

      return builder;
    },

    async rpc(name: string, args: unknown) {
      calls.push({
        method: "rpc",

        name,

        args,
      });

      return {
        data: result.rpcData ?? null,

        error: result.rpcError ?? null,
      };
    },
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}

test("Q13d7 rejects a blank work-item organization before recovery I/O", async () => {
  const { supabase, calls } = mockSupabase();

  await assert.rejects(
    runHsppSealedAssemblyRecoveryAssessment({
      supabase,

      workItem: makeWorkItem({
        organizationId: "   ",
      }),

      proposedAssessedAt: PROPOSED_ASSESSED_AT,

      leaseToken: LEASE_TOKEN,

      leaseSeconds: LEASE_SECONDS,
    }),
    /workItem\.organizationId is required/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d7 rejects a blank work-item assembly before recovery I/O", async () => {
  const { supabase, calls } = mockSupabase();

  await assert.rejects(
    runHsppSealedAssemblyRecoveryAssessment({
      supabase,

      workItem: makeWorkItem({
        assemblyId: "",
      }),

      proposedAssessedAt: PROPOSED_ASSESSED_AT,

      leaseToken: LEASE_TOKEN,

      leaseSeconds: LEASE_SECONDS,
    }),
    /workItem\.assemblyId is required/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d7 rejects a non-SEALED recovery work item before recovery I/O", async () => {
  const { supabase, calls } = mockSupabase();

  await assert.rejects(
    runHsppSealedAssemblyRecoveryAssessment({
      supabase,

      workItem: makeWorkItem({
        assemblyState: "OPEN",
      }),

      proposedAssessedAt: PROPOSED_ASSESSED_AT,

      leaseToken: LEASE_TOKEN,

      leaseSeconds: LEASE_SECONDS,
    }),
    /only a persisted SEALED assembly recovery work item/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d7 stops at ALREADY_COMPLETED before retry identity or Q12 work", async () => {
  const { supabase, calls } = mockSupabase({
    completionData: canonicalCompletionRow(),
  });

  const result = await runHsppSealedAssemblyRecoveryAssessment({
    supabase,

    workItem: makeWorkItem(),

    /*
     * This is intentionally invalid.
     *
     * Existing completion must terminate recovery before the proposal is
     * consumed by Q13d2.
     */
    proposedAssessedAt: "not-a-timestamp",

    leaseToken: LEASE_TOKEN,

    leaseSeconds: LEASE_SECONDS,
  });

  assert.deepEqual(result, {
    runnerVersion: HSPP_SEALED_ASSEMBLY_RECOVERY_ASSESSMENT_RUNNER_VERSION,

    branch: "ALREADY_COMPLETED",

    completion: {
      readerVersion: "hspp-assembly-assessment-completion-reader-v1",

      completionVersion: "hspp-assembly-assessment-completion-v1",

      organizationId: ORGANIZATION_ID,

      assemblyId: ASSEMBLY_ID,

      createdAt: COMPLETION_CREATED_AT,
    },

    retryIdentity: null,

    terminalResult: null,
  });

  assert.deepEqual(calls, [
    {
      method: "from",

      table: "hspp_assembly_assessment_completions",
    },

    {
      method: "select",

      columns: "organization_id, assembly_id, completion_version, created_at",
    },

    {
      method: "eq",

      column: "organization_id",

      value: ORGANIZATION_ID,
    },

    {
      method: "eq",

      column: "assembly_id",

      value: ASSEMBLY_ID,
    },

    {
      method: "maybeSingle",
    },
  ]);
});

test("Q13d7 propagates completion-preflight failure before retry identity", async () => {
  const expectedError = new Error("completion preflight failed");

  const { supabase, calls } = mockSupabase({
    completionError: expectedError,
  });

  await assert.rejects(
    runHsppSealedAssemblyRecoveryAssessment({
      supabase,

      workItem: makeWorkItem(),

      proposedAssessedAt: PROPOSED_ASSESSED_AT,

      leaseToken: LEASE_TOKEN,

      leaseSeconds: LEASE_SECONDS,
    }),
    expectedError,
  );

  assert.equal(
    calls.some((call) => call.method === "rpc"),
    false,
  );
});

test("Q13d7 returns EXECUTION_BUSY before retry identity when completion is absent", async () => {
  const { supabase, calls } = mockSupabase({
    completionData: null,

    rpcData: [
      {
        acquire_state: "BUSY",

        returned_lease_token: null,

        lease_acquired_at: LEASE_ACQUIRED_AT,

        lease_renewed_at: LEASE_RENEWED_AT,

        lease_expires_at: LEASE_EXPIRES_AT,
      },
    ],
  });

  const result = await runHsppSealedAssemblyRecoveryAssessment({
    supabase,

    workItem: makeWorkItem(),

    proposedAssessedAt: "not-a-timestamp",

    leaseToken: LEASE_TOKEN,

    leaseSeconds: LEASE_SECONDS,
  });

  assert.equal(result.branch, "EXECUTION_BUSY");

  if (result.branch !== "EXECUTION_BUSY") {
    throw new Error("Expected EXECUTION_BUSY.");
  }

  assert.equal(result.completion, null);
  assert.equal(result.retryIdentity, null);
  assert.equal(result.terminalResult, null);
  assert.equal(result.leaseAcquisition.state, "BUSY");
  assert.equal(result.leaseAcquisition.leaseToken, null);

  const rpcCalls = calls.filter(
    (
      call,
    ): call is Extract<
      RecordedCall,
      {
        method: "rpc";
      }
    > => call.method === "rpc",
  );

  assert.equal(rpcCalls.length, 1);

  assert.deepEqual(rpcCalls[0], {
    method: "rpc",

    name: "acquire_hspp_assembly_assessment_execution_lease",

    args: {
      p_organization_id: ORGANIZATION_ID,

      p_assembly_id: ASSEMBLY_ID,

      p_lease_token: LEASE_TOKEN,

      p_lease_seconds: LEASE_SECONDS,
    },
  });
});

test("Q13d7 re-reads completion after lease acquisition before claiming retry identity", async () => {
  const { supabase, calls } = mockSupabase({
    completionData: null,

    rpcData: [
      {
        acquire_state: "ACQUIRED",

        returned_lease_token: LEASE_TOKEN,

        lease_acquired_at: LEASE_ACQUIRED_AT,

        lease_renewed_at: LEASE_RENEWED_AT,

        lease_expires_at: LEASE_EXPIRES_AT,
      },
    ],
  });

  await assert.rejects(
    runHsppSealedAssemblyRecoveryAssessment({
      supabase,

      workItem: makeWorkItem(),

      proposedAssessedAt: PROPOSED_ASSESSED_AT,

      leaseToken: LEASE_TOKEN,

      leaseSeconds: LEASE_SECONDS,
    }),
  );

  const maybeSingleCalls = calls.filter(
    (call) => call.method === "maybeSingle",
  );

  assert.equal(maybeSingleCalls.length, 2);

  const rpcCalls = calls.filter(
    (
      call,
    ): call is Extract<
      RecordedCall,
      {
        method: "rpc";
      }
    > => call.method === "rpc",
  );

  assert.equal(rpcCalls.length, 3);

  assert.deepEqual(rpcCalls[0], {
    method: "rpc",

    name: "acquire_hspp_assembly_assessment_execution_lease",

    args: {
      p_organization_id: ORGANIZATION_ID,

      p_assembly_id: ASSEMBLY_ID,

      p_lease_token: LEASE_TOKEN,

      p_lease_seconds: LEASE_SECONDS,
    },
  });

  assert.deepEqual(rpcCalls[1], {
    method: "rpc",

    name: "claim_hspp_assembly_assessment_retry_identity",

    args: {
      p_organization_id: ORGANIZATION_ID,

      p_assembly_id: ASSEMBLY_ID,

      p_proposed_assessed_at: PROPOSED_ASSESSED_AT,
    },
  });

  assert.deepEqual(rpcCalls[2], {
    method: "rpc",

    name: "release_hspp_assembly_assessment_execution_lease",

    args: {
      p_organization_id: ORGANIZATION_ID,

      p_assembly_id: ASSEMBLY_ID,

      p_lease_token: LEASE_TOKEN,
    },
  });
});
