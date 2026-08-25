import assert from "node:assert/strict";
import test from "node:test";

import {
  persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease,
} from "../lib/hspp/persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const LEASE_TOKEN =
  "33333333-3333-4333-8333-333333333333";

const EVIDENCE_ID =
  "44444444-4444-4444-8444-444444444444";

const R1_ID =
  "55555555-5555-4555-8555-555555555555";

const POSITIVE_CHECKPOINT_ID =
  "66666666-6666-4666-8666-666666666666";

const CHECKPOINT_ID =
  "77777777-7777-4777-8777-777777777777";

const C_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const R1_FINGERPRINT =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const OBSERVED_AT =
  "2026-08-25T08:05:00.000Z";

const DECIDED_AT =
  "2026-08-25T08:06:00.000Z";

const CREATED_AT =
  "2026-08-25T08:06:01.000Z";


function makeRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    checkpoint_id:
      CHECKPOINT_ID,

    organization_id:
      ORGANIZATION_ID,

    assembly_id:
      ASSEMBLY_ID,

    evidence_id:
      EVIDENCE_ID,

    integrity_fingerprint:
      C_FINGERPRINT,

    revalidation_evidence_id:
      R1_ID,

    revalidation_integrity_fingerprint:
      R1_FINGERPRINT,

    prior_positive_checkpoint_id:
      POSITIVE_CHECKPOINT_ID,

    checkpoint_version:
      "hspp-assembly-member-unsuitability-checkpoint-v2",

    unsuitability_policy_version:
      "hspp-post-positive-member-unsuitability-v2",

    unsuitability_reason:
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",

    observed_at:
      OBSERVED_AT,

    decided_at:
      DECIDED_AT,

    created_at:
      CREATED_AT,

    ...overrides,
  };
}


function makeSupabase(
  row: Record<string, unknown> | null,
  rpcError: Error | null = null,
) {
  const calls: {
    name: string;
    args: Record<string, unknown>;
  }[] = [];


  return {
    calls,

    supabase: {
      rpc(
        name: string,
        args: Record<string, unknown>,
      ) {
        calls.push({
          name,
          args,
        });

        return {
          async maybeSingle() {
            return {
              data:
                row,

              error:
                rpcError,
            };
          },
        };
      },
    },
  };
}


function input(
  supabase: any,
) {
  return {
    supabase,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken:
      LEASE_TOKEN,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      C_FINGERPRINT,

    revalidationEvidenceId:
      R1_ID,

    revalidationIntegrityFingerprint:
      R1_FINGERPRINT,

    observedAt:
      OBSERVED_AT,

    decidedAt:
      DECIDED_AT,
  };
}


test(
  "Q14x-v2 wrapper calls only the exact dormant R1 RPC and returns exact identity",
  async () => {
    const {
      calls,
      supabase,
    } =
      makeSupabase(
        makeRow(),
      );


    const result =
      await persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease(
        input(
          supabase,
        ),
      );


    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      "persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease",
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_assembly_id:
          ASSEMBLY_ID,

        p_lease_token:
          LEASE_TOKEN,

        p_evidence_id:
          EVIDENCE_ID,

        p_integrity_fingerprint:
          C_FINGERPRINT,

        p_revalidation_evidence_id:
          R1_ID,

        p_revalidation_integrity_fingerprint:
          R1_FINGERPRINT,

        p_observed_at:
          OBSERVED_AT,

        p_decided_at:
          DECIDED_AT,
      },
    );


    assert.equal(
      result.state,
      "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      result.checkpointId,
      CHECKPOINT_ID,
    );

    assert.equal(
      result.priorPositiveCheckpointId,
      POSITIVE_CHECKPOINT_ID,
    );

    assert.equal(
      result.revalidationEvidenceId,
      R1_ID,
    );

    assert.equal(
      result.revalidationIntegrityFingerprint,
      R1_FINGERPRINT,
    );

    assert.equal(
      result.checkpointVersion,
      "hspp-assembly-member-unsuitability-checkpoint-v2",
    );

    assert.equal(
      result.unsuitabilityPolicyVersion,
      "hspp-post-positive-member-unsuitability-v2",
    );
  },
);


test(
  "wrapper fails closed if returned R1 id differs from caller-owned R1 identity",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        makeRow({
          revalidation_evidence_id:
            "88888888-8888-4888-8888-888888888888",
        }),
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease(
        input(
          supabase,
        ),
      ),
      /conflicting persistence identity/,
    );
  },
);


test(
  "wrapper fails closed if database returns legacy V1 policy authority",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        makeRow({
          checkpoint_version:
            "hspp-assembly-member-unsuitability-checkpoint-v1",

          unsuitability_policy_version:
            "hspp-post-positive-member-unsuitability-v1",
        }),
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease(
        input(
          supabase,
        ),
      ),
      /conflicting persistence identity/,
    );
  },
);


test(
  "wrapper rejects invalid R1 identity before RPC",
  async () => {
    const {
      calls,
      supabase,
    } =
      makeSupabase(
        makeRow(),
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease({
        ...input(
          supabase,
        ),

        revalidationEvidenceId:
          EVIDENCE_ID,
      }),
      /must be distinct/,
    );


    assert.equal(
      calls.length,
      0,
    );
  },
);


test(
  "wrapper rejects decision time preceding exact R1 observation before RPC",
  async () => {
    const {
      calls,
      supabase,
    } =
      makeSupabase(
        makeRow(),
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease({
        ...input(
          supabase,
        ),

        decidedAt:
          "2026-08-25T08:04:59.999Z",
      }),
      /must not precede observedAt/,
    );


    assert.equal(
      calls.length,
      0,
    );
  },
);


test(
  "wrapper propagates database/RPC failure",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        null,
        new Error(
          "controlled q14x-v2 rpc failure",
        ),
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease(
        input(
          supabase,
        ),
      ),
      /controlled q14x-v2 rpc failure/,
    );
  },
);


test(
  "wrapper rejects a successful RPC response with no persisted result",
  async () => {
    const {
      supabase,
    } =
      makeSupabase(
        null,
      );


    await assert.rejects(
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease(
        input(
          supabase,
        ),
      ),
      /returned no persisted result/,
    );
  },
);
