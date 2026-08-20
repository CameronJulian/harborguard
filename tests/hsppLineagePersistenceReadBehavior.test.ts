import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  persistHsppEvidence,
} from "../lib/hspp/persistHsppEvidence";

import {
  readAndVerifyHsppEvidence,
} from "../lib/hspp/readAndVerifyHsppEvidence";

const organizationId =
  "00000000-0000-0000-0000-000000000100";

const rootEvidenceId =
  "00000000-0000-0000-0000-000000000200";

const derivedEvidenceId =
  "00000000-0000-0000-0000-000000000300";

function buildRoot() {
  return buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "traccar",
    sourceStream: "positions",
    sourceMessageId: "position-root-001",
    observedAt:
      "2026-08-20T08:00:00.000Z",
    receivedAt:
      "2026-08-20T08:00:01.000Z",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    normalizedPayload: {
      latitude: -33.9249,
      longitude: 18.4241,
    },
  });
}

function buildDerived() {
  const parent =
    buildRoot();

  return {
    parent,
    child:
      buildHsppEvidence({
        sourceClass: "derived",
        sourceProvider: "harborguard",
        sourceStream:
          "normalized-vehicle-location",
        sourceMessageId:
          "derived-position-001",
        observedAt:
          parent.observedAt,
        receivedAt:
          "2026-08-20T08:00:02.000Z",
        payloadSchemaVersion:
          "derived-location-v1",
        normalizedPayload: {
          latitude: -33.9249,
          longitude: 18.4241,
        },
        derivationLineage: {
          parentEvidenceId:
            rootEvidenceId,
          parentIntegrityFingerprint:
            parent.integrityFingerprint,
          derivationType:
            "normalization",
          derivationVersion:
            "vehicle-location-normalization-v1",
        },
      }),
  };
}

function createPersistMock(
  returnedId: string
) {
  let inserted:
    Record<string, unknown> | null = null;

  const query = {
    insert(
      value: Record<string, unknown>
    ) {
      inserted = value;
      return query;
    },

    select() {
      return query;
    },

    async single() {
      const record =
        inserted as Record<string, unknown>;

      return {
        data: {
          id: returnedId,
          integrity_fingerprint:
            record.integrity_fingerprint,
        },
        error: null,
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

function rowFromEvidence(
  id: string,
  evidence:
    ReturnType<typeof buildHsppEvidence>
) {
  const lineage =
    evidence.derivationLineage;

  return {
    id,
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
      evidence.validationState,

    trust_state:
      evidence.trustState,

    parent_evidence_id:
      lineage?.parentEvidenceId ??
      null,

    parent_integrity_fingerprint:
      lineage?.parentIntegrityFingerprint ??
      null,

    derivation_type:
      lineage?.derivationType ??
      null,

    derivation_version:
      lineage?.derivationVersion ??
      null,
  };
}

function createReadMock(
  row: Record<string, unknown>
) {
  const query = {
    select() {
      return query;
    },

    eq() {
      return query;
    },

    async maybeSingle() {
      return {
        data: row,
        error: null,
      };
    },
  };

  return {
    from(table: string) {
      assert.equal(
        table,
        "hspp_evidence"
      );

      return query;
    },
  };
}

test("root evidence persists all lineage columns as null", async () => {
  const evidence =
    buildRoot();

  const mock =
    createPersistMock(
      rootEvidenceId
    );

  await persistHsppEvidence({
    supabase:
      mock.supabase,
    organizationId,
    evidence,
  });

  const inserted =
    mock.getInserted();

  assert.ok(inserted);

  assert.equal(
    inserted.parent_evidence_id,
    null
  );

  assert.equal(
    inserted.parent_integrity_fingerprint,
    null
  );

  assert.equal(
    inserted.derivation_type,
    null
  );

  assert.equal(
    inserted.derivation_version,
    null
  );
});

test("derived evidence persists the complete lineage tuple", async () => {
  const { child } =
    buildDerived();

  const mock =
    createPersistMock(
      derivedEvidenceId
    );

  await persistHsppEvidence({
    supabase:
      mock.supabase,
    organizationId,
    evidence:
      child,
  });

  const inserted =
    mock.getInserted();

  assert.ok(inserted);

  assert.equal(
    inserted.parent_evidence_id,
    rootEvidenceId
  );

  assert.equal(
    inserted.parent_integrity_fingerprint,
    child.derivationLineage!
      .parentIntegrityFingerprint
  );

  assert.equal(
    inserted.derivation_type,
    "normalization"
  );

  assert.equal(
    inserted.derivation_version,
    "vehicle-location-normalization-v1"
  );
});

test("persisted root evidence reconstructs null lineage and verifies MATCH", async () => {
  const root =
    buildRoot();

  const supabase =
    createReadMock(
      rowFromEvidence(
        rootEvidenceId,
        root
      )
    );

  const result =
    await readAndVerifyHsppEvidence({
      supabase:
        supabase as never,
      organizationId,
      evidenceId:
        rootEvidenceId,
    });

  assert.equal(
    result.found,
    true
  );

  if (result.found) {
    assert.equal(
      result.evidence.derivationLineage,
      null
    );

    assert.equal(
      result.verification.status,
      "MATCH"
    );
  }
});

test("persisted derived evidence reconstructs lineage and verifies MATCH", async () => {
  const { child } =
    buildDerived();

  const supabase =
    createReadMock(
      rowFromEvidence(
        derivedEvidenceId,
        child
      )
    );

  const result =
    await readAndVerifyHsppEvidence({
      supabase:
        supabase as never,
      organizationId,
      evidenceId:
        derivedEvidenceId,
    });

  assert.equal(
    result.found,
    true
  );

  if (result.found) {
    assert.deepEqual(
      result.evidence.derivationLineage,
      child.derivationLineage
    );

    assert.equal(
      result.verification.status,
      "MATCH"
    );
  }
});

test("changing persisted parent fingerprint produces MISMATCH", async () => {
  const { child } =
    buildDerived();

  const row =
    rowFromEvidence(
      derivedEvidenceId,
      child
    );

  row.parent_integrity_fingerprint =
    "a".repeat(64);

  const result =
    await readAndVerifyHsppEvidence({
      supabase:
        createReadMock(row) as never,
      organizationId,
      evidenceId:
        derivedEvidenceId,
    });

  assert.equal(
    result.found,
    true
  );

  if (result.found) {
    assert.equal(
      result.verification.status,
      "MISMATCH"
    );
  }
});

test("partial persisted lineage is rejected before verification", async () => {
  const { child } =
    buildDerived();

  const row =
    rowFromEvidence(
      derivedEvidenceId,
      child
    );

  row.derivation_version =
    null;

  await assert.rejects(
    () =>
      readAndVerifyHsppEvidence({
        supabase:
          createReadMock(row) as never,
        organizationId,
        evidenceId:
          derivedEvidenceId,
      }),
    /derivation lineage must be either entirely null or complete/
  );
});
