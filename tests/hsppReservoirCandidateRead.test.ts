import assert from "node:assert/strict";
import test from "node:test";

import {
  readHsppReservoirCandidates,
  HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,
} from "../lib/hspp/readHsppReservoirCandidates";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

type EvidenceRow = {
  id: string;
};

type CurrentEffectiveMembershipRow = {
  evidence_id: string;
};

function validPersistedEvidenceRow(id: string) {
  const evidence = buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "test-provider",
    sourceStream: "test-stream",
    sourceMessageId: `message-${id}`,

    observedAt: "2026-08-21T10:00:00.000Z",

    receivedAt: "2026-08-21T10:00:01.000Z",

    payloadSchemaVersion: "1",

    normalizedPayload: {
      vehicleId: "vehicle-1",
    },
  });

  return {
    id,
    organization_id: "00000000-0000-0000-0000-0000000000a1",

    protocol_version: evidence.protocolVersion,

    canonicalization_version: evidence.canonicalizationVersion,

    source_class: evidence.sourceClass,

    source_provider: evidence.sourceProvider,

    source_stream: evidence.sourceStream,

    source_message_id: evidence.sourceMessageId,

    observed_at: evidence.observedAt,

    received_at: evidence.receivedAt,

    payload_schema_version: evidence.payloadSchemaVersion,

    normalized_payload: evidence.normalizedPayload,

    integrity_algorithm: evidence.integrityAlgorithm,

    integrity_fingerprint: evidence.integrityFingerprint,

    integrity_state: evidence.integrityState,

    validation_state: "VALIDATED",

    trust_state: "VERIFIED",

    operational_eligible: true,

    assessment_policy_version: "hspp-assessment-v1",

    assessment_reason: "verified_test_evidence",

    assessed_at: "2026-08-21T10:00:02.000Z",

    parent_evidence_id: null,

    parent_integrity_fingerprint: null,

    derivation_type: null,

    derivation_version: null,
  };
}
function createSupabaseMock({
  discoveryRows,
  currentEffectiveMembershipRows,
  persistedRows,
}: {
  discoveryRows: EvidenceRow[];
  currentEffectiveMembershipRows: MembershipRow[];
  persistedRows: Record<string, ReturnType<typeof validPersistedEvidenceRow>>;
}) {
  const calls: Array<[string, unknown]> = [];

  let table = "";
  let currentInValues: string[] = [];

  const query: any = {
    select(value: string) {
      calls.push(["select", value]);
      return query;
    },

    eq(column: string, value: unknown) {
      calls.push([`eq:${column}`, value]);

      return query;
    },

    in(column: string, values: string[]) {
      calls.push([`in:${column}`, values]);

      currentInValues = values;

      return query;
    },

    order(column: string, value: unknown) {
      calls.push([`order:${column}`, value]);

      return query;
    },

    limit(value: number) {
      calls.push(["limit", value]);

      if (table === "hspp_evidence") {
        return Promise.resolve({
          data: discoveryRows,
          error: null,
        });
      }

      return query;
    },

    then(resolve: (value: unknown) => void) {
      if (table === "hspp_evidence") {
        const rows =
          currentInValues.length > 0
            ? currentInValues.map((id) => persistedRows[id]).filter(Boolean)
            : discoveryRows;

        return Promise.resolve({
          data: rows,
          error: null,
        }).then(resolve);
      }


      return Promise.resolve({
        data: [],
        error: null,
      }).then(resolve);
    },
  };

  const supabase = {
    from(value: string) {
      table = value;

      currentInValues = [];

      calls.push(["from", value]);

      return query;
    },

    async rpc(
      functionName: string,
      args: Record<string, unknown>,
    ) {
      calls.push([
        "rpc",
        {
          functionName,
          args,
        },
      ]);

      if (
        functionName ===
        "read_hspp_current_effective_assembly_memberships"
      ) {
        return {
          data: currentEffectiveMembershipRows,
          error: null,
        };
      }

      return {
        data: [],
        error: null,
      };
    },
  };

  return {
    supabase,
    calls,
  };
}

test("B06B returns only operationally eligible unassembled evidence", async () => {
  const first = "00000000-0000-0000-0000-000000000001";

  const second = "00000000-0000-0000-0000-000000000002";

  const mock = createSupabaseMock({
    discoveryRows: [{ id: first }, { id: second }],

    currentEffectiveMembershipRows: [
      {
        evidence_id: second,
      },
    ],

    persistedRows: {
      [first]: validPersistedEvidenceRow(first),

      [second]: validPersistedEvidenceRow(second),
    },
  });

  const result = await readHsppReservoirCandidates({
    supabase: mock.supabase as any,

    organizationId: "00000000-0000-0000-0000-0000000000a1",

    limit: 25,
  });

  assert.equal(result.policyVersion, HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION);

  assert.equal(result.organizationId, "00000000-0000-0000-0000-0000000000a1");

  assert.equal(result.requestedLimit, 25);

  assert.equal(result.candidates.length, 1);

  assert.equal(result.candidates[0].evidenceId, first);

  assert.equal(result.candidates[0].hasAssemblyMembership, false);

  const currentEffectiveMembershipRpcCalls =
    mock.calls.filter(
      ([operation]) =>
        operation === "rpc",
    );

  assert.equal(
    currentEffectiveMembershipRpcCalls.length,
    1,
  );

  assert.deepEqual(
    currentEffectiveMembershipRpcCalls[0][1],
    {
      functionName:
        "read_hspp_current_effective_assembly_memberships",

      args: {
        p_organization_id:
          "00000000-0000-0000-0000-0000000000a1",

        p_evidence_ids: [
          first,
          second,
        ],
      },
    },
  );

  assert.equal(
    result.candidates[0].reservoirDecision.reason,
    "RESERVOIR_ELIGIBLE",
  );
});

test("B06B rejects invalid discovery limits", async () => {
  const mock = createSupabaseMock({
    discoveryRows: [],
    currentEffectiveMembershipRows: [],
    persistedRows: {},
  });

  await assert.rejects(
    () =>
      readHsppReservoirCandidates({
        supabase: mock.supabase as any,

        organizationId: "00000000-0000-0000-0000-0000000000a1",

        limit: 101,
      }),

    /limit must be an integer between 1 and 100/,
  );
});

test("B06B rejects blank organization identity", async () => {
  const mock = createSupabaseMock({
    discoveryRows: [],
    currentEffectiveMembershipRows: [],
    persistedRows: {},
  });

  await assert.rejects(
    () =>
      readHsppReservoirCandidates({
        supabase: mock.supabase as any,

        organizationId: "   ",
      }),

    /organizationId is required/,
  );
});
