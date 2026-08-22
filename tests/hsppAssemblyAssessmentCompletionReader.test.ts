import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_READER_VERSION,
  readHsppAssemblyAssessmentCompletion,
} from "../lib/hspp/readHsppAssemblyAssessmentCompletion";

import { HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION } from "../lib/hspp/recordHsppAssemblyAssessmentCompletion";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID = "22222222-2222-4222-8222-222222222222";

const CREATED_AT = "2026-08-22T14:35:00.000Z";

type QueryResult = {
  data: unknown;
  error: unknown;
};

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
    };

function canonicalRow(overrides: Record<string, unknown> = {}) {
  return {
    organization_id: ORGANIZATION_ID,

    assembly_id: ASSEMBLY_ID,

    completion_version: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

    created_at: CREATED_AT,

    ...overrides,
  };
}

function mockSupabase(result: QueryResult) {
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

      return result;
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
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}

test("Q13d6 returns null when no immutable completion fact exists", async () => {
  const { supabase, calls } = mockSupabase({
    data: null,
    error: null,
  });

  const result = await readHsppAssemblyAssessmentCompletion({
    supabase,
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
  });

  assert.equal(result, null);

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

test("Q13d6 reconstructs one canonical immutable completion fact", async () => {
  const { supabase } = mockSupabase({
    data: canonicalRow(),
    error: null,
  });

  const result = await readHsppAssemblyAssessmentCompletion({
    supabase,
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
  });

  assert.deepEqual(result, {
    readerVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_READER_VERSION,

    completionVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

    organizationId: ORGANIZATION_ID,

    assemblyId: ASSEMBLY_ID,

    createdAt: CREATED_AT,
  });
});

test("Q13d6 rejects a completion fact from another organization", async () => {
  const { supabase } = mockSupabase({
    data: canonicalRow({
      organization_id: "33333333-3333-4333-8333-333333333333",
    }),
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    }),
    /wrong organization/,
  );
});

test("Q13d6 rejects a completion fact from another assembly", async () => {
  const { supabase } = mockSupabase({
    data: canonicalRow({
      assembly_id: "44444444-4444-4444-8444-444444444444",
    }),
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    }),
    /wrong assembly/,
  );
});

test("Q13d6 rejects an unsupported completion version", async () => {
  const { supabase } = mockSupabase({
    data: canonicalRow({
      completion_version: "unsupported",
    }),
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    }),
    /unsupported completion version/,
  );
});

test("Q13d6 rejects invalid completion persistence provenance", async () => {
  const { supabase } = mockSupabase({
    data: canonicalRow({
      created_at: "not-a-date",
    }),
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    }),
    /valid date-time/,
  );
});

test("Q13d6 propagates completion lookup errors", async () => {
  const expectedError = new Error("completion lookup failed");

  const { supabase } = mockSupabase({
    data: null,
    error: expectedError,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    }),
    expectedError,
  );
});

test("Q13d6 rejects a blank organization before database access", async () => {
  const { supabase, calls } = mockSupabase({
    data: null,
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: "   ",
      assemblyId: ASSEMBLY_ID,
    }),
    /organizationId is required/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d6 rejects a blank assembly before database access", async () => {
  const { supabase, calls } = mockSupabase({
    data: null,
    error: null,
  });

  await assert.rejects(
    readHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: "",
    }),
    /assemblyId is required/,
  );

  assert.equal(calls.length, 0);
});
