import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/upsertRouteSafetyAlerts.ts",
  "utf8"
);

test("upsert exposes additive per-input provider alert resolutions", () => {
  assert.match(
    source,
    /export type ProviderAlertResolution/
  );

  assert.match(
    source,
    /inputIndex: number/
  );

  assert.match(
    source,
    /resolutions: ProviderAlertResolution\[\]/
  );
});

test("upsert resolution domain covers every terminal outcome", () => {
  for (const outcome of [
    "inserted",
    "refreshed_existing",
    "merged_cross_provider",
    "skipped_duplicate",
  ]) {
    assert.match(
      source,
      new RegExp(`"${outcome}"`)
    );
  }
});

test("same-provider resolution uses the exact matched alert id", () => {
  assert.match(
    source,
    /outcome: "refreshed_existing"[\s\S]*String\(sameProviderMatch\.id\)/
  );
});

test("cross-provider resolution uses the exact merged alert id", () => {
  assert.match(
    source,
    /outcome: "merged_cross_provider"[\s\S]*String\(crossProviderMatch\.id\)/
  );
});

test("new inserts return enough persisted identity to correlate by key", () => {
  assert.match(source, /title,/);
  assert.match(source, /latitude,/);
  assert.match(source, /longitude,/);
  assert.match(source, /provider_sources,/);
  assert.match(source, /provider_last_seen,/);
  assert.match(source, /provider_confirmation_count,/);
  assert.match(source, /provider_confidence/);
});

test("insert resolution is key based rather than positional", () => {
  assert.match(
    source,
    /const insertedByKey =/
  );

  assert.match(
    source,
    /buildAlertKey\(\{/
  );

  assert.doesNotMatch(
    source,
    /inserted\[index\]/
  );

  assert.doesNotMatch(
    source,
    /uniqueRows\[index\]/
  );
});

test("queued duplicates resolve through the pending canonical key", () => {
  assert.match(
    source,
    /pendingInsertedByKey/
  );

  assert.match(
    source,
    /outcome: "skipped_duplicate"/
  );
});

test("existing aggregate counters remain in the public result", () => {
  assert.match(source, /imported: number/);
  assert.match(source, /refreshedExisting: number/);
  assert.match(source, /skippedDuplicates: number/);
  assert.match(source, /mergedDuplicates: number/);
});

test("B9B1 does not introduce HERE TomTom or HSPP assessment dependencies", () => {
  assert.doesNotMatch(
    source,
    /assessHsppExternalIntelligenceEvidence/
  );

  assert.doesNotMatch(
    source,
    /applyHsppAssessmentDecision/
  );
});
