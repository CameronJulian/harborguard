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

test("same-provider progress remains aggregate only", () => {
  assert.match(
    source,
    /\[Provider alert persistence progress\]/
  );

  assert.match(
    source,
    /stage:\s*"same-provider"/
  );

  assert.match(
    source,
    /processed:[\s\S]*?sameProviderUpdateCount/
  );

  assert.match(
    source,
    /uniqueTargets:[\s\S]*?sameProviderTargetIds\.size/
  );
});

test("same-provider progress is emitted after batch completion", () => {
  const batch =
    source.indexOf(
      "await refreshRouteSafetySameProviderBatch("
    );

  const progress =
    source.indexOf(
      '"[Provider alert persistence progress]"'
    );

  assert.ok(batch >= 0);
  assert.ok(progress > batch);
});

test("old every-25-update checkpoint is removed", () => {
  assert.doesNotMatch(
    source,
    /sameProviderUpdateCount\s*%\s*25/
  );
});

test("same-provider progress remains low sensitivity", () => {
  const marker =
    source.indexOf(
      '"[Provider alert persistence progress]"'
    );

  assert.ok(marker >= 0);

  const window =
    source.slice(
      marker,
      marker + 500
    );

  assert.doesNotMatch(
    window,
    /alertId|providerId|latitude|longitude|roadName/
  );
});
