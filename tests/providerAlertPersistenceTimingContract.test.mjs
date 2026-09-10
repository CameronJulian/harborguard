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
  "provider alert persistence exposes timing stages",
  () => {
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
  }
);

test(
  "provider alert persistence timing remains low sensitivity",
  () => {
    const marker =
      source.indexOf(
        '"[Provider alert persistence timing]"'
      );

    assert.notEqual(marker, -1);

    const region =
      source.slice(
        marker,
        marker + 260
      );

    assert.match(region, /\bstage\b/);
    assert.match(region, /\bdurationMs\b/);
    assert.match(region, /\bcount\b/);

    assert.doesNotMatch(
      region,
      /organizationId|latitude|longitude|title|providerLastSeen|secret|token|authorization|apiKey/i
    );
  }
);

test(
  "same-provider timing retains sequential update semantics",
  () => {
    assert.match(
      source,
      /sameProviderUpdateStartedAt[\s\S]*?await supabase[\s\S]*?sameProviderUpdateMs \+=/
    );

    assert.match(
      source,
      /sameProviderUpdateCount \+= 1/
    );
  }
);

test(
  "cross-provider timing retains sequential update semantics",
  () => {
    assert.match(
      source,
      /crossProviderUpdateStartedAt[\s\S]*?await supabase[\s\S]*?crossProviderUpdateMs \+=/
    );

    assert.match(
      source,
      /crossProviderUpdateCount \+= 1/
    );
  }
);

test(
  "new alerts remain one bulk insert",
  () => {
    const matches =
      source.match(
        /\.insert\s*\(\s*rowsToInsert\s*\)/g
      ) || [];

    assert.equal(matches.length, 1);
  }
);

test(
  "instrumentation introduces no concurrency",
  () => {
    assert.doesNotMatch(
      source,
      /Promise\.all\s*\(/
    );

    assert.doesNotMatch(
      source,
      /Promise\.allSettled\s*\(/
    );
  }
);