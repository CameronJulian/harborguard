import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_RPC,
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_WRITER_VERSION,
  recordHsppAssemblyAssessmentCompletionUnderExecutionLease,
} from "../lib/hspp/recordHsppAssemblyAssessmentCompletionUnderExecutionLease";

import {
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,
} from "../lib/hspp/recordHsppAssemblyAssessmentCompletion";

const organizationId =
  "11111111-1111-4111-8111-111111111111";

const assemblyId =
  "22222222-2222-4222-8222-222222222222";

const leaseToken =
  "33333333-3333-4333-8333-333333333333";

const createdAt =
  "2026-08-22T15:50:00.000Z";

const terminalDeniedResult = {
  organizationId,
  assemblyId,

  branch:
    "MEMBER_CORROBORATION_DENIED",

  persistenceVersion:
    null,

  persistenceResult:
    null,
} as any;

const persistedRow = {
  organization_id:
    organizationId,

  assembly_id:
    assemblyId,

  completion_version:
    HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

  created_at:
    createdAt,
};

function createSupabase(
  data: unknown = [
    persistedRow,
  ],
  error: unknown = null
) {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase = {
    async rpc(
      name: string,
      args: Record<string, unknown>
    ) {
      calls.push({
        name,
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

function input(
  supabase: any
) {
  return {
    supabase,
    organizationId,
    assemblyId,
    leaseToken,
    terminalResult:
      terminalDeniedResult,
  };
}

test(
  "Q13e5b records completion with exact organization assembly and lease token",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    const result =
      await recordHsppAssemblyAssessmentCompletionUnderExecutionLease(
        input(
          supabase as any
        )
      );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].name,
      HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_RPC
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          organizationId,

        p_assembly_id:
          assemblyId,

        p_lease_token:
          leaseToken,
      }
    );

    assert.deepEqual(
      result,
      {
        writerVersion:
          HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_WRITER_VERSION,

        completionVersion:
          HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

        organizationId,

        assemblyId,

        createdAt,
      }
    );
  }
);

test(
  "Q13e5b propagates stale-owner lease rejection",
  async () => {
    const {
      supabase,
    } =
      createSupabase(
        null,
        new Error(
          "HSPP assessment execution lease is owned by another token"
        )
      );

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /owned by another token/
    );
  }
);

test(
  "Q13e5b rejects invalid lease token before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          leaseToken:
            "not-a-uuid",
        }),
      /leaseToken must be a UUID/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5b rejects terminal result from the wrong organization before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          terminalResult: {
            ...terminalDeniedResult,

            organizationId:
              "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        }),
      /wrong organization/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5b rejects terminal result from the wrong assembly before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          terminalResult: {
            ...terminalDeniedResult,

            assemblyId:
              "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          },
        }),
      /wrong assembly/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5b rejects malformed denied terminal result before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          terminalResult: {
            ...terminalDeniedResult,

            persistenceVersion:
              "unexpected",
          },
        }),
      /exact terminal denied Q12 result/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5b rejects a non-canonical terminal branch before RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          terminalResult: {
            ...terminalDeniedResult,

            branch:
              "UNKNOWN_BRANCH",
          },
        }),
      /canonical terminal Q12 branch/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5b rejects an invalid RPC row count",
  async () => {
    const {
      supabase,
    } =
      createSupabase(
        []
      );

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /returned an invalid result/
    );
  }
);

test(
  "Q13e5b rejects an unsupported completion version",
  async () => {
    const {
      supabase,
    } =
      createSupabase([
        {
          ...persistedRow,

          completion_version:
            "unsupported",
        },
      ]);

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /unsupported completion version/
    );
  }
);

test(
  "Q13e5b rejects invalid completion persistence provenance",
  async () => {
    const {
      supabase,
    } =
      createSupabase([
        {
          ...persistedRow,

          created_at:
            "not-a-time",
        },
      ]);

    await assert.rejects(
      () =>
        recordHsppAssemblyAssessmentCompletionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /completion.createdAt must be a valid date-time string/
    );
  }
);
