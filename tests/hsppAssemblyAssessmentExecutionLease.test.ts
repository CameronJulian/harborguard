import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC,
  HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_RPC,
  HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_RPC,
  acquireHsppAssemblyAssessmentExecutionLease,
  releaseHsppAssemblyAssessmentExecutionLease,
  renewHsppAssemblyAssessmentExecutionLease,
} from "../lib/hspp/hsppAssemblyAssessmentExecutionLease";

const organizationId =
  "11111111-1111-4111-8111-111111111111";

const assemblyId =
  "22222222-2222-4222-8222-222222222222";

const leaseToken =
  "33333333-3333-4333-8333-333333333333";

const acquiredAt =
  "2026-08-22T15:20:00.000Z";

const renewedAt =
  "2026-08-22T15:20:01.000Z";

const expiresAt =
  "2026-08-22T15:25:01.000Z";

function clientFor(
  expectedRpc: string,
  expectedArgs: Record<string, unknown>,
  data: unknown,
) {
  let calls = 0;

  return {
    client: {
      async rpc(
        rpcName: string,
        args: Record<string, unknown>,
      ) {
        calls += 1;

        assert.equal(
          rpcName,
          expectedRpc,
        );

        assert.deepEqual(
          args,
          expectedArgs,
        );

        return {
          data,
          error: null,
        };
      },
    } as any,

    calls: () => calls,
  };
}

test(
  "Q13e3 acquire returns exact caller-owned ownership token",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,

          p_lease_seconds:
            300,
        },
        [
          {
            acquire_state:
              "ACQUIRED",

            returned_lease_token:
              leaseToken,

            lease_acquired_at:
              acquiredAt,

            lease_renewed_at:
              renewedAt,

            lease_expires_at:
              expiresAt,
          },
        ],
      );

    const result =
      await acquireHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      });

    assert.equal(
      result.state,
      "ACQUIRED",
    );

    assert.equal(
      result.leaseToken,
      leaseToken,
    );

    assert.equal(
      result.expiresAt,
      expiresAt,
    );

    assert.equal(
      fake.calls(),
      1,
    );
  },
);

test(
  "Q13e3 busy acquire never exposes another owner token",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,

          p_lease_seconds:
            300,
        },
        [
          {
            acquire_state:
              "BUSY",

            returned_lease_token:
              null,

            lease_acquired_at:
              acquiredAt,

            lease_renewed_at:
              renewedAt,

            lease_expires_at:
              expiresAt,
          },
        ],
      );

    const result =
      await acquireHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      });

    assert.equal(
      result.state,
      "BUSY",
    );

    assert.equal(
      result.leaseToken,
      null,
    );

    assert.equal(
      fake.calls(),
      1,
    );
  },
);

test(
  "Q13e3 rejects an acquired result with a different owner token",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,

          p_lease_seconds:
            300,
        },
        [
          {
            acquire_state:
              "ACQUIRED",

            returned_lease_token:
              "44444444-4444-4444-8444-444444444444",

            lease_acquired_at:
              acquiredAt,

            lease_renewed_at:
              renewedAt,

            lease_expires_at:
              expiresAt,
          },
        ],
      );

    await assert.rejects(
      acquireHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      }),
      /exact caller-owned token/,
    );
  },
);

test(
  "Q13e3 renew preserves exact owner identity",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,

          p_lease_seconds:
            300,
        },
        [
          {
            renew_state:
              "RENEWED",

            lease_expires_at:
              expiresAt,
          },
        ],
      );

    const result =
      await renewHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      });

    assert.equal(
      result.state,
      "RENEWED",
    );

    assert.equal(
      result.leaseToken,
      leaseToken,
    );

    assert.equal(
      result.expiresAt,
      expiresAt,
    );

    assert.equal(
      fake.calls(),
      1,
    );
  },
);

test(
  "Q13e3 lost renewal returns no foreign expiry",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,

          p_lease_seconds:
            300,
        },
        [
          {
            renew_state:
              "LOST",

            lease_expires_at:
              null,
          },
        ],
      );

    const result =
      await renewHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      });

    assert.equal(
      result.state,
      "LOST",
    );

    assert.equal(
      result.expiresAt,
      null,
    );
  },
);

test(
  "Q13e3 release preserves exact owner token",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,
        },
        [
          {
            release_state:
              "RELEASED",
          },
        ],
      );

    const result =
      await releaseHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
      });

    assert.equal(
      result.state,
      "RELEASED",
    );

    assert.equal(
      result.leaseToken,
      leaseToken,
    );

    assert.equal(
      fake.calls(),
      1,
    );
  },
);

test(
  "Q13e3 release reports non-owner without inventing success",
  async () => {
    const fake =
      clientFor(
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_RPC,
        {
          p_organization_id:
            organizationId,

          p_assembly_id:
            assemblyId,

          p_lease_token:
            leaseToken,
        },
        [
          {
            release_state:
              "NOT_OWNER",
          },
        ],
      );

    const result =
      await releaseHsppAssemblyAssessmentExecutionLease({
        supabase: fake.client,
        organizationId,
        assemblyId,
        leaseToken,
      });

    assert.equal(
      result.state,
      "NOT_OWNER",
    );
  },
);

test(
  "Q13e3 rejects invalid lease duration before RPC",
  async () => {
    let calls = 0;

    const supabase = {
      async rpc() {
        calls += 1;

        return {
          data: [],
          error: null,
        };
      },
    } as any;

    await assert.rejects(
      acquireHsppAssemblyAssessmentExecutionLease({
        supabase,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 0,
      }),
      /between 1 and 3600/,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "Q13e3 propagates database errors",
  async () => {
    const databaseError =
      new Error("database unavailable");

    const supabase = {
      async rpc() {
        return {
          data: null,
          error: databaseError,
        };
      },
    } as any;

    await assert.rejects(
      acquireHsppAssemblyAssessmentExecutionLease({
        supabase,
        organizationId,
        assemblyId,
        leaseToken,
        leaseSeconds: 300,
      }),
      databaseError,
    );
  },
);
