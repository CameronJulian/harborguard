import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_RPC,
  HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION,
  HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION,
  claimHsppAssemblyAssessmentRetryIdentity,
} from "../lib/hspp/claimHsppAssemblyAssessmentRetryIdentity";

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
        organization_id: "organization-1",

        assembly_id: "assembly-1",

        retry_identity_version: "hspp-assembly-assessment-retry-identity-v1",

        assessed_at: "2026-08-22T13:30:00.000Z",

        created_at: "2026-08-22T13:31:00.000Z",
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

test("Q13d2 exposes explicit claim and identity versions", () => {
  assert.equal(
    HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION,
    "hspp-assembly-assessment-retry-identity-claim-v1",
  );

  assert.equal(
    HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION,
    "hspp-assembly-assessment-retry-identity-v1",
  );
});

test("Q13d2 calls the exact claim-or-recover RPC once", async () => {
  const mock = createSupabase();

  const result = await claimHsppAssemblyAssessmentRetryIdentity({
    supabase: mock.supabase,

    organizationId: "organization-1",

    assemblyId: "assembly-1",

    proposedAssessedAt: "2026-08-22T13:30:00.000Z",
  });

  assert.deepEqual(mock.calls, [
    {
      functionName: HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_RPC,

      args: {
        p_organization_id: "organization-1",

        p_assembly_id: "assembly-1",

        p_proposed_assessed_at: "2026-08-22T13:30:00.000Z",
      },
    },
  ]);

  assert.deepEqual(result, {
    claimVersion: HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION,

    retryIdentityVersion: HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION,

    organizationId: "organization-1",

    assemblyId: "assembly-1",

    assessedAt: "2026-08-22T13:30:00.000Z",

    createdAt: "2026-08-22T13:31:00.000Z",
  });
});

test("Q13d2 accepts an earlier persisted assessedAt over a later proposal", async () => {
  const mock = createSupabase({
    data: [
      {
        organization_id: "organization-1",

        assembly_id: "assembly-1",

        retry_identity_version: "hspp-assembly-assessment-retry-identity-v1",

        assessed_at: "2026-08-22T13:30:00.000Z",

        created_at: "2026-08-22T13:31:00.000Z",
      },
    ],

    error: null,
  });

  const result = await claimHsppAssemblyAssessmentRetryIdentity({
    supabase: mock.supabase,

    organizationId: "organization-1",

    assemblyId: "assembly-1",

    proposedAssessedAt: "2026-08-22T14:45:00.000Z",
  });

  assert.equal(
    mock.calls[0].args.p_proposed_assessed_at,
    "2026-08-22T14:45:00.000Z",
  );

  assert.equal(result.assessedAt, "2026-08-22T13:30:00.000Z");
});

test("Q13d2 rejects blank organization before RPC", async () => {
  const mock = createSupabase();

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "   ",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /organizationId is required/,
  );

  assert.equal(mock.calls.length, 0);
});

test("Q13d2 rejects blank assembly before RPC", async () => {
  const mock = createSupabase();

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "   ",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /assemblyId is required/,
  );

  assert.equal(mock.calls.length, 0);
});

test("Q13d2 rejects invalid proposed assessedAt before RPC", async () => {
  const mock = createSupabase();

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "not-a-timestamp",
      }),
    /proposedAssessedAt must be a valid timestamp/,
  );

  assert.equal(mock.calls.length, 0);
});

test("Q13d2 propagates RPC errors exactly", async () => {
  const expectedError = new Error(
    "HSPP assessment retry identity may be claimed only for a SEALED assembly.",
  );

  const mock = createSupabase({
    data: null,

    error: expectedError,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    (error) => error === expectedError,
  );

  assert.equal(mock.calls.length, 1);
});

test("Q13d2 requires exactly one RPC result row", async () => {
  const mock = createSupabase({
    data: [],

    error: null,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /claim returned an invalid result/,
  );
});

test("Q13d2 rejects a result for the wrong organization", async () => {
  const mock = createSupabase({
    data: [
      {
        organization_id: "organization-2",

        assembly_id: "assembly-1",

        retry_identity_version: "hspp-assembly-assessment-retry-identity-v1",

        assessed_at: "2026-08-22T13:30:00.000Z",

        created_at: "2026-08-22T13:31:00.000Z",
      },
    ],

    error: null,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /wrong organization/,
  );
});

test("Q13d2 rejects a result for the wrong assembly", async () => {
  const mock = createSupabase({
    data: [
      {
        organization_id: "organization-1",

        assembly_id: "assembly-2",

        retry_identity_version: "hspp-assembly-assessment-retry-identity-v1",

        assessed_at: "2026-08-22T13:30:00.000Z",

        created_at: "2026-08-22T13:31:00.000Z",
      },
    ],

    error: null,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /wrong assembly/,
  );
});

test("Q13d2 rejects unsupported persisted identity version", async () => {
  const mock = createSupabase({
    data: [
      {
        organization_id: "organization-1",

        assembly_id: "assembly-1",

        retry_identity_version: "unsupported-version",

        assessed_at: "2026-08-22T13:30:00.000Z",

        created_at: "2026-08-22T13:31:00.000Z",
      },
    ],

    error: null,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /unsupported identity version/,
  );
});

test("Q13d2 rejects malformed persisted timestamps", async () => {
  const mock = createSupabase({
    data: [
      {
        organization_id: "organization-1",

        assembly_id: "assembly-1",

        retry_identity_version: "hspp-assembly-assessment-retry-identity-v1",

        assessed_at: "invalid",

        created_at: "2026-08-22T13:31:00.000Z",
      },
    ],

    error: null,
  });

  await assert.rejects(
    () =>
      claimHsppAssemblyAssessmentRetryIdentity({
        supabase: mock.supabase,

        organizationId: "organization-1",

        assemblyId: "assembly-1",

        proposedAssessedAt: "2026-08-22T13:30:00.000Z",
      }),
    /retryIdentity\.assessedAt must be a valid timestamp/,
  );
});
