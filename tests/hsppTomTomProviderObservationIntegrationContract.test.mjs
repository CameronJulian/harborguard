import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importTomTomIncidents.ts",
  "utf8"
);

test(
  "TomTom requests provider-native identity and report time",
  () => {
    assert.match(
      source,
      /properties\{id,lastReportTime,iconCategory/
    );
  }
);

test(
  "TomTom preserves provider-native incident identity",
  () => {
    assert.match(
      source,
      /typeof properties\?\.id === "string"/
    );

    assert.match(
      source,
      /properties\.id\.trim\(\)/
    );
  }
);

test(
  "TomTom uses lastReportTime as observation time only",
  () => {
    assert.match(
      source,
      /typeof properties\?\.lastReportTime === "string"/
    );

    assert.match(
      source,
      /Date\.parse\(observedAtCandidate\)/
    );

    assert.doesNotMatch(
      source,
      /observedAtCandidate[\s\S]*startTime/
    );

    assert.doesNotMatch(
      source,
      /observedAtCandidate[\s\S]*endTime/
    );
  }
);

test(
  "TomTom does not fabricate observation time",
  () => {
    assert.match(
      source,
      /observedAtCandidate &&[\s\S]*Number\.isFinite\(observedAtMilliseconds\)[\s\S]*: null/
    );
  }
);

test(
  "TomTom persists immutable provider observation before mutable Route Safety upsert",
  () => {
    const observation =
      source.indexOf(
        "persistRouteSafetyProviderObservation({"
      );

    const upsert =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    assert.ok(observation >= 0);
    assert.ok(upsert > observation);
  }
);

test(
  "TomTom provider observation uses canonical HSPP source identity",
  () => {
    assert.match(
      source,
      /provider:\s*"tomtom"/
    );

    assert.match(
      source,
      /sourceStream:\s*"tomtom"/
    );
  }
);

test(
  "missing TomTom report time does not block Route Safety ingestion",
  () => {
    assert.match(
      source,
      /!normalized\.providerMessageId \|\|[\s\S]*!normalized\.observedAt[\s\S]*continue;/
    );

    assert.match(
      source,
      /normalizedIncidents\.map\([\s\S]*item\.row/
    );
  }
);

test(
  "B10B1 provider-observation boundary remains before evidence Route Safety and assessment",
  () => {
    const observation =
      source.indexOf(
        "persistRouteSafetyProviderObservation({"
      );

    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const routeSafety =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    const assessment =
      source.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    assert.ok(observation >= 0);
    assert.ok(evidence > observation);
    assert.ok(routeSafety > evidence);
    assert.ok(assessment > routeSafety);
  }
);
