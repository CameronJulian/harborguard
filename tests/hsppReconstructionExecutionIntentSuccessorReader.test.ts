import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION,
  readHsppReconstructionExecutionIntentsV2,
} from "../lib/hspp/readHsppReconstructionExecutionIntentsV2";


const ORGANIZATION_ID =
  "00000000-0000-0000-0000-000000000010";

const HISTORICAL_ID =
  "00000000-0000-0000-0000-000000000020";

const REPLACEMENT_ID =
  "00000000-0000-0000-0000-000000000021";

const CHILD_ID =
  "00000000-0000-0000-0000-000000000030";

const INTENT_ID =
  "00000000-0000-0000-0000-000000000040";

const FINGERPRINT_A =
  "a".repeat(64);

const FINGERPRINT_B =
  "b".repeat(64);


type RpcCall = {
  name:
    string;

  args:
    Record<string, unknown>;
};


function makeB07BRow(
  overrides:
    Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    intent_id:
      INTENT_ID,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      CHILD_ID,

    selected_first_evidence_id:
      HISTORICAL_ID,

    selected_second_evidence_id:
      REPLACEMENT_ID,

    historical_evidence_id:
      HISTORICAL_ID,

    historical_evidence_integrity_fingerprint:
      FINGERPRINT_A,

    replacement_evidence_id:
      REPLACEMENT_ID,

    replacement_evidence_integrity_fingerprint:
      FINGERPRINT_B,

    selection_source:
      "B07B_DISCOVERY",

    discovery_policy_version:
      "hspp-reservoir-discovery-v1",

    pair_scheduling_version:
      null,

    reservoir_eligibility_policy_version:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,

    reevaluation_policy_version:
      "hspp-pair-reevaluation-v1",

    membership_policy_version:
      "hspp-membership-v1",

    reconstruction_policy_version:
      "hspp-reconstruction-v1",

    reconstruction_reason:
      "replacement candidate selected",

    intent_version:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION,

    created_at:
      "2026-09-01T12:00:00.000Z",

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


function makeScheduledPairRow(
  overrides:
    Record<string, unknown> = {},
): Record<string, unknown> {
  return makeB07BRow({
    selection_source:
      "SCHEDULED_PAIR",

    discovery_policy_version:
      null,

    pair_scheduling_version:
      "hspp-reservoir-pair-scheduling-v1",

    ...overrides,
  });
}


function makeSupabase(
  data:
    unknown,
  error:
    unknown = null,
): {
  supabase:
    SupabaseClient;

  calls:
    RpcCall[];
} {
  const calls:
    RpcCall[] = [];

  const supabase =
    {
      rpc:
        async (
          name:
            string,
          args:
            Record<string, unknown>,
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
  "Q14ag33D maps one B07B successor intent and calls only the v2 RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeB07BRow(),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,
      });

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_limit:
          result.limit,

        p_before_created_at:
          null,

        p_before_intent_id:
          null,

        p_persistence_state:
          null,
      },
    );

    assert.equal(
      result.readerVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION,
    );

    assert.equal(
      result.intents.length,
      1,
    );

    const intent =
      result.intents[0];

    assert.equal(
      intent.selectionSource,
      "B07B_DISCOVERY",
    );

    if (
      intent.selectionSource !==
        "B07B_DISCOVERY"
    ) {
      throw new Error(
        "Expected B07B_DISCOVERY.",
      );
    }

    assert.equal(
      intent.discoveryPolicyVersion,
      "hspp-reservoir-discovery-v1",
    );

    assert.equal(
      intent.pairSchedulingVersion,
      null,
    );

    assert.equal(
      intent.reservoirEligibilityPolicyVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,
    );
  },
);


test(
  "Q14ag33D maps scheduled-pair provenance without discovery fabrication",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeScheduledPairRow(),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,
      });

    const intent =
      result.intents[0];

    assert.equal(
      intent.selectionSource,
      "SCHEDULED_PAIR",
    );

    if (
      intent.selectionSource !==
        "SCHEDULED_PAIR"
    ) {
      throw new Error(
        "Expected SCHEDULED_PAIR.",
      );
    }

    assert.equal(
      intent.discoveryPolicyVersion,
      null,
    );

    assert.equal(
      intent.pairSchedulingVersion,
      "hspp-reservoir-pair-scheduling-v1",
    );
  },
);


test(
  "Q14ag33D rejects scheduled-pair discovery fabrication",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeScheduledPairRow({
          discovery_policy_version:
            "fabricated-discovery",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /must not expose fabricated discovery provenance/,
    );
  },
);


test(
  "Q14ag33D rejects scheduled-pair rows without pair scheduling provenance",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeScheduledPairRow({
          pair_scheduling_version:
            null,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /pair_scheduling_version must be a non-empty string/,
    );
  },
);


test(
  "Q14ag33D rejects B07B rows without discovery provenance",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          discovery_policy_version:
            null,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /discovery_policy_version must be a non-empty string/,
    );
  },
);


test(
  "Q14ag33D rejects B07B rows carrying pair scheduling provenance",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          pair_scheduling_version:
            "not-allowed",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /B07B_DISCOVERY must not expose pair scheduling provenance/,
    );
  },
);


test(
  "Q14ag33D rejects unsupported selection sources",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          selection_source:
            "UNKNOWN",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /unsupported selection_source UNKNOWN/,
    );
  },
);


test(
  "Q14ag33D rejects unsupported B06A provenance",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          reservoir_eligibility_policy_version:
            "hspp-reservoir-eligibility-v2",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /unsupported Reservoir eligibility policy version/,
    );
  },
);


test(
  "Q14ag33D maps the persistence-state filter to the successor RPC",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeScheduledPairRow(),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,

        persistenceStateFilter:
          "CLAIMED_NOT_PERSISTED",
      });

    assert.equal(
      calls[0].args.p_persistence_state,
      "CLAIMED_NOT_PERSISTED",
    );

    assert.equal(
      result.persistenceStateFilter,
      "CLAIMED_NOT_PERSISTED",
    );
  },
);


test(
  "Q14ag33D fails closed when the RPC violates the requested persistence filter",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "00000000-0000-0000-0000-000000000050",

          parent_assembly_id:
            "00000000-0000-0000-0000-000000000051",

          assembly_state:
            "OPEN",

          sealed_at:
            null,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,

          persistenceStateFilter:
            "CLAIMED_NOT_PERSISTED",
        }),
      /outside the requested server-side filter/,
    );
  },
);


test(
  "Q14ag33D rejects claimed-not-persisted rows exposing persisted state",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          reconstruction_id:
            "00000000-0000-0000-0000-000000000050",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /CLAIMED_NOT_PERSISTED state must not expose persisted child\/reconstruction state/,
    );
  },
);


test(
  "Q14ag33D maps persisted OPEN state",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeScheduledPairRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "00000000-0000-0000-0000-000000000050",

          parent_assembly_id:
            "00000000-0000-0000-0000-000000000051",

          assembly_state:
            "OPEN",

          sealed_at:
            null,
        }),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,
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
  },
);


test(
  "Q14ag33D maps persisted SEALED state",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          persistence_state:
            "RECONSTRUCTION_PERSISTED",

          reconstruction_id:
            "00000000-0000-0000-0000-000000000050",

          parent_assembly_id:
            "00000000-0000-0000-0000-000000000051",

          assembly_state:
            "SEALED",

          sealed_at:
            "2026-09-01T12:10:00.000Z",
        }),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,
      });

    assert.equal(
      result.intents[0].assemblyState,
      "SEALED",
    );

    assert.equal(
      result.intents[0].sealedAt,
      "2026-09-01T12:10:00.000Z",
    );
  },
);


test(
  "Q14ag33D maps paired keyset cursor and derives exact nextCursor",
  async () => {
    const {
      supabase,
      calls,
    } =
      makeSupabase([
        makeB07BRow(),
      ]);

    const result =
      await readHsppReconstructionExecutionIntentsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,

        limit:
          1,

        beforeCreatedAt:
          "2026-09-01T13:00:00.123456Z",

        beforeIntentId:
          "00000000-0000-0000-0000-000000000099",
      });

    assert.equal(
      calls[0].args.p_before_created_at,
      "2026-09-01T13:00:00.123456Z",
    );

    assert.equal(
      calls[0].args.p_before_intent_id,
      "00000000-0000-0000-0000-000000000099",
    );

    assert.deepEqual(
      result.nextCursor,
      {
        createdAt:
          "2026-09-01T12:00:00.000Z",

        intentId:
          INTENT_ID,
      },
    );
  },
);


test(
  "Q14ag33D rejects out-of-order successor pages",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          intent_id:
            "00000000-0000-0000-0000-000000000042",

          created_at:
            "2026-09-01T12:00:00.000Z",
        }),

        makeScheduledPairRow({
          intent_id:
            "00000000-0000-0000-0000-000000000041",

          created_at:
            "2026-09-01T12:01:00.000Z",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /not ordered by created_at descending/,
    );
  },
);


test(
  "Q14ag33D rejects duplicate durable intent identities",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow(),
        makeScheduledPairRow(),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /Duplicate reconstruction execution-intent identity/,
    );
  },
);


test(
  "Q14ag33D rejects an unsupported immutable intent version",
  async () => {
    const {
      supabase,
    } =
      makeSupabase([
        makeB07BRow({
          intent_version:
            "unsupported-version",
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      /unsupported reconstruction execution-intent version/,
    );
  },
);


test(
  "Q14ag33D propagates successor RPC errors",
  async () => {
    const rpcError =
      new Error(
        "rpc failed",
      );

    const {
      supabase,
    } =
      makeSupabase(
        null,
        rpcError,
      );

    await assert.rejects(
      () =>
        readHsppReconstructionExecutionIntentsV2({
          supabase,
          organizationId:
            ORGANIZATION_ID,
        }),
      rpcError,
    );
  },
);