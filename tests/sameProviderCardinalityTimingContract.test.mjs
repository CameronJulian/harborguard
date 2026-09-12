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

test("same-provider cardinality tracks unique persisted targets", () => {
  assert.match(
    source,
    /sameProviderTargetIds\.add/
  );

  assert.match(
    source,
    /"same-provider-unique-targets"[\s\S]*?sameProviderTargetIds\.size/
  );

  assert.match(
    source,
    /"same-provider-repeat-updates"[\s\S]*?sameProviderUpdateCount\s*-\s*sameProviderTargetIds\.size/
  );
});

test("same-provider update count comes from batch result cardinality", () => {
  assert.match(
    source,
    /sameProviderUpdateCount\s*=\s*sameProviderResults\.length/
  );
});

test("same-provider timing measures one batch RPC wall duration", () => {
  assert.match(
    source,
    /sameProviderBatchStartedAt\s*=\s*Date\.now\(\)[\s\S]*?await\s+refreshRouteSafetySameProviderBatch[\s\S]*?sameProviderUpdateMs\s*=[\s\S]*?Date\.now\(\)\s*-\s*sameProviderBatchStartedAt/
  );
});

test("same-provider cardinality remains aggregate only", () => {
  const uniqueMarker =
    source.indexOf(
      '"same-provider-unique-targets"'
    );

  assert.ok(uniqueMarker >= 0);

  const window =
    source.slice(
      uniqueMarker,
      uniqueMarker + 900
    );

  assert.doesNotMatch(
    window,
    /Array\.from\(sameProviderTargetIds\)|console\.(?:log|info|warn|error)[\s\S]*?sameProviderTargetIds/
  );
});

test("same-provider cardinality stages remain on both return paths", () => {
  const uniqueMatches =
    source.match(
      /"same-provider-unique-targets"/g
    ) ?? [];

  const repeatMatches =
    source.match(
      /"same-provider-repeat-updates"/g
    ) ?? [];

  assert.equal(uniqueMatches.length, 2);
  assert.equal(repeatMatches.length, 2);
});
