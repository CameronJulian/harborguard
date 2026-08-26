import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const assessor = fs.readFileSync(
  "lib/hspp/assessHsppExternalIntelligenceEvidence.ts",
  "utf8"
);

test(
  "external intelligence has a versioned HSPP assessment policy",
  () => {
    assert.match(
      assessor,
      /hspp-external-intelligence-assessment-v1/
    );

    assert.match(
      assessor,
      /normalized-route-safety-alert-v1/
    );
  }
);

test(
  "external intelligence supports HERE, TomTom, and Azure Maps source identities",
  () => {
    assert.match(
      assessor,
      /provider === "here"/
    );

    assert.match(
      assessor,
      /return "here_traffic"/
    );

    assert.match(
      assessor,
      /provider === "tomtom"/
    );

    assert.match(
      assessor,
      /return "tomtom"/
    );

    assert.match(
      assessor,
      /provider === "azure_maps"/
    );

    assert.match(
      assessor,
      /return "azure_maps_traffic"/
    );

    assert.match(
      assessor,
      /sourceClass !== "external_intelligence"/
    );
  }
);

test(
  "external intelligence requires verified validated evidence",
  () => {
    assert.match(
      assessor,
      /verification\.status !== "MATCH"/
    );

    assert.match(
      assessor,
      /validationState !== "VALIDATED"/
    );
  }
);

test(
  "external intelligence requires enabled approved sources",
  () => {
    assert.match(
      assessor,
      /!input\.sourceEnabled/
    );

    assert.match(
      assessor,
      /!input\.sourceApprovedForIngestion/
    );
  }
);

test(
  "external intelligence requires active fresh provider observations",
  () => {
    assert.match(
      assessor,
      /alertStatus !== "active"/
    );

    assert.match(
      assessor,
      /providerConfirmationCount < 1/
    );

    assert.match(
      assessor,
      /providerSources\.includes\(requiredSourceKey\)/
    );

    assert.match(
      assessor,
      /!input\.providerLastSeenValid/
    );

    assert.match(
      assessor,
      /!input\.providerObservationFresh/
    );
  }
);

test(
  "external intelligence validates confidence range without inventing a trust threshold",
  () => {
    assert.match(
      assessor,
      /providerConfidence < 0/
    );

    assert.match(
      assessor,
      /providerConfidence > 100/
    );

    assert.doesNotMatch(
      assessor,
      /providerConfidence\s*[<>]=?\s*(50|60|70|75|80|90)/
    );
  }
);

test(
  "external intelligence does not require cross-provider corroboration",
  () => {
    assert.match(
      assessor,
      /providerConfirmationCount < 1/
    );

    assert.doesNotMatch(
      assessor,
      /providerConfirmationCount < 2/
    );

    assert.doesNotMatch(
      assessor,
      /providerConfirmationCount >= 2/
    );
  }
);

test(
  "external intelligence can become operationally plausible",
  () => {
    assert.match(
      assessor,
      /trustState: "PLAUSIBLE"/
    );

    assert.match(
      assessor,
      /operationalEligible: true/
    );

    assert.match(
      assessor,
      /reason: "plausibility_passed"/
    );
  }
);

test(
  "HSPP-008A2 does not authorize Crowd or ML usage",
  () => {
    assert.doesNotMatch(
      assessor,
      /crowdEligible:\s*true/
    );

    assert.doesNotMatch(
      assessor,
      /trainingEligible:\s*true/
    );

    assert.doesNotMatch(
      assessor,
      /validationEligible:\s*true/
    );
  }
);

test(
  "HSPP-008A2 assessor remains pure and persistence-free",
  () => {
    assert.doesNotMatch(
      assessor,
      /supabase/
    );

    assert.doesNotMatch(
      assessor,
      /\.from\(/
    );

    assert.doesNotMatch(
      assessor,
      /\.insert\(/
    );

    assert.doesNotMatch(
      assessor,
      /\.update\(/
    );

    assert.doesNotMatch(
      assessor,
      /Date\.now/
    );

    assert.doesNotMatch(
      assessor,
      /new Date/
    );
  }
);
