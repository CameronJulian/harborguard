import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  readAndVerifyHsppEvidence,
} from "../lib/hspp/readAndVerifyHsppEvidence";

const organizationId = "org-001";
const evidenceId = "evidence-001";

function buildRow() {
  const evidence = buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "traccar",
    sourceStream: "positions",
    sourceMessageId: "position-001",
    observedAt: "2026-08-20T08:00:00.000Z",
    receivedAt: "2026-08-20T08:00:01.000Z",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    normalizedPayload: {
      latitude: -33.9249,
      longitude: 18.4241,
      speedKmh: 50,
    },
  });

  return {
    id: evidenceId,
    organization_id: organizationId,
    protocol_version:
      evidence.protocolVersion,
    canonicalization_version:
      evidence.canonicalizationVersion,
    source_class:
      evidence.sourceClass,
    source_provider:
      evidence.sourceProvider,
    source_stream:
      evidence.sourceStream,
    source_message_id:
      evidence.sourceMessageId,
    observed_at:
      evidence.observedAt,
    received_at:
      evidence.receivedAt,
    payload_schema_version:
      evidence.payloadSchemaVersion,
    normalized_payload:
      evidence.normalizedPayload,
    integrity_algorithm:
      evidence.integrityAlgorithm,
    integrity_fingerprint:
      evidence.integrityFingerprint,
    integrity_state:
      evidence.integrityState,
    validation_state:
      evidence.validationState,
    trust_state:
      evidence.trustState,

    parent_evidence_id:
      null,

    parent_integrity_fingerprint:
      null,

    derivation_type:
      null,

    derivation_version:
      null,
  };
}

function createSupabaseMock(
  row: Record<string, unknown> | null,
  error: unknown = null
) {
  const calls: Array<[string, unknown]> = [];

  const query = {
    select(value: string) {
      calls.push(["select", value]);
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push([`eq:${column}`, value]);
      return query;
    },
    async maybeSingle() {
      calls.push(["maybeSingle", true]);
      return {
        data: row,
        error,
      };
    },
  };

  const supabase = {
    from(table: string) {
      calls.push(["from", table]);
      return query;
    },
  };

  return {
    supabase,
    calls,
  };
}

test("persisted sealed HSPP evidence reads and verifies MATCH", async () => {
  const mock = createSupabaseMock(
    buildRow()
  );

  const result =
    await readAndVerifyHsppEvidence({
      supabase: mock.supabase as never,
      organizationId,
      evidenceId,
    });

  assert.equal(result.found, true);

  if (result.found) {
    assert.equal(
      result.evidence.id,
      evidenceId
    );
    assert.equal(
      result.evidence.organizationId,
      organizationId
    );
    assert.equal(
      result.verification.status,
      "MATCH"
    );
  }
});

test("persisted payload mutation produces MISMATCH", async () => {
  const row = buildRow();

  row.normalized_payload = {
    ...(row.normalized_payload as Record<string, unknown>),
    latitude: -34.1,
  };

  const mock = createSupabaseMock(row);

  const result =
    await readAndVerifyHsppEvidence({
      supabase: mock.supabase as never,
      organizationId,
      evidenceId,
    });

  assert.equal(result.found, true);

  if (result.found) {
    assert.equal(
      result.verification.status,
      "MISMATCH"
    );
  }
});

test("missing persisted evidence returns found false", async () => {
  const mock = createSupabaseMock(null);

  const result =
    await readAndVerifyHsppEvidence({
      supabase: mock.supabase as never,
      organizationId,
      evidenceId,
    });

  assert.deepEqual(result, {
    found: false,
    evidence: null,
    verification: null,
  });
});

test("reader scopes lookup by organization and evidence id", async () => {
  const mock = createSupabaseMock(
    buildRow()
  );

  await readAndVerifyHsppEvidence({
    supabase: mock.supabase as never,
    organizationId,
    evidenceId,
  });

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "from" &&
        value === "hspp_evidence"
    )
  );

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "eq:organization_id" &&
        value === organizationId
    )
  );

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "eq:id" &&
        value === evidenceId
    )
  );
});

test("organization mismatch in returned row is rejected", async () => {
  const row = buildRow();
  row.organization_id = "other-org";

  const mock = createSupabaseMock(row);

  await assert.rejects(
    () =>
      readAndVerifyHsppEvidence({
        supabase: mock.supabase as never,
        organizationId,
        evidenceId,
      }),
    /organization does not match/
  );
});

test("evidence id mismatch in returned row is rejected", async () => {
  const row = buildRow();
  row.id = "other-evidence";

  const mock = createSupabaseMock(row);

  await assert.rejects(
    () =>
      readAndVerifyHsppEvidence({
        supabase: mock.supabase as never,
        organizationId,
        evidenceId,
      }),
    /id does not match/
  );
});

test("database errors propagate without converting them to integrity results", async () => {
  const databaseError =
    new Error("database unavailable");

  const mock = createSupabaseMock(
    null,
    databaseError
  );

  await assert.rejects(
    () =>
      readAndVerifyHsppEvidence({
        supabase: mock.supabase as never,
        organizationId,
        evidenceId,
      }),
    databaseError
  );
});
