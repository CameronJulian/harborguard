import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  verifyHsppEvidenceIntegrity,
} from "../lib/hspp/verifyHsppEvidenceIntegrity";

function buildFixture() {
  return buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "traccar",
    sourceStream: "positions",
    sourceMessageId: "traccar-position-1001",
    observedAt: "2026-08-20T08:00:00.000Z",
    receivedAt: "2026-08-20T08:00:01.000Z",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    normalizedPayload: {
      providerDeviceId: "device-001",
      vehicleId: "vehicle-001",
      latitude: -33.9249,
      longitude: 18.4241,
      speedKmh: 54.25,
      heading: 182,
      recordedAt:
        "2026-08-20T08:00:00.000Z",
      metadata: {
        satellites: 11,
        ignition: true,
        nested: {
          beta: 2,
          alpha: 1,
        },
      },
    },
  });
}

function verify(
  evidence: ReturnType<typeof buildFixture>,
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
    ...overrides,
  });
}

test("freshly sealed HSPP evidence verifies MATCH", () => {
  const evidence = buildFixture();
  const result = verify(evidence);

  assert.equal(result.status, "MATCH");

  if (result.status === "MATCH") {
    assert.equal(
      result.actualFingerprint,
      evidence.integrityFingerprint
    );
    assert.equal(
      result.expectedFingerprint,
      evidence.integrityFingerprint
    );
  }
});

test("top-level payload key ordering does not change integrity", () => {
  const evidence = buildFixture();

  const payload = evidence.normalizedPayload;

  const reorderedPayload = {
    metadata: payload.metadata,
    recordedAt: payload.recordedAt,
    heading: payload.heading,
    speedKmh: payload.speedKmh,
    longitude: payload.longitude,
    latitude: payload.latitude,
    vehicleId: payload.vehicleId,
    providerDeviceId:
      payload.providerDeviceId,
  };

  const result = verify(evidence, {
    normalizedPayload: reorderedPayload,
  });

  assert.equal(result.status, "MATCH");
});

test("nested payload key ordering does not change integrity", () => {
  const evidence = buildFixture();

  const payload = evidence.normalizedPayload;
  const metadata =
    payload.metadata as Record<string, unknown>;

  const nested =
    metadata.nested as Record<string, unknown>;

  const reorderedPayload = {
    ...payload,
    metadata: {
      ...metadata,
      nested: {
        alpha: nested.alpha,
        beta: nested.beta,
      },
    },
  };

  const result = verify(evidence, {
    normalizedPayload: reorderedPayload,
  });

  assert.equal(result.status, "MATCH");
});

test("latitude mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    normalizedPayload: {
      ...evidence.normalizedPayload,
      latitude: -33.9255,
    },
  });

  assert.equal(result.status, "MISMATCH");
});

test("longitude mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    normalizedPayload: {
      ...evidence.normalizedPayload,
      longitude: 18.4255,
    },
  });

  assert.equal(result.status, "MISMATCH");
});

test("observedAt mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    observedAt:
      "2026-08-20T08:00:10.000Z",
  });

  assert.equal(result.status, "MISMATCH");
});

test("source message identity mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    sourceMessageId:
      "traccar-position-9999",
  });

  assert.equal(result.status, "MISMATCH");
});

test("source provider mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    sourceProvider: "other-provider",
  });

  assert.equal(result.status, "MISMATCH");
});

test("source stream mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    sourceStream: "events",
  });

  assert.equal(result.status, "MISMATCH");
});

test("payload schema mutation causes MISMATCH", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    payloadSchemaVersion:
      "normalized-telematics-position-v2",
  });

  assert.equal(result.status, "MISMATCH");
});

test("receivedAt mutation does not change integrity", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    receivedAt:
      "2026-08-21T12:30:00.000Z",
  });

  assert.equal(result.status, "MATCH");
});

test("unsupported protocol version is explicit", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    protocolVersion: "99.0",
  });

  assert.deepEqual(result, {
    status:
      "UNSUPPORTED_PROTOCOL_VERSION",
    protocolVersion: "99.0",
  });
});

test("unsupported canonicalization version is explicit", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    canonicalizationVersion:
      "hspp-canonical-json-v99",
  });

  assert.deepEqual(result, {
    status:
      "UNSUPPORTED_CANONICALIZATION_VERSION",
    canonicalizationVersion:
      "hspp-canonical-json-v99",
  });
});

test("unsupported integrity algorithm is explicit", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    integrityAlgorithm: "sha512",
  });

  assert.deepEqual(result, {
    status:
      "UNSUPPORTED_INTEGRITY_ALGORITHM",
    integrityAlgorithm: "sha512",
  });
});

test("malformed stored fingerprint fails integrity verification", () => {
  const evidence = buildFixture();

  const result = verify(evidence, {
    integrityFingerprint: "not-a-valid-sha256",
  });

  assert.equal(result.status, "MISMATCH");
});

test("integrity verification does not promote trust state", () => {
  const evidence = buildFixture();

  assert.equal(
    evidence.trustState,
    "UNASSESSED"
  );

  const result = verify(evidence);

  assert.equal(result.status, "MATCH");
  assert.equal("trustState" in result, false);
});
