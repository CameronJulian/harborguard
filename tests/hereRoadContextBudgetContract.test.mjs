import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test(
  "HERE provider bounds optional road-context enrichment to one lookup",
  () => {
    assert.match(
      source,
      /enrichRouteSafetyAlertsWithRoadContext\s*\([\s\S]*?normalizedRows[\s\S]*?resolveRoadContext\s*,[\s\S]*?maxLookups\s*:\s*1[\s\S]*?\)/
    );
  }
);

test(
  "HERE road-context budget does not introduce concurrency",
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

test(
  "HERE keeps road-context timing instrumentation",
  () => {
    assert.match(
      source,
      /logHereTiming\s*\(\s*"road-context"/
    );
  }
);