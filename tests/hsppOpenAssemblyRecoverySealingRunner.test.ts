import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { HsppAssemblyRecoveryWorkItem } from "../lib/hspp/readHsppAssemblyRecoveryWorkItems";

import {
  HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION,
  runHsppOpenAssemblyRecoverySealing,
} from "../lib/hspp/runHsppOpenAssemblyRecoverySealing";

import {
  HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC,
  HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION,
} from "../lib/hspp/sealHsppEvidenceAssembly";

type RpcCall = {
  functionName: string;

  args: Record<string, unknown>;
};

type FakeRpcResult = {
  data: unknown;

  error: Error | null;
};

function createSupabase(
  result: FakeRpcResult = {
    data: [
      {
        assembly_id: "assembly-open-1",
        organization_id: "organization-1",
        assembly_state: "SEALED",
        sealed_at: "2026-08-22T13:30:00.000Z",
      },
    ],
    error: null,
  },
): {
  supabase: SupabaseClient;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];

  const supabase = {
    async rpc(
      functionName: string,
      args: Record<string, unknown>,
    ): Promise<FakeRpcResult> {
      calls.push({
        functionName,
        args,
      });

      return result;
    },
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}

function openWorkItem(
  overrides: Partial<HsppAssemblyRecoveryWorkItem> = {},
): HsppAssemblyRecoveryWorkItem {
  return {
    assemblyId: "assembly-open-1",

    organizationId: "organization-1",

    assemblyVersion: "hspp-evidence-assembly-v1",

    membershipPolicyVersion: "hspp-assembly-membership-v1",

    assemblyState: "OPEN",

    createdAt: "2026-08-22T13:00:00.000Z",

    sealedAt: null,

    ...overrides,
  };
}

test("Q13c exposes one explicit versioned OPEN recovery sealing boundary", () => {
  assert.equal(
    HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION,
    "hspp-open-assembly-recovery-sealing-runner-v1",
  );
});

test("Q13c seals one exact OPEN recovery work item through the existing sealing boundary", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem();

  const result = await runHsppOpenAssemblyRecoverySealing({
    supabase: mock.supabase,

    workItem,
  });

  assert.deepEqual(mock.calls, [
    {
      functionName: HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC,

      args: {
        p_organization_id: "organization-1",

        p_assembly_id: "assembly-open-1",
      },
    },
  ]);

  assert.equal(
    result.runnerVersion,
    HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION,
  );

  assert.equal(result.sealingVersion, HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION);

  assert.equal(result.workItem, workItem);

  assert.deepEqual(result.sealedAssembly, {
    sealingVersion: HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION,

    organizationId: "organization-1",

    assemblyId: "assembly-open-1",

    assemblyState: "SEALED",

    sealedAt: "2026-08-22T13:30:00.000Z",
  });
});

test("Q13c rejects SEALED recovery work before any sealing call", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem({
    assemblyState: "SEALED",

    sealedAt: "2026-08-22T13:30:00.000Z",
  });

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem,
      }),
    /only a persisted OPEN assembly recovery work item/,
  );

  assert.deepEqual(mock.calls, []);
});

test("Q13c rejects an OPEN work item carrying sealedAt before any sealing call", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem({
    sealedAt: "2026-08-22T13:30:00.000Z",
  });

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem,
      }),
    /OPEN recovery work must not already contain sealedAt/,
  );

  assert.deepEqual(mock.calls, []);
});

test("Q13c rejects blank recovery organization identity before sealing", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem({
    organizationId: "   ",
  });

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem,
      }),
    /workItem\.organizationId is required/,
  );

  assert.deepEqual(mock.calls, []);
});

test("Q13c rejects blank recovery assembly identity before sealing", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem({
    assemblyId: "   ",
  });

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem,
      }),
    /workItem\.assemblyId is required/,
  );

  assert.deepEqual(mock.calls, []);
});

test("Q13c propagates a stale-OPEN database refusal without retry or fallback", async () => {
  const expectedError = new Error(
    "HSPP evidence assembly is not OPEN and cannot be sealed.",
  );

  const mock = createSupabase({
    data: null,

    error: expectedError,
  });

  const workItem = openWorkItem();

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem,
      }),
    (error) => error === expectedError,
  );

  assert.equal(mock.calls.length, 1);

  assert.deepEqual(mock.calls[0], {
    functionName: HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC,

    args: {
      p_organization_id: "organization-1",

      p_assembly_id: "assembly-open-1",
    },
  });
});

test("Q13c fails closed when the existing sealing boundary returns malformed state", async () => {
  const mock = createSupabase({
    data: [
      {
        assembly_id: "assembly-open-1",

        organization_id: "organization-1",

        assembly_state: "OPEN",

        sealed_at: null,
      },
    ],

    error: null,
  });

  await assert.rejects(
    () =>
      runHsppOpenAssemblyRecoverySealing({
        supabase: mock.supabase,

        workItem: openWorkItem(),
      }),
    /Atomic HSPP evidence assembly sealing returned an invalid result/,
  );

  assert.equal(mock.calls.length, 1);
});

test("Q13c does not reinterpret a successful SEALED result as assessment state", async () => {
  const mock = createSupabase();

  const workItem = openWorkItem();

  const result = await runHsppOpenAssemblyRecoverySealing({
    supabase: mock.supabase,

    workItem,
  });

  assert.equal(result.sealedAssembly.assemblyState, "SEALED");

  assert.equal("assessedAt" in result, false);

  assert.equal("persistenceResult" in result, false);

  assert.equal("completionState" in result, false);
});
