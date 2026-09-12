import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../lib/route-safety/upsertRouteSafetyAlerts.ts",
    import.meta.url
  ),
  "utf8"
);

test("provider alert persistence exposes timing stages", () => {
  assert.match(
    source,
    /\[Provider alert persistence timing\]/
  );

  for (const stage of [
    "existing-select",
    "same-provider-updates",
    "cross-provider-updates",
    "bulk-insert",
    "total",
  ]) {
    assert.match(
      source,
      new RegExp(`"${stage}"`)
    );
  }
});

test("provider alert persistence timing remains low sensitivity", () => {
  assert.match(
    source,
    /logPersistenceTiming/
  );

  assert.doesNotMatch(
    source,
    /\[Provider alert persistence timing\][\s\S]{0,250}(?:alertId|latitude|longitude|roadName)/
  );
});

test("same-provider timing measures the single batch wrapper call", () => {
  assert.match(
    source,
    /sameProviderBatchStartedAt\s*=\s*Date\.now\(\)[\s\S]*?await\s+refreshRouteSafetySameProviderBatch[\s\S]*?sameProviderUpdateMs\s*=[\s\S]*?Date\.now\(\)\s*-\s*sameProviderBatchStartedAt/
  );

  assert.match(
    source,
    /sameProviderUpdateCount\s*=\s*sameProviderResults\.length/
  );
});

test("cross-provider timing retains sequential update semantics", () => {
  assert.match(
    source,
    /crossProviderUpdateStartedAt[\s\S]*?await supabase[\s\S]*?crossProviderUpdateMs \+=/
  );

  assert.match(
    source,
    /crossProviderUpdateCount \+= 1/
  );
});

test("new alerts remain one bulk insert", () => {
  assert.match(
    source,
    /\.insert\(rowsToInsert\)/
  );
});
