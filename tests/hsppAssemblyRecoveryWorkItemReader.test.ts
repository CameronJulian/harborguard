import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT,
  HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION,
  readHsppAssemblyRecoveryWorkItems,
} from "../lib/hspp/readHsppAssemblyRecoveryWorkItems";

type QueryCall =
  | {
      action: "from";
      value: string;
    }
  | {
      action: "select";
      value: string;
    }
  | {
      action: "eq";
      column: string;
      value: unknown;
    }
  | {
      action: "order";
      column: string;
      ascending: boolean | undefined;
    }
  | {
      action: "limit";
      value: number;
    };

type FakeResult = {
  data: unknown[] | null;
  error: Error | null;
};

function createSupabase(result: FakeResult): {
  supabase: SupabaseClient;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];

  const query: {
    select: (value: string) => typeof query;
    eq: (column: string, value: unknown) => typeof query;
    order: (
      column: string,
      options?: {
        ascending?: boolean;
      },
    ) => typeof query;
    limit: (value: number) => Promise<FakeResult>;
  } = {
    select(value) {
      calls.push({
        action: "select",
        value,
      });

      return query;
    },

    eq(column, value) {
      calls.push({
        action: "eq",
        column,
        value,
      });

      return query;
    },

    order(column, options) {
      calls.push({
        action: "order",
        column,
        ascending: options?.ascending,
      });

      return query;
    },

    async limit(value) {
      calls.push({
        action: "limit",
        value,
      });

      return result;
    },
  };

  const supabase = {
    from(table: string) {
      calls.push({
        action: "from",
        value: table,
      });

      return query;
    },
  } as unknown as SupabaseClient;

  return {
    supabase,
    calls,
  };
}

function openRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "assembly-open-1",
    organization_id: "organization-1",
    assembly_version: "hspp-evidence-assembly-v1",
    membership_policy_version: "hspp-assembly-membership-v1",
    assembly_state: "OPEN",
    created_at: "2026-08-22T10:00:00.000Z",
    sealed_at: null,
    ...overrides,
  };
}

function sealedRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "assembly-sealed-1",
    organization_id: "organization-1",
    assembly_version: "hspp-evidence-assembly-v1",
    membership_policy_version: "hspp-assembly-membership-v1",
    assembly_state: "SEALED",
    created_at: "2026-08-22T10:00:00.000Z",
    sealed_at: "2026-08-22T10:05:00.000Z",
    ...overrides,
  };
}

test("Q13b exposes one explicit versioned bounded discovery boundary", () => {
  assert.equal(
    HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION,
    "hspp-assembly-recovery-discovery-v1",
  );

  assert.equal(HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT, 100);
});

test("Q13b reads OPEN assemblies with exact organization state ordering and limit", async () => {
  const { supabase, calls } = createSupabase({
    data: [openRow()],
    error: null,
  });

  const result = await readHsppAssemblyRecoveryWorkItems({
    supabase,
    organizationId: "organization-1",
    assemblyState: "OPEN",
    limit: 7,
  });

  assert.deepEqual(calls, [
    {
      action: "from",
      value: "hspp_evidence_assemblies",
    },
    {
      action: "select",
      value:
        "id, organization_id, assembly_version, membership_policy_version, assembly_state, created_at, sealed_at",
    },
    {
      action: "eq",
      column: "organization_id",
      value: "organization-1",
    },
    {
      action: "eq",
      column: "assembly_state",
      value: "OPEN",
    },
    {
      action: "order",
      column: "created_at",
      ascending: true,
    },
    {
      action: "order",
      column: "id",
      ascending: true,
    },
    {
      action: "limit",
      value: 7,
    },
  ]);

  assert.deepEqual(result, {
    discoveryVersion: HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION,
    organizationId: "organization-1",
    assemblyState: "OPEN",
    requestedLimit: 7,
    workItems: [
      {
        assemblyId: "assembly-open-1",
        organizationId: "organization-1",
        assemblyVersion: "hspp-evidence-assembly-v1",
        membershipPolicyVersion: "hspp-assembly-membership-v1",
        assemblyState: "OPEN",
        createdAt: "2026-08-22T10:00:00.000Z",
        sealedAt: null,
      },
    ],
  });
});

test("Q13b reads SEALED assemblies without interpreting downstream completion", async () => {
  const { supabase, calls } = createSupabase({
    data: [sealedRow()],
    error: null,
  });

  const result = await readHsppAssemblyRecoveryWorkItems({
    supabase,
    organizationId: "organization-1",
    assemblyState: "SEALED",
    limit: 3,
  });

  assert.deepEqual(
    calls.filter((call) => call.action === "eq"),
    [
      {
        action: "eq",
        column: "organization_id",
        value: "organization-1",
      },
      {
        action: "eq",
        column: "assembly_state",
        value: "SEALED",
      },
    ],
  );

  assert.deepEqual(result.workItems[0], {
    assemblyId: "assembly-sealed-1",
    organizationId: "organization-1",
    assemblyVersion: "hspp-evidence-assembly-v1",
    membershipPolicyVersion: "hspp-assembly-membership-v1",
    assemblyState: "SEALED",
    createdAt: "2026-08-22T10:00:00.000Z",
    sealedAt: "2026-08-22T10:05:00.000Z",
  });
});

test("Q13b defaults the bounded limit to 100", async () => {
  const { supabase, calls } = createSupabase({
    data: [],
    error: null,
  });

  const result = await readHsppAssemblyRecoveryWorkItems({
    supabase,
    organizationId: "organization-1",
    assemblyState: "OPEN",
  });

  assert.equal(
    result.requestedLimit,
    HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT,
  );

  assert.deepEqual(calls.at(-1), {
    action: "limit",
    value: HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT,
  });

  assert.deepEqual(result.workItems, []);
});

test("Q13b preserves database ordering exactly", async () => {
  const { supabase } = createSupabase({
    data: [
      openRow({
        id: "assembly-a",
        created_at: "2026-08-22T09:00:00.000Z",
      }),
      openRow({
        id: "assembly-b",
        created_at: "2026-08-22T10:00:00.000Z",
      }),
    ],
    error: null,
  });

  const result = await readHsppAssemblyRecoveryWorkItems({
    supabase,
    organizationId: "organization-1",
    assemblyState: "OPEN",
    limit: 2,
  });

  assert.deepEqual(
    result.workItems.map((item) => item.assemblyId),
    ["assembly-a", "assembly-b"],
  );
});

test("Q13b rejects a blank organization before querying", async () => {
  const { supabase, calls } = createSupabase({
    data: [],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "   ",
        assemblyState: "OPEN",
      }),
    /organizationId is required/,
  );

  assert.deepEqual(calls, []);
});

test("Q13b rejects an unsupported lifecycle state before querying", async () => {
  const { supabase, calls } = createSupabase({
    data: [],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "PENDING" as never,
      }),
    /assemblyState must be OPEN or SEALED/,
  );

  assert.deepEqual(calls, []);
});

test("Q13b rejects invalid bounds before querying", async () => {
  for (const limit of [0, -1, 101, 1.5]) {
    const { supabase, calls } = createSupabase({
      data: [],
      error: null,
    });

    await assert.rejects(
      () =>
        readHsppAssemblyRecoveryWorkItems({
          supabase,
          organizationId: "organization-1",
          assemblyState: "OPEN",
          limit,
        }),
      /limit must be an integer between 1 and 100/,
    );

    assert.deepEqual(calls, []);
  }
});

test("Q13b propagates the assembly read error without fallback mutation", async () => {
  const databaseError = new Error("assembly recovery read failed");

  const { supabase } = createSupabase({
    data: null,
    error: databaseError,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
        limit: 1,
      }),
    (error) => error === databaseError,
  );
});

test("Q13b rejects a persisted assembly from another organization", async () => {
  const { supabase } = createSupabase({
    data: [
      openRow({
        organization_id: "organization-2",
      }),
    ],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
      }),
    /wrong organization/,
  );
});

test("Q13b rejects a persisted assembly outside the requested state", async () => {
  const { supabase } = createSupabase({
    data: [sealedRow()],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
      }),
    /outside the requested state/,
  );
});

test("Q13b rejects an unsupported persisted assembly state", async () => {
  const { supabase } = createSupabase({
    data: [
      openRow({
        assembly_state: "UNKNOWN",
      }),
    ],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
      }),
    /unsupported assembly state/,
  );
});

test("Q13b enforces the persisted OPEN sealed-at invariant", async () => {
  const { supabase } = createSupabase({
    data: [
      openRow({
        sealed_at: "2026-08-22T10:05:00.000Z",
      }),
    ],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
      }),
    /OPEN HSPP assembly recovery work must not contain sealed_at/,
  );
});

test("Q13b enforces the persisted SEALED sealed-at invariant", async () => {
  const { supabase } = createSupabase({
    data: [
      sealedRow({
        sealed_at: null,
      }),
    ],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "SEALED",
      }),
    /SEALED HSPP assembly recovery work requires sealed_at/,
  );
});

test("Q13b rejects malformed persisted lifecycle identity", async () => {
  const { supabase } = createSupabase({
    data: [
      openRow({
        id: "",
      }),
    ],
    error: null,
  });

  await assert.rejects(
    () =>
      readHsppAssemblyRecoveryWorkItems({
        supabase,
        organizationId: "organization-1",
        assemblyState: "OPEN",
      }),
    /invalid assembly id/,
  );
});
