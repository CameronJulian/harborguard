import assert from "node:assert/strict";
import test from "node:test";

import {
  decideHsppOperationalUse,
} from "../lib/hspp/decideHsppOperationalUse";

function allowedEvidence(
  overrides: Record<string, unknown> = {}
): any {
  return {
    found: true,
    verification: {
      status: "MATCH",
      expectedFingerprint: "a".repeat(64),
      actualFingerprint: "a".repeat(64),
    },
    evidence: {
      id: "evidence-1",
      organizationId: "org-1",
      protocolVersion: "0.1",
      canonicalizationVersion:
        "hspp-canonical-json-v1",
      sourceClass: "telematics",
      sourceProvider: "traccar",
      sourceStream: "positions",
      sourceMessageId: "position-1",
      observedAt:
        "2026-08-20T10:00:00.000Z",
      receivedAt:
        "2026-08-20T10:00:01.000Z",
      payloadSchemaVersion:
        "normalized-telematics-position-v1",
      normalizedPayload: {},
      integrityAlgorithm: "sha256",
      integrityFingerprint:
        "a".repeat(64),
      integrityState:
        "INTEGRITY_SEALED",
      validationState:
        "VALIDATED",
      trustState:
        "PLAUSIBLE",
      operationalEligible:
        true,
      assessmentPolicyVersion:
        "hspp-traccar-assessment-v1",
      assessmentReason:
        "plausibility_passed",
      assessedAt:
        "2026-08-20T10:00:02.000Z",
      derivationLineage:
        null,
      ...overrides,
    },
  };
}

test("verified assessed plausible evidence is allowed operationally", () => {
  const result =
    decideHsppOperationalUse(
      allowedEvidence()
    );

  assert.equal(result.allowed, true);
  assert.equal(
    result.reason,
    "operational_use_allowed"
  );
});

test("unassessed evidence is denied even when operational flag is true", () => {
  const result =
    decideHsppOperationalUse(
      allowedEvidence({
        trustState: "UNASSESSED",
      })
    );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "trust_not_operational"
  );
});

test("missing assessment provenance is denied", () => {
  const result =
    decideHsppOperationalUse(
      allowedEvidence({
        assessmentPolicyVersion: null,
        assessmentReason: null,
        assessedAt: null,
      })
    );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "assessment_missing"
  );
});

test("operational eligibility false is denied", () => {
  const result =
    decideHsppOperationalUse(
      allowedEvidence({
        operationalEligible: false,
      })
    );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "operational_not_eligible"
  );
});

test("integrity mismatch is denied", () => {
  const input =
    allowedEvidence();

  input.verification = {
    status: "MISMATCH",
    expectedFingerprint:
      "a".repeat(64),
    actualFingerprint:
      "b".repeat(64),
  };

  const result =
    decideHsppOperationalUse(input);

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "integrity_not_verified"
  );
});

test("evidence not found is denied", () => {
  const result =
    decideHsppOperationalUse({
      found: false,
      evidence: null,
      verification: null,
    });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "evidence_not_found"
  );
});
