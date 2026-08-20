import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

test(
  "HERE ingestion uses the provider-observation persistence boundary",
  () => {
    assert.match(
      source,
      /persistRouteSafetyProviderObservation/
    );
  }
);

test(
  "HERE preserves provider-native incident identity",
  () => {
    assert.match(
      source,
      /details\?\.originalId/
    );

    assert.match(
      source,
      /details\?\.id/
    );
  }
);

test(
  "HERE preserves provider-native observation time",
  () => {
    assert.match(
      source,
      /details\?\.entryTime/
    );

    assert.match(
      source,
      /details\?\.startTime/
    );
  }
);

test(
  "HERE provider observation uses canonical HSPP source identity",
  () => {
    assert.match(
      source,
      /provider:\s*"here"/
    );

    assert.match(
      source,
      /sourceStream:\s*"here_traffic"/
    );

    assert.match(
      source,
      /HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION/
    );
  }
);

test(
  "HERE does not fabricate provider identity from alert title or coordinates",
  () => {
    assert.doesNotMatch(
      source,
      /providerMessageId:[\s\S]{0,200}(title|latitude|longitude)/i
    );
  }
);

test(
  "HERE observation persistence occurs before mutable Route Safety upsert",
  () => {
    const persistenceIndex =
      source.indexOf(
        "persistRouteSafetyProviderObservation({"
      );

    const routeSafetyIndex =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    assert.ok(
      persistenceIndex >= 0
    );

    assert.ok(
      routeSafetyIndex >= 0
    );

    assert.ok(
      persistenceIndex <
        routeSafetyIndex
    );
  }
);

test(
  "HERE integration still does not assess HSPP evidence yet",
  () => {
    assert.doesNotMatch(
      source,
      /await\s+assessHsppExternalIntelligenceEvidence\s*\(/
    );

    assert.doesNotMatch(
      source,
      /applyHsppAssessmentDecision/
    );
  }
);
