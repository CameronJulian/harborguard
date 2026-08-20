import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";
import {
  persistHsppEvidenceForProviderObservation,
} from "../lib/hspp/persistHsppEvidenceForProviderObservation";

const organizationId =
  "00000000-0000-0000-0000-000000000100";

const providerObservationId =
  "00000000-0000-0000-0000-000000000500";

function buildEvidence() {
  return buildHsppEvidence({
    sourceClass: "external_intelligence",
    sourceProvider: "here",
    sourceStream: "here_traffic",
    sourceMessageId: "here-incident-001",
    observedAt: "2026-08-20T12:00:00.000Z",
    receivedAt: "2026-08-20T12:00:01.000Z",
    payloadSchemaVersion: "normalized-route-safety-alert-v1",
    normalizedPayload: { type: "accident" },
  });
}

function createMock(
  duplicate: boolean,
  fingerprint: string | null
) {
  let fromCount = 0;
  let inserted: Record<string, unknown> | null = null;

  const insertQuery = {
    insert(value: Record<string, unknown>) {
      inserted = value;
      return insertQuery;
    },
    select() {
      return insertQuery;
    },
    async single() {
      if (duplicate) {
        return {
          data: null,
          error: { code: "23505", message: "duplicate" },
        };
      }

      return {
        data: {
          id: "00000000-0000-0000-0000-000000000600",
          integrity_fingerprint:
            inserted?.integrity_fingerprint,
        },
        error: null,
      };
    },
  };

  const lookupQuery = {
    select() { return lookupQuery; },
    eq() { return lookupQuery; },
    async maybeSingle() {
      return {
        data: {
          id: "00000000-0000-0000-0000-000000000601",
          integrity_fingerprint: fingerprint,
        },
        error: null,
      };
    },
  };

  return {
    supabase: {
      from(table: string) {
        assert.equal(table, "hspp_evidence");
        fromCount += 1;
        return fromCount === 1
          ? insertQuery
          : lookupQuery;
      },
    },
    getInserted() {
      return inserted;
    },
  };
}

test("first write creates evidence", async () => {
  const evidence = buildEvidence();
  const mock = createMock(false, null);

  const result =
    await persistHsppEvidenceForProviderObservation({
      supabase: mock.supabase,
      organizationId,
      providerObservationId,
      evidence,
    });

  assert.equal(result.created, true);
  assert.equal(
    mock.getInserted()?.provider_observation_id,
    providerObservationId
  );
});

test("matching duplicate is idempotent", async () => {
  const evidence = buildEvidence();
  const mock =
    createMock(true, evidence.integrityFingerprint);

  const result =
    await persistHsppEvidenceForProviderObservation({
      supabase: mock.supabase,
      organizationId,
      providerObservationId,
      evidence,
    });

  assert.equal(result.created, false);
  assert.equal(
    result.integrityFingerprint,
    evidence.integrityFingerprint
  );
});

test("conflicting duplicate fails closed", async () => {
  const evidence = buildEvidence();
  const mock = createMock(true, "conflicting");

  await assert.rejects(
    () => persistHsppEvidenceForProviderObservation({
      supabase: mock.supabase,
      organizationId,
      providerObservationId,
      evidence,
    }),
    /does not match/
  );
});

test("blank provider observation id fails before DB use", async () => {
  let accessed = false;

  await assert.rejects(
    () => persistHsppEvidenceForProviderObservation({
      supabase: {
        from() {
          accessed = true;
          throw new Error("unexpected DB access");
        },
      },
      organizationId,
      providerObservationId: "   ",
      evidence: buildEvidence(),
    }),
    /providerObservationId is required/
  );

  assert.equal(accessed, false);
});
