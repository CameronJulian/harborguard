import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importTomTomIncidents.ts",
  "utf8"
);

test(
  "TomTom retains assessment context by normalized input index",
  () => {
    assert.match(
      source,
      /TomTomHsppAssessmentContext\[\]/
    );

    assert.match(
      source,
      /length:\s*normalizedIncidents\.length/
    );

    assert.match(
      source,
      /hsppAssessmentContexts\[inputIndex\]\s*=\s*\{/
    );
  }
);

test(
  "missing immutable TomTom provenance leaves assessment context empty",
  () => {
    const guard =
      source.indexOf(
        "!normalized.providerMessageId ||"
      );

    const assignment =
      source.indexOf(
        "hsppAssessmentContexts[inputIndex] = {"
      );

    assert.ok(guard >= 0);
    assert.ok(assignment > guard);
  }
);

test(
  "TomTom retains provider evidence persistence result",
  () => {
    assert.match(
      source,
      /const persistedEvidence =[\s\S]*persistHsppEvidenceForProviderObservation/
    );

    assert.match(
      source,
      /persistedEvidence,\s*\n\s*\};/
    );
  }
);

test(
  "TomTom requires one upsert resolution per enriched input row",
  () => {
    assert.match(
      source,
      /result\.resolutions\.length !==[\s\S]*rows\.length/
    );
  }
);

test(
  "TomTom consumes authoritative upsert resolution by input index",
  () => {
    assert.match(
      source,
      /result\.resolutions\[inputIndex\]/
    );

    assert.match(
      source,
      /resolution\.inputIndex !== inputIndex/
    );
  }
);

test(
  "TomTom preserves canonical 48-hour freshness boundary",
  () => {
    assert.match(
      source,
      /HSPP_PROVIDER_FRESHNESS_HOURS = 48/
    );

    assert.match(
      source,
      /providerLastSeen\[[\s\S]*"tomtom"[\s\S]*\]/
    );

    assert.match(
      source,
      /providerLastSeenTime >=[\s\S]*staleBeforeMs/
    );
  }
);

test(
  "TomTom assessment consumes authoritative provider quality",
  () => {
    assert.match(
      source,
      /providerSources:\s*resolution\.providerSources/
    );

    assert.match(
      source,
      /providerConfirmationCount:[\s\S]*resolution[\s\S]*\.providerConfirmationCount/
    );

    assert.match(
      source,
      /providerConfidence:\s*resolution\.providerConfidence/
    );
  }
);

test(
  "TomTom assessment uses canonical source identity",
  () => {
    assert.match(
      source,
      /sourceKey:\s*"tomtom"/
    );
  }
);

test(
  "TomTom verifies then assesses then persists decision",
  () => {
    const verification =
      source.indexOf(
        "verifyHsppEvidenceIntegrity({"
      );

    const assessment =
      source.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    const persistence =
      source.indexOf(
        "applyHsppAssessmentDecision({"
      );

    assert.ok(verification >= 0);
    assert.ok(assessment > verification);
    assert.ok(persistence > assessment);
  }
);

test(
  "TomTom assessment occurs after mutable Route Safety resolution",
  () => {
    const upsert =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    const assessment =
      source.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    assert.ok(upsert >= 0);
    assert.ok(assessment > upsert);
  }
);

test(
  "TomTom assessment integration remains independent of HERE source identity",
  () => {
    assert.doesNotMatch(
      source,
      /"here_traffic"/
    );
  }
);
