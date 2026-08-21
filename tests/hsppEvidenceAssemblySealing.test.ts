import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC,
  HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION,
  sealHsppEvidenceAssembly,
} from "../lib/hspp/sealHsppEvidenceAssembly";

function createSupabaseMock(options?: { data?: unknown; error?: unknown }) {
  const calls: Array<{
    functionName: string;
    args: Record<string, unknown>;
  }> = [];

  const data =
    options && "data" in options
      ? options.data
      : [
          {
            assembly_id: "11111111-1111-4111-8111-111111111111",

            organization_id: "22222222-2222-4222-8222-222222222222",

            assembly_state: "SEALED",

            sealed_at: "2026-08-21T18:45:00.000Z",
          },
        ];

  const error = options && "error" in options ? options.error : null;

  const supabase = {
    async rpc(functionName: string, args: Record<string, unknown>) {
      calls.push({
        functionName,
        args,
      });

      return {
        data,
        error,
      };
    },
  };

  return {
    supabase,
    calls,
  };
}

test("B07C3 seals one organization-scoped OPEN assembly through one RPC", async () => {
  const mock = createSupabaseMock();

  const result = await sealHsppEvidenceAssembly({
    supabase: mock.supabase as any,

    organizationId: "22222222-2222-4222-8222-222222222222",

    assemblyId: "11111111-1111-4111-8111-111111111111",
  });

  assert.equal(mock.calls.length, 1);

  assert.equal(mock.calls[0].functionName, HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC);

  assert.deepEqual(mock.calls[0].args, {
    p_organization_id: "22222222-2222-4222-8222-222222222222",

    p_assembly_id: "11111111-1111-4111-8111-111111111111",
  });

  assert.equal(result.sealingVersion, HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION);

  assert.equal(result.assemblyState, "SEALED");

  assert.equal(result.sealedAt, "2026-08-21T18:45:00.000Z");
});

test("B07C3 rejects blank organization identity before RPC", async () => {
  const mock = createSupabaseMock();

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "   ",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    /organizationId is required/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C3 rejects blank assembly identity before RPC", async () => {
  const mock = createSupabaseMock();

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "   ",
      }),

    /assemblyId is required/,
  );

  assert.equal(mock.calls.length, 0);
});

test("B07C3 propagates database sealing failure", async () => {
  const expectedError = new Error(
    "HSPP evidence assembly is not OPEN and cannot be sealed.",
  );

  const mock = createSupabaseMock({
    data: null,
    error: expectedError,
  });

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    expectedError,
  );

  assert.equal(mock.calls.length, 1);
});

test("B07C3 fails closed when RPC returns wrong assembly identity", async () => {
  const mock = createSupabaseMock({
    data: [
      {
        assembly_id: "99999999-9999-4999-8999-999999999999",

        organization_id: "22222222-2222-4222-8222-222222222222",

        assembly_state: "SEALED",

        sealed_at: "2026-08-21T18:45:00.000Z",
      },
    ],
  });

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    /returned an invalid result/,
  );
});

test("B07C3 fails closed when RPC returns wrong organization identity", async () => {
  const mock = createSupabaseMock({
    data: [
      {
        assembly_id: "11111111-1111-4111-8111-111111111111",

        organization_id: "33333333-3333-4333-8333-333333333333",

        assembly_state: "SEALED",

        sealed_at: "2026-08-21T18:45:00.000Z",
      },
    ],
  });

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    /returned an invalid result/,
  );
});

test("B07C3 fails closed unless database confirms SEALED state", async () => {
  const mock = createSupabaseMock({
    data: [
      {
        assembly_id: "11111111-1111-4111-8111-111111111111",

        organization_id: "22222222-2222-4222-8222-222222222222",

        assembly_state: "OPEN",

        sealed_at: null,
      },
    ],
  });

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    /returned an invalid result/,
  );
});

test("B07C3 fails closed when sealed_at is absent", async () => {
  const mock = createSupabaseMock({
    data: [
      {
        assembly_id: "11111111-1111-4111-8111-111111111111",

        organization_id: "22222222-2222-4222-8222-222222222222",

        assembly_state: "SEALED",

        sealed_at: null,
      },
    ],
  });

  await assert.rejects(
    () =>
      sealHsppEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "11111111-1111-4111-8111-111111111111",
      }),

    /returned an invalid result/,
  );
});
