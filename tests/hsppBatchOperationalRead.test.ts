import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  readAndVerifyHsppEvidenceBatch,
} from "../lib/hspp/readAndVerifyHsppEvidence";

import {
  readHsppEvidenceBatchForOperationalUse,
} from "../lib/hspp/readHsppEvidenceForOperationalUse";

const organizationId =
  "org-batch-001";

function buildRow(
  evidenceId: string
) {
  const evidence =
    buildHsppEvidence({
      sourceClass: "telematics",
      sourceProvider: "traccar",
      sourceStream: "positions",
      sourceMessageId:
        `position-${evidenceId}`,
      observedAt:
        "2026-08-20T10:00:00.000Z",
      receivedAt:
        "2026-08-20T10:00:01.000Z",
      payloadSchemaVersion:
        "normalized-telematics-position-v1",
      normalizedPayload: {
        latitude: -33.9,
        longitude: 18.4,
        speedKmh: 45,
      },
    });

  return {
    id: evidenceId,
    organization_id:
      organizationId,
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
      "VALIDATED",
    trust_state:
      "PLAUSIBLE",
    operational_eligible:
      true,
    assessment_policy_version:
      "hspp-traccar-assessment-v1",
    assessment_reason:
      "plausibility_passed",
    assessed_at:
      "2026-08-20T10:00:02.000Z",
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
  rows: Record<string, unknown>[]
) {
  const calls:
    Array<[string, unknown]> = [];

  const query = {
    select(value: string) {
      calls.push(["select", value]);
      return query;
    },

    eq(
      column: string,
      value: unknown
    ) {
      calls.push([
        `eq:${column}`,
        value,
      ]);

      return query;
    },

    async in(
      column: string,
      values: unknown[]
    ) {
      calls.push([
        `in:${column}`,
        values,
      ]);

      return {
        data: rows,
        error: null,
      };
    },
  };

  return {
    supabase: {
      from(table: string) {
        calls.push([
          "from",
          table,
        ]);

        return query;
      },
    },
    calls,
  };
}

test("batch persisted reader uses one query", async () => {
  const mock =
    createSupabaseMock([
      buildRow("evidence-1"),
      buildRow("evidence-2"),
    ]);

  const result =
    await readAndVerifyHsppEvidenceBatch({
      supabase:
        mock.supabase as never,
      organizationId,
      evidenceIds: [
        "evidence-1",
        "evidence-2",
      ],
    });

  assert.equal(result.size, 2);

  assert.equal(
    mock.calls.filter(
      ([name]) =>
        name === "from"
    ).length,
    1
  );

  assert.ok(
    mock.calls.some(
      ([name]) =>
        name === "in:id"
    )
  );
});

test("batch persisted reader chunks large evidence sets", async () => {
  const evidenceIds =
    Array.from(
      { length: 205 },
      (_, index) =>
        `evidence-${index + 1}`
    );

  const mock =
    createSupabaseMock([]);

  await readAndVerifyHsppEvidenceBatch({
    supabase:
      mock.supabase as never,
    organizationId,
    evidenceIds,
  });

  const inCalls =
    mock.calls.filter(
      ([name]) =>
        name === "in:id"
    );

  assert.equal(
    inCalls.length,
    3
  );

  assert.equal(
    (inCalls[0][1] as unknown[]).length,
    100
  );

  assert.equal(
    (inCalls[1][1] as unknown[]).length,
    100
  );

  assert.equal(
    (inCalls[2][1] as unknown[]).length,
    5
  );
});
test("batch persisted reader represents missing evidence", async () => {
  const mock =
    createSupabaseMock([
      buildRow("evidence-1"),
    ]);

  const result =
    await readAndVerifyHsppEvidenceBatch({
      supabase:
        mock.supabase as never,
      organizationId,
      evidenceIds: [
        "evidence-1",
        "missing-evidence",
      ],
    });

  assert.deepEqual(
    result.get(
      "missing-evidence"
    ),
    {
      found: false,
      evidence: null,
      verification: null,
    }
  );
});

test("batch operational reader denies missing evidence", async () => {
  const mock =
    createSupabaseMock([]);

  const result =
    await readHsppEvidenceBatchForOperationalUse({
      supabase:
        mock.supabase,
      organizationId,
      evidenceIds: [
        "missing-evidence",
      ],
    });

  assert.equal(
    result.get(
      "missing-evidence"
    )?.decision.allowed,
    false
  );

  assert.equal(
    result.get(
      "missing-evidence"
    )?.decision.reason,
    "evidence_not_found"
  );
});

test("batch operational reader preserves allowed policy semantics", async () => {
  const mock =
    createSupabaseMock([
      buildRow(
        "evidence-allowed"
      ),
    ]);

  const result =
    await readHsppEvidenceBatchForOperationalUse({
      supabase:
        mock.supabase,
      organizationId,
      evidenceIds: [
        "evidence-allowed",
      ],
    });

  assert.equal(
    result.get(
      "evidence-allowed"
    )?.decision.allowed,
    true
  );
});
