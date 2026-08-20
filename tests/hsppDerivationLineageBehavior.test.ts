import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
  HSPP_CANONICALIZATION_VERSION_V1,
  HSPP_CANONICALIZATION_VERSION_V2,
} from "../lib/hspp/buildHsppEvidence";

import {
  verifyHsppEvidenceIntegrity,
} from "../lib/hspp/verifyHsppEvidenceIntegrity";

function buildRootEvidence() {
  return buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "traccar",
    sourceStream: "positions",
    sourceMessageId: "root-position-001",
    observedAt:
      "2026-08-20T08:00:00.000Z",
    receivedAt:
      "2026-08-20T08:00:01.000Z",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    normalizedPayload: {
      latitude: -33.9249,
      longitude: 18.4241,
      speedKmh: 50,
    },
  });
}

function verify(
  evidence: ReturnType<typeof buildHsppEvidence>,
  overrides: Record<string, unknown> = {}
) {
  return verifyHsppEvidenceIntegrity({
    protocolVersion:
      evidence.protocolVersion,
    canonicalizationVersion:
      evidence.canonicalizationVersion,
    sourceClass:
      evidence.sourceClass,
    sourceProvider:
      evidence.sourceProvider,
    sourceStream:
      evidence.sourceStream,
    sourceMessageId:
      evidence.sourceMessageId,
    observedAt:
      evidence.observedAt,
    receivedAt:
      evidence.receivedAt,
    payloadSchemaVersion:
      evidence.payloadSchemaVersion,
    normalizedPayload:
      evidence.normalizedPayload,
    integrityAlgorithm:
      evidence.integrityAlgorithm,
    integrityFingerprint:
      evidence.integrityFingerprint,
    trustState:
      evidence.trustState,
    derivationLineage:
      evidence.derivationLineage,
    ...overrides,
  });
}

test("existing root evidence remains canonical v1", () => {
  const evidence =
    buildRootEvidence();

  assert.equal(
    evidence.canonicalizationVersion,
    HSPP_CANONICALIZATION_VERSION_V1
  );

  assert.equal(
    evidence.derivationLineage,
    null
  );

  assert.equal(
    verify(evidence).status,
    "MATCH"
  );
});

test("derived evidence automatically uses lineage canonical v2", () => {
  const parent =
    buildRootEvidence();

  const child =
    buildHsppEvidence({
      sourceClass: "derived",
      sourceProvider: "harborguard",
      sourceStream:
        "normalized-vehicle-location",
      sourceMessageId:
        "derived-location-001",
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
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          parent.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "vehicle-location-normalization-v1",
      },
    });

  assert.equal(
    child.canonicalizationVersion,
    HSPP_CANONICALIZATION_VERSION_V2
  );

  assert.equal(
    verify(child).status,
    "MATCH"
  );
});

test("changing the parent fingerprint breaks child integrity", () => {
  const parent =
    buildRootEvidence();

  const child =
    buildHsppEvidence({
      sourceClass: "derived",
      sourceProvider: "harborguard",
      sourceStream: "derived",
      sourceMessageId: "derived-002",
      observedAt:
        parent.observedAt,
      payloadSchemaVersion:
        "derived-v1",
      normalizedPayload: {
        risk: 0.2,
      },
      derivationLineage: {
        parentEvidenceId:
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          parent.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "normalization-v1",
      },
    });

  const result =
    verify(child, {
      derivationLineage: {
        ...child.derivationLineage!,
        parentIntegrityFingerprint:
          "a".repeat(64),
      },
    });

  assert.equal(
    result.status,
    "MISMATCH"
  );
});

test("changing derivation version breaks child integrity", () => {
  const parent =
    buildRootEvidence();

  const child =
    buildHsppEvidence({
      sourceClass: "derived",
      sourceProvider: "harborguard",
      sourceStream: "derived",
      sourceMessageId: "derived-003",
      observedAt:
        parent.observedAt,
      payloadSchemaVersion:
        "derived-v1",
      normalizedPayload: {
        value: 1,
      },
      derivationLineage: {
        parentEvidenceId:
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          parent.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "normalization-v1",
      },
    });

  const result =
    verify(child, {
      derivationLineage: {
        ...child.derivationLineage!,
        derivationVersion:
          "normalization-v2",
      },
    });

  assert.equal(
    result.status,
    "MISMATCH"
  );
});

test("changing derivation type breaks child integrity", () => {
  const parent =
    buildRootEvidence();

  const child =
    buildHsppEvidence({
      sourceClass: "derived",
      sourceProvider: "harborguard",
      sourceStream: "derived",
      sourceMessageId: "derived-004",
      observedAt:
        parent.observedAt,
      payloadSchemaVersion:
        "derived-v1",
      normalizedPayload: {
        value: 1,
      },
      derivationLineage: {
        parentEvidenceId:
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          parent.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "normalization-v1",
      },
    });

  const result =
    verify(child, {
      derivationLineage: {
        ...child.derivationLineage!,
        derivationType:
          "aggregation",
      },
    });

  assert.equal(
    result.status,
    "MISMATCH"
  );
});

test("lineage v2 without lineage fails closed", () => {
  const root =
    buildRootEvidence();

  const result =
    verify(root, {
      canonicalizationVersion:
        HSPP_CANONICALIZATION_VERSION_V2,
      derivationLineage:
        null,
    });

  assert.equal(
    result.status,
    "INVALID_DERIVATION_LINEAGE"
  );
});

test("canonical v1 refuses an injected lineage tuple", () => {
  const root =
    buildRootEvidence();

  const result =
    verify(root, {
      canonicalizationVersion:
        HSPP_CANONICALIZATION_VERSION_V1,
      derivationLineage: {
        parentEvidenceId:
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          root.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "normalization-v1",
      },
    });

  assert.equal(
    result.status,
    "INVALID_DERIVATION_LINEAGE"
  );
});

test("derived evidence still does not promote trust or training eligibility", () => {
  const parent =
    buildRootEvidence();

  const child =
    buildHsppEvidence({
      sourceClass: "derived",
      sourceProvider: "harborguard",
      sourceStream: "derived",
      sourceMessageId: "derived-005",
      observedAt:
        parent.observedAt,
      payloadSchemaVersion:
        "derived-v1",
      normalizedPayload: {
        value: 1,
      },
      derivationLineage: {
        parentEvidenceId:
          "00000000-0000-0000-0000-000000000001",
        parentIntegrityFingerprint:
          parent.integrityFingerprint,
        derivationType:
          "normalization",
        derivationVersion:
          "normalization-v1",
      },
    });

  assert.equal(
    child.trustState,
    "UNASSESSED"
  );

  assert.equal(
    child.crowdEligible,
    false
  );

  assert.equal(
    child.trainingEligible,
    false
  );
});
