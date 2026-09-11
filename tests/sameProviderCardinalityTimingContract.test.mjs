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
  "same-provider cardinality tracks unique target ids internally",
  () => {
    assert.match(
      source,
      /const\s+sameProviderTargetIds\s*=\s*new Set<string>\(\)/
    );

    assert.match(
      source,
      /const\s+sameProviderTargetId\s*=\s*String\(\s*sameProviderMatch\.id\s*\)/
    );

    assert.match(
      source,
      /sameProviderTargetIds\.add\s*\(\s*sameProviderTargetId\s*\)/
    );
  }
);

test(
  "same-provider cardinality emits only aggregate counts",
  () => {
    assert.match(
      source,
      /"same-provider-unique-targets"[\s\S]*sameProviderTargetIds\.size/
    );

    assert.match(
      source,
      /"same-provider-repeat-updates"[\s\S]*sameProviderUpdateCount\s*-\s*sameProviderTargetIds\.size/
    );
  }
);

test(
  "cardinality instrumentation does not log target ids",
  () => {
    const loggerStart =
      source.indexOf(
        "const logPersistenceTiming"
      );

    assert.notEqual(
      loggerStart,
      -1
    );

    const loggerRegion =
      source.slice(
        loggerStart,
        loggerStart + 500
      );

    assert.doesNotMatch(
      loggerRegion,
      /sameProviderTargetIds|sameProviderMatch\.id|organizationId|latitude|longitude|token|secret|authorization/i
    );
  }
);

test(
  "same-provider database updates remain serialized within each target queue",
  () => {
    assert.match(
      source,
      /SAME_PROVIDER_UPDATE_CONCURRENCY\s*=\s*4/
    );

    assert.match(
      source,
      /for\s*\(\s*const\s+sameProviderTask\s+of\s+sameProviderQueue\s*\)/
    );

    assert.match(
      source,
      /const\s+\{\s*error:\s*refreshError\s*\}\s*=\s*[\s\S]*?await\s+supabase/
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

test(
  "cardinality measurement is emitted on both return paths",
  () => {
    const uniqueMatches =
      source.match(
        /"same-provider-unique-targets"/g
      ) || [];

    const repeatMatches =
      source.match(
        /"same-provider-repeat-updates"/g
      ) || [];

    assert.equal(
      uniqueMatches.length,
      2
    );

    assert.equal(
      repeatMatches.length,
      2
    );
  }
);