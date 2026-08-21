import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_SEALED_ASSEMBLY_READER_VERSION,
  readHsppSealedEvidenceAssembly,
} from "../lib/hspp/readHsppSealedEvidenceAssembly";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

type MockOptions = {
  assembly?: unknown;
  assemblyError?: unknown;
  members?: unknown[];
  memberError?: unknown;
  evidenceRows?: unknown[];
  evidenceError?: unknown;
};

function createEvidenceRow(id: string, eventType: string) {
  const evidence = buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "test-provider",
    sourceStream: "test-stream",
    sourceMessageId: `message-${id}`,

    observedAt: "2026-08-21T10:00:00.000Z",

    receivedAt: "2026-08-21T10:00:01.000Z",

    payloadSchemaVersion: "1",

    normalizedPayload: {
      eventType,
    },
  });

  return {
    id,
    organization_id: "22222222-2222-4222-8222-222222222222",

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

function defaultFixture() {
  const first = createEvidenceRow(
    "11111111-1111-4111-8111-111111111111",
    "road_closure",
  );

  const second = createEvidenceRow(
    "33333333-3333-4333-8333-333333333333",
    "congestion",
  );

  return {
    assembly: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

      organization_id: "22222222-2222-4222-8222-222222222222",

      assembly_state: "SEALED",
    },

    /*
     * Deliberately returned out of order.
     *
     * The Supabase mock records that B07D requested
     * member_ordinal ASC, and B07D must preserve that
     * persisted ordering into the B11C input.
     */
    members: [
      {
        evidence_id: second.id,

        evidence_integrity_fingerprint: second.integrity_fingerprint,

        member_ordinal: 2,
      },

      {
        evidence_id: first.id,

        evidence_integrity_fingerprint: first.integrity_fingerprint,

        member_ordinal: 1,
      },
    ],

    evidenceRows: [first, second],
  };
}

function createSupabaseMock(options: MockOptions = {}) {
  const fixture = defaultFixture();

  const assembly = "assembly" in options ? options.assembly : fixture.assembly;

  const members = "members" in options ? options.members : fixture.members;

  const evidenceRows =
    "evidenceRows" in options ? options.evidenceRows : fixture.evidenceRows;

  const calls: Array<{
    table: string;
    action: string;
    value?: unknown;
  }> = [];

  function assemblyQuery() {
    const query: any = {
      select(columns: string) {
        calls.push({
          table: "hspp_evidence_assemblies",

          action: "select",

          value: columns,
        });

        return query;
      },

      eq(column: string, value: unknown) {
        calls.push({
          table: "hspp_evidence_assemblies",

          action: `eq:${column}`,

          value,
        });

        return query;
      },

      async maybeSingle() {
        calls.push({
          table: "hspp_evidence_assemblies",

          action: "maybeSingle",
        });

        return {
          data: assembly,

          error: options.assemblyError ?? null,
        };
      },
    };

    return query;
  }

  function memberQuery() {
    const query: any = {
      select(columns: string) {
        calls.push({
          table: "hspp_evidence_assembly_members",

          action: "select",

          value: columns,
        });

        return query;
      },

      eq(column: string, value: unknown) {
        calls.push({
          table: "hspp_evidence_assembly_members",

          action: `eq:${column}`,

          value,
        });

        return query;
      },

      order(column: string, optionsValue: unknown) {
        calls.push({
          table: "hspp_evidence_assembly_members",

          action: `order:${column}`,

          value: optionsValue,
        });

        /*
         * Real Supabase returns ordered rows.
         * Simulate that contract explicitly.
         */
        const ordered = [...(members ?? [])].sort(
          (a: any, b: any) => a.member_ordinal - b.member_ordinal,
        );

        return Promise.resolve({
          data: ordered,

          error: options.memberError ?? null,
        });
      },
    };

    return query;
  }

  function evidenceQuery() {
    const query: any = {
      select(columns: string) {
        calls.push({
          table: "hspp_evidence",

          action: "select",

          value: columns,
        });

        return query;
      },

      eq(column: string, value: unknown) {
        calls.push({
          table: "hspp_evidence",

          action: `eq:${column}`,

          value,
        });

        return query;
      },

      in(column: string, value: unknown) {
        calls.push({
          table: "hspp_evidence",

          action: `in:${column}`,

          value,
        });

        return Promise.resolve({
          data: evidenceRows,

          error: options.evidenceError ?? null,
        });
      },
    };

    return query;
  }

  const supabase = {
    from(table: string) {
      calls.push({
        table,
        action: "from",
      });

      if (table === "hspp_evidence_assemblies") {
        return assemblyQuery();
      }

      if (table === "hspp_evidence_assembly_members") {
        return memberQuery();
      }

      if (table === "hspp_evidence") {
        return evidenceQuery();
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return {
    supabase,
    calls,
    fixture,
  };
}

test("B07D reconstructs deterministic B11C input from one SEALED assembly", async () => {
  const mock = createSupabaseMock();

  const result = await readHsppSealedEvidenceAssembly({
    supabase: mock.supabase as any,

    organizationId: "22222222-2222-4222-8222-222222222222",

    assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });

  assert.equal(result.readerVersion, HSPP_SEALED_ASSEMBLY_READER_VERSION);

  assert.equal(result.scanInput.assemblyState, "SEALED");

  assert.equal(
    result.scanInput.organizationId,
    "22222222-2222-4222-8222-222222222222",
  );

  assert.equal(
    result.scanInput.assemblyId,
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );

  assert.deepEqual(
    result.scanInput.members.map((member) => ({
      evidenceId: member.evidenceId,

      memberOrdinal: member.memberOrdinal,

      eventType: member.canonicalClaims.normalizedEventType,
    })),
    [
      {
        evidenceId: "11111111-1111-4111-8111-111111111111",

        memberOrdinal: 1,

        eventType: "road_closure",
      },

      {
        evidenceId: "33333333-3333-4333-8333-333333333333",

        memberOrdinal: 2,

        eventType: "congestion",
      },
    ],
  );

  assert.ok(
    mock.calls.some(
      (call) =>
        call.table === "hspp_evidence_assembly_members" &&
        call.action === "order:member_ordinal" &&
        (call.value as any)?.ascending === true,
    ),
  );
});

test("B07D rejects an OPEN persisted assembly before member loading", async () => {
  const fixture = defaultFixture();

  const mock = createSupabaseMock({
    assembly: {
      ...fixture.assembly,
      assembly_state: "OPEN",
    },
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /must be SEALED/,
  );

  assert.equal(
    mock.calls.some((call) => call.table === "hspp_evidence_assembly_members"),
    false,
  );
});

test("B07D fails closed when the organization-scoped assembly does not exist", async () => {
  const mock = createSupabaseMock({
    assembly: null,
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /was not found for this organization/,
  );
});

test("B07D rejects a SEALED assembly with no persisted members", async () => {
  const mock = createSupabaseMock({
    members: [],
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /has no members/,
  );
});

test("B07D fails closed when a bound evidence record is missing", async () => {
  const fixture = defaultFixture();

  const mock = createSupabaseMock({
    evidenceRows: [fixture.evidenceRows[0]],
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /was not found/,
  );
});

test("B07D fails closed when evidence no longer matches the membership-bound fingerprint", async () => {
  const fixture = defaultFixture();

  const members = fixture.members.map((member: any) => ({
    ...member,
  }));

  members[0].evidence_integrity_fingerprint = "f".repeat(64);

  const mock = createSupabaseMock({
    members,
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /membership-bound integrity fingerprint/,
  );
});

test("B07D fails closed when persisted evidence fails cryptographic verification", async () => {
  const fixture = defaultFixture();

  const evidenceRows = fixture.evidenceRows.map((row: any) => ({
    ...row,
  }));

  /*
   * Change immutable payload while preserving
   * the old persisted fingerprint.
   */
  evidenceRows[0].normalized_payload = {
    eventType: "roadworks",
  };

  const mock = createSupabaseMock({
    evidenceRows,
  });

  await assert.rejects(
    () =>
      readHsppSealedEvidenceAssembly({
        supabase: mock.supabase as any,

        organizationId: "22222222-2222-4222-8222-222222222222",

        assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),

    /failed integrity verification/,
  );
});

test("B07D fails closed for invalid persisted canonical event type shape", async () => {
  const fixture = defaultFixture();

  const evidenceRows = fixture.evidenceRows.map((row: any) => ({
    ...row,
  }));

  /*
   * Rebuilding the fingerprint is deliberately
   * NOT done here. If integrity catches this first,
   * that is still fail-closed behavior.
   *
   * The contract test separately proves B07D owns
   * explicit eventType shape validation.
   */
  evidenceRows[0].normalized_payload = {
    eventType: 123,
  };

  const mock = createSupabaseMock({
    evidenceRows,
  });

  await assert.rejects(() =>
    readHsppSealedEvidenceAssembly({
      supabase: mock.supabase as any,

      organizationId: "22222222-2222-4222-8222-222222222222",

      assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    }),
  );
});

for (const [field, organizationId, assemblyId] of [
  ["organizationId", "   ", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
  ["assemblyId", "22222222-2222-4222-8222-222222222222", "   "],
] as const) {
  test(`B07D rejects blank ${field} before database access`, async () => {
    const mock = createSupabaseMock();

    await assert.rejects(
      () =>
        readHsppSealedEvidenceAssembly({
          supabase: mock.supabase as any,

          organizationId,
          assemblyId,
        }),

      new RegExp(`${field} is required`),
    );

    assert.equal(mock.calls.length, 0);
  });
}

test("sealed assembly reader retains verified member metadata required by later corroboration input construction", async () => {
  const mock = createSupabaseMock();

  const result = await readHsppSealedEvidenceAssembly({
    supabase: mock.supabase as never,

    organizationId: "22222222-2222-4222-8222-222222222222",

    assemblyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });

  assert.equal(result.verifiedMembers.length, result.scanInput.members.length);

  assert.deepEqual(
    result.verifiedMembers.map((member) => ({
      evidenceId: member.evidenceId,
      integrityFingerprint: member.integrityFingerprint,
      memberOrdinal: member.memberOrdinal,
    })),
    result.scanInput.members.map((member) => ({
      evidenceId: member.evidenceId,
      integrityFingerprint: member.integrityFingerprint,
      memberOrdinal: member.memberOrdinal,
    })),
  );

  for (const member of result.verifiedMembers) {
    assert.ok(member.sourceProvider);
    assert.ok(member.sourceClass);
    assert.ok(member.observedAt);

    assert.equal(member.integrityStatus, "MATCH");

    assert.ok(member.validationState);
  }
});
