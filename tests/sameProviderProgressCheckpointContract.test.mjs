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

test(
  "same-provider progress checkpoint is aggregate only",
  () => {
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
      /processed:\s*sameProviderUpdateCount/
    );

    assert.match(
      source,
      /uniqueTargets:\s*sameProviderTargetIds\.size/
    );
  }
);

test(
  "same-provider progress emits every 25 successful updates",
  () => {
    assert.match(
      source,
      /sameProviderUpdateCount\s*%\s*25\s*===\s*0/
    );
  }
);

test(
  "same-provider progress remains after refresh error guard",
  () => {
    const errorGuard =
      source.indexOf(
        "if (refreshError)"
      );

    const progress =
      source.indexOf(
        "[Provider alert persistence progress]"
      );

    assert.notEqual(
      errorGuard,
      -1
    );

    assert.notEqual(
      progress,
      -1
    );

    assert.ok(
      progress > errorGuard
    );
  }
);

test(
  "same-provider progress checkpoint does not expose identifiers",
  () => {
    const match =
      source.match(
        /console\.info\(\s*"\[Provider alert persistence progress\]"\s*,\s*\{[\s\S]*?\}\s*\);/
      );

    assert.ok(
      match,
      "progress console.info block must exist"
    );

    const region =
      match[0];

    assert.doesNotMatch(
      region,
      /organizationId|sameProviderMatch\.id|latitude|longitude|token|secret|authorization|key:/i
    );

    assert.match(
      region,
      /processed:\s*sameProviderUpdateCount/
    );

    assert.match(
      region,
      /uniqueTargets:\s*sameProviderTargetIds\.size/
    );
  }
);

test(
  "same-provider progress remains inside serialized target processing",
  () => {
    assert.match(
      source,
      /for\s*\(\s*const\s+sameProviderTask\s+of\s+sameProviderQueue\s*\)/
    );

    assert.match(
      source,
      /if\s*\(\s*refreshError\s*\)\s*\{[\s\S]*?throw\s+refreshError[\s\S]*?\[Provider alert persistence progress\]/
    );

    assert.doesNotMatch(
      source,
      /Promise\.all\s*\(\s*rows\.map/
    );

    assert.doesNotMatch(
      source,
      /Promise\.allSettled\s*\(\s*rows\.map/
    );
  }
);