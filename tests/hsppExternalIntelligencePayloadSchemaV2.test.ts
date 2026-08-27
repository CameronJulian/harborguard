import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHsppExternalIntelligenceEvidence,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
} from "../lib/hspp/assessHsppExternalIntelligenceEvidence";

const A64 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function validInput(
  provider: "here" | "tomtom" | "azure_maps",
  sourceKey: string,
  payloadSchemaVersion: string,
) {
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
      provider,

    sourceKey,

    payloadSchemaVersion,

    sourceEnabled:
      true,

    sourceApprovedForIngestion:
      true,

    alertStatus:
      "active",

    providerSources:
      [sourceKey],

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
  "legacy v1 external-intelligence evidence remains supported",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validInput(
          "here",
          "here_traffic",
          HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
        ),
      );

    assert.equal(
      result.reason,
      "plausibility_passed",
    );

    assert.equal(
      result.operationalEligible,
      true,
    );
  },
);

test(
  "v2 external-intelligence evidence is supported for HERE and TomTom",
  () => {
    for (
      const item
      of [
        {
          provider:
            "here" as const,

          sourceKey:
            "here_traffic",
        },

        {
          provider:
            "tomtom" as const,

          sourceKey:
            "tomtom",
        },
      ]
    ) {
      const result =
        assessHsppExternalIntelligenceEvidence(
          validInput(
            item.provider,
            item.sourceKey,
            HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
          ),
        );

      assert.equal(
        result.reason,
        "plausibility_passed",
      );

      assert.equal(
        result.operationalEligible,
        true,
      );
    }
  },
);

test(
  "Azure Maps remains restricted to v1",
  () => {
    const result =
      assessHsppExternalIntelligenceEvidence(
        validInput(
          "azure_maps",
          "azure_maps_traffic",
          HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
        ),
      );

    assert.equal(
      result.reason,
      "unsupported_schema",
    );

    assert.equal(
      result.operationalEligible,
      false,
    );
  },
);