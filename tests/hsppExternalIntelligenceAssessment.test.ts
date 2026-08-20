import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
  assessHsppExternalIntelligenceEvidence,
  type AssessHsppExternalIntelligenceEvidenceInput,
} from "../lib/hspp/assessHsppExternalIntelligenceEvidence";

function validHereInput(
  overrides: Partial<AssessHsppExternalIntelligenceEvidenceInput> = {}
): AssessHsppExternalIntelligenceEvidenceInput {
  return {
    verification: {
      status: "MATCH",
      expectedFingerprint:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      actualFingerprint:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },

    validationState: "VALIDATED",

    sourceClass: "external_intelligence",
    sourceProvider: "here",
    sourceKey: "here_traffic",
    payloadSchemaVersion:
      HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,

    sourceEnabled: true,
    sourceApprovedForIngestion: true,

    alertStatus: "active",

    providerSources: ["here_traffic"],
    providerConfirmationCount: 1,
    providerConfidence: 55,

    providerObservationFresh: true,
    providerLastSeenValid: true,

    ...overrides,
  };
}

function assertFailClosed(
  result: ReturnType<
    typeof assessHsppExternalIntelligenceEvidence
  >,
  reason: string
) {
  assert.equal(
    result.policyVersion,
    HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION
  );

  assert.equal(
    result.trustState,
    "UNASSESSED"
  );

  assert.equal(
    result.operationalEligible,
    false
  );

  assert.equal(
    result.crowdEligible,
    false
  );

  assert.equal(
    result.trainingEligible,
    false
  );

  assert.equal(
    result.validationEligible,
    false
  );

  assert.equal(
    result.reason,
    reason
  );
}

test(
  "valid single-provider HERE evidence becomes operationally plausible",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput()
      );

    assert.equal(
      result.policyVersion,
      HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION
    );

    assert.equal(
      result.trustState,
      "PLAUSIBLE"
    );

    assert.equal(
      result.operationalEligible,
      true
    );

    assert.equal(
      result.reason,
      "plausibility_passed"
    );

    assert.equal(
      result.crowdEligible,
      false
    );

    assert.equal(
      result.trainingEligible,
      false
    );

    assert.equal(
      result.validationEligible,
      false
    );
  }
);

test(
  "valid single-provider TomTom evidence becomes operationally plausible",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceProvider: "tomtom",
          sourceKey: "tomtom",
          providerSources: ["tomtom"],
          providerConfidence: 60,
        })
      );

    assert.equal(
      result.trustState,
      "PLAUSIBLE"
    );

    assert.equal(
      result.operationalEligible,
      true
    );

    assert.equal(
      result.reason,
      "plausibility_passed"
    );
  }
);

test(
  "cross-provider corroboration is allowed but not required",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerSources: [
            "here_traffic",
            "tomtom",
          ],
          providerConfirmationCount: 2,
          providerConfidence: 80,
        })
      );

    assert.equal(
      result.trustState,
      "PLAUSIBLE"
    );

    assert.equal(
      result.operationalEligible,
      true
    );
  }
);

test(
  "confidence zero is valid and does not create an implicit threshold",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfidence: 0,
        })
      );

    assert.equal(
      result.trustState,
      "PLAUSIBLE"
    );

    assert.equal(
      result.operationalEligible,
      true
    );
  }
);

test(
  "confidence one hundred is valid",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfidence: 100,
        })
      );

    assert.equal(
      result.trustState,
      "PLAUSIBLE"
    );

    assert.equal(
      result.operationalEligible,
      true
    );
  }
);

test(
  "integrity mismatch fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          verification: {
            status: "MISMATCH",
            expectedFingerprint:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            actualFingerprint:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          },
        })
      );

    assertFailClosed(
      result,
      "integrity_not_verified"
    );
  }
);

test(
  "unvalidated evidence fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          validationState: "UNVALIDATED",
        })
      );

    assertFailClosed(
      result,
      "validation_not_validated"
    );
  }
);

test(
  "unsupported source class fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceClass: "telematics",
        })
      );

    assertFailClosed(
      result,
      "unsupported_source"
    );
  }
);

test(
  "unsupported provider fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceProvider: "unknown",
        })
      );

    assertFailClosed(
      result,
      "unsupported_source"
    );
  }
);

test(
  "mismatched provider source key fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceProvider: "here",
          sourceKey: "tomtom",
        })
      );

    assertFailClosed(
      result,
      "unsupported_source"
    );
  }
);

test(
  "unsupported payload schema fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          payloadSchemaVersion:
            "normalized-route-safety-alert-v2",
        })
      );

    assertFailClosed(
      result,
      "unsupported_schema"
    );
  }
);

test(
  "disabled source fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceEnabled: false,
        })
      );

    assertFailClosed(
      result,
      "source_not_enabled"
    );
  }
);

test(
  "unapproved source fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          sourceApprovedForIngestion: false,
        })
      );

    assertFailClosed(
      result,
      "source_not_approved"
    );
  }
);

test(
  "inactive alert fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          alertStatus: "expired",
        })
      );

    assertFailClosed(
      result,
      "alert_not_active"
    );
  }
);

test(
  "zero provider confirmations fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfirmationCount: 0,
        })
      );

    assertFailClosed(
      result,
      "provider_confirmation_missing"
    );
  }
);

test(
  "fractional provider confirmation count fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfirmationCount: 1.5,
        })
      );

    assertFailClosed(
      result,
      "provider_confirmation_missing"
    );
  }
);

test(
  "missing expected provider source fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerSources: ["tomtom"],
        })
      );

    assertFailClosed(
      result,
      "provider_source_missing"
    );
  }
);

test(
  "invalid provider last-seen state fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerLastSeenValid: false,
        })
      );

    assertFailClosed(
      result,
      "provider_last_seen_invalid"
    );
  }
);

test(
  "stale provider observation fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerObservationFresh: false,
        })
      );

    assertFailClosed(
      result,
      "provider_observation_stale"
    );
  }
);

test(
  "negative confidence fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfidence: -1,
        })
      );

    assertFailClosed(
      result,
      "provider_confidence_invalid"
    );
  }
);

test(
  "confidence above one hundred fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfidence: 101,
        })
      );

    assertFailClosed(
      result,
      "provider_confidence_invalid"
    );
  }
);

test(
  "non-finite confidence fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validHereInput({
          providerConfidence: Number.NaN,
        })
      );

    assertFailClosed(
      result,
      "provider_confidence_invalid"
    );
  }
);
