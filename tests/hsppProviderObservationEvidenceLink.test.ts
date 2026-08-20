import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  persistHsppEvidence,
} from "../lib/hspp/persistHsppEvidence";

const organizationId =
  "00000000-0000-0000-0000-000000000100";

const providerObservationId =
  "00000000-0000-0000-0000-000000000500";

function buildEvidence() {
  return buildHsppEvidence({
    sourceClass:
      "external_intelligence",

    sourceProvider:
      "here",

    sourceStream:
      "here_traffic",

    sourceMessageId:
      "here-incident-001",

    observedAt:
      "2026-08-20T12:00:00.000Z",

    receivedAt:
      "2026-08-20T12:00:01.000Z",

    payloadSchemaVersion:
      "normalized-route-safety-alert-v1",

    normalizedPayload: {
      type:
        "accident",

      severity:
        "high",

      latitude:
        -33.9249,

      longitude:
        18.4241,
    },
  });
}

function createPersistMock() {
  let inserted:
    Record<string, unknown> | null =
      null;

  const query = {
    insert(
      value: Record<string, unknown>
    ) {
      inserted =
        value;

      return query;
    },

    select() {
      return query;
    },

    async single() {
      const row =
        inserted as Record<
          string,
          unknown
        >;

      return {
        data: {
          id:
            "00000000-0000-0000-0000-000000000600",

          integrity_fingerprint:
            row.integrity_fingerprint,
        },

        error:
          null,
      };
    },
  };

  const supabase = {
    from(table: string) {
      assert.equal(
        table,
        "hspp_evidence"
      );

      return query;
    },
  };

  return {
    supabase,

    getInserted() {
      return inserted;
    },
  };
}

test(
  "provider observation id is persisted when supplied",
  async () => {
    const mock =
      createPersistMock();

    await persistHsppEvidence({
      supabase:
        mock.supabase,

      organizationId,

      evidence:
        buildEvidence(),

      providerObservationId,
    });

    const inserted =
      mock.getInserted();

    assert.ok(inserted);

    assert.equal(
      inserted.provider_observation_id,
      providerObservationId
    );
  }
);

test(
  "provider observation id defaults to null for existing callers",
  async () => {
    const mock =
      createPersistMock();

    await persistHsppEvidence({
      supabase:
        mock.supabase,

      organizationId,

      evidence:
        buildEvidence(),
    });

    const inserted =
      mock.getInserted();

    assert.ok(inserted);

    assert.equal(
      inserted.provider_observation_id,
      null
    );
  }
);

test(
  "provider observation linkage does not replace telematics source linkage",
  async () => {
    const mock =
      createPersistMock();

    const telematicsReceiptId =
      "00000000-0000-0000-0000-000000000700";

    const vehicleId =
      "00000000-0000-0000-0000-000000000800";

    await persistHsppEvidence({
      supabase:
        mock.supabase,

      organizationId,

      evidence:
        buildEvidence(),

      providerObservationId,

      telematicsReceiptId,

      vehicleId,

      tripId:
        null,
    });

    const inserted =
      mock.getInserted();

    assert.ok(inserted);

    assert.equal(
      inserted.provider_observation_id,
      providerObservationId
    );

    assert.equal(
      inserted.telematics_receipt_id,
      telematicsReceiptId
    );

    assert.equal(
      inserted.vehicle_id,
      vehicleId
    );

    assert.equal(
      inserted.trip_id,
      null
    );
  }
);

test(
  "provider observation linkage does not alter sealed evidence state",
  async () => {
    const mock =
      createPersistMock();

    const evidence =
      buildEvidence();

    await persistHsppEvidence({
      supabase:
        mock.supabase,

      organizationId,

      evidence,

      providerObservationId,
    });

    const inserted =
      mock.getInserted();

    assert.ok(inserted);

    assert.equal(
      inserted.integrity_state,
      evidence.integrityState
    );

    assert.equal(
      inserted.validation_state,
      evidence.validationState
    );

    assert.equal(
      inserted.trust_state,
      evidence.trustState
    );

    assert.equal(
      inserted.crowd_eligible,
      false
    );

    assert.equal(
      inserted.training_eligible,
      false
    );

    assert.equal(
      inserted.validation_eligible,
      false
    );
  }
);
