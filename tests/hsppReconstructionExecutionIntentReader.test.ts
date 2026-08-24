import test from "node:test";
import assert from "node:assert/strict";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_READ_RPC,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_READER_VERSION,
  readHsppReconstructionExecutionIntents,
} from "../lib/hspp/readHsppReconstructionExecutionIntents";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";


const HISTORICAL_FINGERPRINT =
  "a".repeat(64);


const REPLACEMENT_FINGERPRINT =
  "b".repeat(64);


type MockRpcCall = {
  name: string;

  args: Record<string, unknown>;
};


function makeRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    intent_id:
      "intent-0002",

    organization_id:
      "org-1",

    child_assembly_id:
      "child-2",

    selected_first_evidence_id:
      "historical-1",

    selected_second_evidence_id:
      "replacement-1",

    historical_evidence_id:
      "historical-1",

    historical_evidence_integrity_fingerprint:
      HISTORICAL_FINGERPRINT,

    replacement_evidence_id:
      "replacement-1",

    replacement_evidence_integrity_fingerprint:
      REPLACEMENT_FINGERPRINT,

    discovery_policy_version:
      "discovery-v1",

    reevaluation_policy_version:
      "reevaluation-v1",

    membership_policy_version:
      "membership-v1",

    reconstruction_policy_version:
      "reconstruction-v1",

    reconstruction_reason:
      "Replace ceased historical evidence.",

    intent_version:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

    created_at:
      "2026-08-24T08:00:00.123456+00:00",

    persistence_state:
      "CLAIMED_NOT_PERSISTED",

    reconstruction_id:
      null,

    parent_assembly_id:
      null,

    assembly_state:
      null,

    sealed_at:
      null,

    ...overrides,
  };
}


function makeSupabase(
  data: unknown,
  error: unknown = null,
): {
  supabase: SupabaseClient;
  calls: MockRpcCall[];
} {
  const calls: MockRpcCall[] =
    [];

  const supabase = {
    rpc: async (
      name: string,
      args: Record<string, unknown>,
    ) => {
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


test(
  "maps the exact Q14ag31E RPC and normalizes CLAIMED_NOT_PERSISTED despite generated non-null types",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeRow(),
      ]);

    const result =
      await readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      });

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_READ_RPC,
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          "org-1",

        p_limit:
          100,

        p_before_created_at:
          null,

        p_before_intent_id:
          null,
      },
    );

    assert.equal(
      result.readerVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_READER_VERSION,
    );

    assert.equal(
      result.organizationId,
      "org-1",
    );

    assert.equal(
      result.limit,
      100,
    );

    assert.equal(
      result.cursor,
      null,
    );

    assert.equal(
      result.nextCursor,
      null,
    );

    assert.equal(
      result.intents.length,
      1,
    );

    assert.deepEqual(
      result.intents[0],
      {
        intentId:
          "intent-0002",

        organizationId:
          "org-1",

        childAssemblyId:
          "child-2",

        selectedFirstEvidenceId:
          "historical-1",

        selectedSecondEvidenceId:
          "replacement-1",

        historicalEvidenceId:
          "historical-1",

        historicalEvidenceIntegrityFingerprint:
          HISTORICAL_FINGERPRINT,

        replacementEvidenceId:
          "replacement-1",

        replacementEvidenceIntegrityFingerprint:
          REPLACEMENT_FINGERPRINT,

        discoveryPolicyVersion:
          "discovery-v1",

        reevaluationPolicyVersion:
          "reevaluation-v1",

        membershipPolicyVersion:
          "membership-v1",

        reconstructionPolicyVersion:
          "reconstruction-v1",

        reconstructionReason:
          "Replace ceased historical evidence.",

        intentVersion:
          HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

        createdAt:
          "2026-08-24T08:00:00.123456+00:00",

        persistenceState:
          "CLAIMED_NOT_PERSISTED",

        reconstructionId:
          null,

        parentAssemblyId:
          null,

        assemblyState:
          null,

        sealedAt:
          null,
      },
    );
  },
);


test(
  "normalizes RECONSTRUCTION_PERSISTED OPEN",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "reconstruction-1",

          parent_assembly_id:
            "parent-1",

          assembly_state:
            "OPEN",

          sealed_at:
            null,
        }),
      ]);

    const result =
      await readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      });

    const intent =
      result.intents[0];

    assert.equal(
      intent.persistenceState,
      "RECONSTRUCTION_PERSISTED",
    );

    assert.equal(
      intent.assemblyState,
      "OPEN",
    );

    assert.equal(
      intent.sealedAt,
      null,
    );
  },
);


test(
  "normalizes RECONSTRUCTION_PERSISTED SEALED",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "reconstruction-1",

          parent_assembly_id:
            "parent-1",

          assembly_state:
            "SEALED",

          sealed_at:
            "2026-08-24T08:05:00.654321+00:00",
        }),
      ]);

    const result =
      await readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      });

    const intent =
      result.intents[0];

    assert.equal(
      intent.persistenceState,
      "RECONSTRUCTION_PERSISTED",
    );

    assert.equal(
      intent.assemblyState,
      "SEALED",
    );

    assert.equal(
      intent.sealedAt,
      "2026-08-24T08:05:00.654321+00:00",
    );
  },
);


test(
  "maps a paired keyset cursor and preserves exact timestamp precision in nextCursor",
  async () => {
    const secondCreatedAt =
      "2026-08-24T08:00:00.123456+00:00";

    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeRow({
          intent_id:
            "intent-0003",

          child_assembly_id:
            "child-3",

          created_at:
            "2026-08-24T09:00:00.987654+00:00",
        }),

        makeRow({
          intent_id:
            "intent-0002",

          child_assembly_id:
            "child-2",

          created_at:
            secondCreatedAt,
        }),
      ]);

    const result =
      await readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",

        limit:
          2,

        beforeCreatedAt:
          "2026-08-24T10:00:00.999999+00:00",

        beforeIntentId:
          "intent-9999",
      });

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          "org-1",

        p_limit:
          2,

        p_before_created_at:
          "2026-08-24T10:00:00.999999+00:00",

        p_before_intent_id:
          "intent-9999",
      },
    );

    assert.deepEqual(
      result.nextCursor,
      {
        createdAt:
          secondCreatedAt,

        intentId:
          "intent-0002",
      },
    );
  },
);


test(
  "accepts an empty page",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([]);

    const result =
      await readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      });

    assert.deepEqual(
      result.intents,
      [],
    );

    assert.equal(
      result.nextCursor,
      null,
    );
  },
);


test(
  "rejects invalid limits",
  async () => {
    for (
      const limit of [
        0,
        101,
        1.5,
      ]
    ) {
      const {
        supabase,
      } =
        makeSupabase([]);

      await assert.rejects(
        readHsppReconstructionExecutionIntents({
          supabase,
          organizationId:
            "org-1",
          limit,
        }),
        /limit must be an integer between 1 and 100/,
      );
    }
  },
);


test(
  "rejects partial keyset cursors",
  async () => {
    {
      const {
        supabase,
      } =
        makeSupabase([]);

      await assert.rejects(
        readHsppReconstructionExecutionIntents({
          supabase,
          organizationId:
            "org-1",

          beforeCreatedAt:
            "2026-08-24T08:00:00Z",
        }),
        /beforeCreatedAt and beforeIntentId must be provided together/,
      );
    }

    {
      const {
        supabase,
      } =
        makeSupabase([]);

      await assert.rejects(
        readHsppReconstructionExecutionIntents({
          supabase,
          organizationId:
            "org-1",

          beforeIntentId:
            "intent-1",
        }),
        /beforeCreatedAt and beforeIntentId must be provided together/,
      );
    }
  },
);


test(
  "rejects an organization identity mismatch",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          organization_id:
            "other-org",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /organization does not match the requested organization/,
    );
  },
);


test(
  "rejects malformed immutable pair provenance",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          selected_second_evidence_id:
            "unrelated-evidence",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /selected pair must contain exactly/,
    );
  },
);


test(
  "rejects invalid evidence fingerprints",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          historical_evidence_integrity_fingerprint:
            "NOT-SHA256",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /lowercase SHA-256 fingerprint/,
    );
  },
);


test(
  "rejects unsupported immutable intent versions",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          intent_version:
            "unsupported-intent-v9",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /unsupported reconstruction execution-intent version/,
    );
  },
);


test(
  "fails closed when CLAIMED_NOT_PERSISTED exposes persisted state",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          reconstruction_id:
            "reconstruction-1",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /CLAIMED_NOT_PERSISTED state must not expose/,
    );
  },
);


test(
  "fails closed when RECONSTRUCTION_PERSISTED lacks reconstruction identity",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            null,

          parent_assembly_id:
            "parent-1",

          assembly_state:
            "OPEN",

          sealed_at:
            null,
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /reconstruction_id must be a non-empty string/,
    );
  },
);


test(
  "fails closed when OPEN has sealed_at",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "reconstruction-1",

          parent_assembly_id:
            "parent-1",

          assembly_state:
            "OPEN",

          sealed_at:
            "2026-08-24T08:05:00Z",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /OPEN reconstruction must have sealed_at = null/,
    );
  },
);


test(
  "fails closed when SEALED lacks sealed_at",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "reconstruction-1",

          parent_assembly_id:
            "parent-1",

          assembly_state:
            "SEALED",

          sealed_at:
            null,
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      /sealed_at must be a non-empty string/,
    );
  },
);


test(
  "rejects out-of-order pages",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          intent_id:
            "intent-0001",

          child_assembly_id:
            "child-1",

          created_at:
            "2026-08-24T07:00:00Z",
        }),

        makeRow({
          intent_id:
            "intent-0002",

          child_assembly_id:
            "child-2",

          created_at:
            "2026-08-24T08:00:00Z",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",

        limit:
          2,
      }),
      /violates created_at DESC ordering/,
    );
  },
);


test(
  "rejects duplicate intent identities",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow({
          intent_id:
            "intent-0002",

          child_assembly_id:
            "child-2",

          created_at:
            "2026-08-24T09:00:00Z",
        }),

        makeRow({
          intent_id:
            "intent-0002",

          child_assembly_id:
            "child-3",

          created_at:
            "2026-08-24T08:00:00Z",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",

        limit:
          2,
      }),
      /duplicate intent identity/,
    );
  },
);


test(
  "rejects more rows than the requested limit",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeRow(),
        makeRow({
          intent_id:
            "intent-0001",

          child_assembly_id:
            "child-1",

          created_at:
            "2026-08-24T07:00:00Z",
        }),
      ]);

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",

        limit:
          1,
      }),
      /returned more rows than requested/,
    );
  },
);


test(
  "propagates RPC errors",
  async () => {
    const expectedError =
      new Error(
        "rpc failed",
      );

    const {
      supabase,
    } =
      makeSupabase(
        null,
        expectedError,
      );

    await assert.rejects(
      readHsppReconstructionExecutionIntents({
        supabase,
        organizationId:
          "org-1",
      }),
      (
        error: unknown,
      ) =>
        error === expectedError,
    );
  },
);
