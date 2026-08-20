import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHsppTraccarEvidence,
  HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION,
} from "../lib/hspp/assessHsppTraccarEvidence";

const MATCH = {
  status: "MATCH",
  expectedFingerprint: "a".repeat(64),
  actualFingerprint: "a".repeat(64),
} as const;

function baseInput() {
  return {
    verification: MATCH,
    validationState: "VALIDATED",
    sourceClass: "telematics",
    sourceProvider: "traccar",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    processingOutcome: "accepted" as const,
  };
}

test("HSPP Traccar assessment policy is explicitly versioned", () => {
  const result =
    assessHsppTraccarEvidence(baseInput());

  assert.equal(
    result.policyVersion,
    HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION
  );
});

test("accepted verified Traccar evidence becomes plausible", () => {
  const result =
    assessHsppTraccarEvidence(baseInput());

  assert.equal(result.trustState, "PLAUSIBLE");
  assert.equal(result.operationalEligible, true);
  assert.equal(result.reason, "plausibility_passed");
});

test("jitter remains plausible", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      processingOutcome: "jitter",
    });

  assert.equal(result.trustState, "PLAUSIBLE");
  assert.equal(result.operationalEligible, true);
});

test("gps spike does not become plausible", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      processingOutcome: "gps_spike",
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
  assert.equal(result.reason, "gps_spike_rejected");
});

test("failed processing does not become plausible", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      processingOutcome: "failed",
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
});

test("integrity mismatch fails closed", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      verification: {
        status: "MISMATCH",
        expectedFingerprint: "a".repeat(64),
        actualFingerprint: "b".repeat(64),
      },
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
  assert.equal(result.reason, "integrity_not_verified");
});

test("unvalidated evidence fails closed", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      validationState: "REJECTED",
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
});

test("unsupported provider fails closed", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      sourceProvider: "other-provider",
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
});

test("unsupported payload schema fails closed", () => {
  const result =
    assessHsppTraccarEvidence({
      ...baseInput(),
      payloadSchemaVersion: "unknown-schema",
    });

  assert.equal(result.trustState, "UNASSESSED");
  assert.equal(result.operationalEligible, false);
});

test("HSPP-006A never enables Crowd or ML eligibility", () => {
  for (const processingOutcome of [
    "accepted",
    "jitter",
    "gps_spike",
    "failed",
  ] as const) {
    const result =
      assessHsppTraccarEvidence({
        ...baseInput(),
        processingOutcome,
      });

    assert.equal(result.crowdEligible, false);
    assert.equal(result.trainingEligible, false);
    assert.equal(result.validationEligible, false);
  }
});
