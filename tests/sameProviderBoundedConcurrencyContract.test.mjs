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
  "same-provider updates use an explicit concurrency ceiling of four",
  () => {
    assert.match(
      source,
      /SAME_PROVIDER_UPDATE_CONCURRENCY\s*=\s*4/
    );
  }
);

test(
  "same-provider work is grouped by persisted target id",
  () => {
    assert.match(
      source,
      /sameProviderMatch\.id/
    );

    assert.match(
      source,
      /sameProvider.*(?:Group|Queue|Chain|Target)/i
    );
  }
);

test(
  "same target updates remain serialized",
  () => {
    assert.match(
      source,
      /sameProvider.*(?:Chain|Queue)/i
    );

    assert.match(
      source,
      /await[\s\S]*sameProvider/i
    );
  }
);

test(
  "bounded concurrency does not use unbounded Promise all over input rows",
  () => {
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
  "same-provider failure stops scheduling new work",
  () => {
    assert.match(
      source,
      /sameProvider.*(?:Error|Failure|Failed)/i
    );
  }
);

test(
  "same-provider resolution ordering remains based on inputIndex",
  () => {
    assert.match(
      source,
      /inputIndex/
    );

    assert.match(
      source,
      /(?:sort|resolutionSlots|resolutionsByInput)/i
    );
  }
);

test(
  "cross-provider update remains awaited sequentially",
  () => {
    assert.match(
      source,
      /const \{ error: mergeError \} = await supabase/
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

    assert.equal(
      matches.length,
      1
    );
  }
);

test(
  "bounded concurrency does not expose provider identifiers in timing logs",
  () => {
    const timingMatch =
      source.match(
        /console\.info\(\s*"\[Provider alert persistence timing\]"\s*,\s*\{[\s\S]*?\}\s*\);/
      );

    assert.ok(
      timingMatch,
      "timing logger must exist"
    );

    assert.doesNotMatch(
      timingMatch[0],
      /organizationId|sameProviderMatch\.id|latitude|longitude|token|secret|authorization|apiKey/i
    );

    assert.match(
      timingMatch[0],
      /stage/
    );

    assert.match(
      timingMatch[0],
      /durationMs/
    );

    assert.match(
      timingMatch[0],
      /count/
    );
  }
);