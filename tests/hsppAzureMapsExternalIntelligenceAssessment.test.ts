import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHsppExternalIntelligenceEvidence,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
} from "../lib/hspp/assessHsppExternalIntelligenceEvidence";

const A64 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function validAzureInput() {
  return {
    verification: {
      status: "MATCH",
      expectedFingerprint: A64,
      actualFingerprint: A64,
    } as any,

    validationState:
      "VALIDATED",

    sourceClass:
      "external_intelligence",

    sourceProvider:
      "azure_maps",

    sourceKey:
      "azure_maps_traffic",

    payloadSchemaVersion:
      HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,

    sourceEnabled:
      true,

    sourceApprovedForIngestion:
      true,

    alertStatus:
      "active",

    providerSources:
      [
        "azure_maps_traffic",
      ],

    providerConfirmationCount:
      1,

    providerConfidence:
      70,

    providerObservationFresh:
      true,

    providerLastSeenValid:
      true,
  };
}

test(
  "valid single-provider Azure Maps evidence becomes operationally plausible",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validAzureInput()
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
  "Azure Maps provider with wrong source key fails closed",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence({
        ...validAzureInput(),
        sourceKey:
          "tomtom",
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );

    assert.equal(
      result.operationalEligible,
      false
    );

    assert.equal(
      result.reason,
      "unsupported_source"
    );
  }
);
