import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_RPC,
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_WRITER_VERSION,
  recordHsppAssemblyAssessmentCompletion,
} from "../lib/hspp/recordHsppAssemblyAssessmentCompletion";

import { HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedOperationalAssessment";

import type { RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID = "22222222-2222-4222-8222-222222222222";

const CREATED_AT = "2026-08-22T14:22:00.000Z";

function deniedTerminal(
  overrides: Record<string, unknown> = {},
): RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult {
  return {
    runnerVersion:
      "hspp-sealed-assembly-corroborated-operational-assessment-persistence-routing-runner-v1",
    operationalAssessmentRoutingRunnerVersion: "test-q11",
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
    targetMemberOrdinal: 1,
    branch: "MEMBER_CORROBORATION_DENIED",
    operationalAssessmentRoutingRun: {},
    persistenceVersion: null,
    persistenceResult: null,
    ...overrides,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult;
}

function eligibleTerminal(
  overrides: Record<string, unknown> = {},
): RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult {
  return {
    runnerVersion:
      "hspp-sealed-assembly-corroborated-operational-assessment-persistence-routing-runner-v1",
    operationalAssessmentRoutingRunnerVersion: "test-q11",
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
    targetMemberOrdinal: 1,
    branch: "MEMBER_CORROBORATION_ELIGIBLE",
    operationalAssessmentRoutingRun: {},
    persistenceVersion:
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
    persistenceResult: {
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
    },
    ...overrides,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult;
}

function mockSupabase(data: unknown, error: unknown = null) {
  const calls: Array<{
    name: string;
    args: unknown;
  }> = [];

  const supabase = {
    rpc: async (name: string, args: unknown) => {
      calls.push({
        name,
        args,
      });

      return {
        data,
        error,
      };
    },
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}

function canonicalRow() {
  return {
    organization_id: ORGANIZATION_ID,
    assembly_id: ASSEMBLY_ID,
    completion_version: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,
    created_at: CREATED_AT,
  };
}

test("Q13d5 records a terminal denied Q12 result through exactly one RPC", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  const result = await recordHsppAssemblyAssessmentCompletion({
    supabase,
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
    terminalResult: deniedTerminal(),
  });

  assert.equal(calls.length, 1);

  assert.equal(calls[0]?.name, HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_RPC);

  assert.deepEqual(calls[0]?.args, {
    p_organization_id: ORGANIZATION_ID,
    p_assembly_id: ASSEMBLY_ID,
  });

  assert.deepEqual(result, {
    writerVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_WRITER_VERSION,
    completionVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
    createdAt: CREATED_AT,
  });
});

test("Q13d5 accepts a terminal eligible Q12 persistence result", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  await recordHsppAssemblyAssessmentCompletion({
    supabase,
    organizationId: ORGANIZATION_ID,
    assemblyId: ASSEMBLY_ID,
    terminalResult: eligibleTerminal(),
  });

  assert.equal(calls.length, 1);
});

test("Q13d5 rejects a malformed denied terminal result before RPC", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal({
        persistenceVersion: "unexpected",
      }),
    }),
    /terminal denied Q12 result/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d5 rejects an eligible result without terminal Q6 persistence", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: eligibleTerminal({
        persistenceResult: null,
      }),
    }),
    /terminal eligible Q12 persistence result/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d5 rejects a terminal result for another organization", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal({
        organizationId: "33333333-3333-4333-8333-333333333333",
      }),
    }),
    /wrong organization/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d5 rejects a terminal result for another assembly", async () => {
  const { supabase, calls } = mockSupabase([canonicalRow()]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal({
        assemblyId: "44444444-4444-4444-8444-444444444444",
      }),
    }),
    /wrong assembly/,
  );

  assert.equal(calls.length, 0);
});

test("Q13d5 propagates an RPC error", async () => {
  const expectedError = new Error("rpc failure");

  const { supabase } = mockSupabase(null, expectedError);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal(),
    }),
    expectedError,
  );
});

test("Q13d5 requires exactly one completion row", async () => {
  for (const rows of [[], [canonicalRow(), canonicalRow()]]) {
    const { supabase } = mockSupabase(rows);

    await assert.rejects(
      recordHsppAssemblyAssessmentCompletion({
        supabase,
        organizationId: ORGANIZATION_ID,
        assemblyId: ASSEMBLY_ID,
        terminalResult: deniedTerminal(),
      }),
      /invalid result/,
    );
  }
});

test("Q13d5 rejects a completion row for the wrong identity", async () => {
  const { supabase } = mockSupabase([
    {
      ...canonicalRow(),
      assembly_id: "55555555-5555-4555-8555-555555555555",
    },
  ]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal(),
    }),
    /wrong assembly/,
  );
});

test("Q13d5 rejects an unsupported completion version", async () => {
  const { supabase } = mockSupabase([
    {
      ...canonicalRow(),
      completion_version: "unsupported",
    },
  ]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal(),
    }),
    /unsupported completion version/,
  );
});

test("Q13d5 rejects invalid completion persistence provenance", async () => {
  const { supabase } = mockSupabase([
    {
      ...canonicalRow(),
      created_at: "not-a-date",
    },
  ]);

  await assert.rejects(
    recordHsppAssemblyAssessmentCompletion({
      supabase,
      organizationId: ORGANIZATION_ID,
      assemblyId: ASSEMBLY_ID,
      terminalResult: deniedTerminal(),
    }),
    /valid date-time/,
  );
});
