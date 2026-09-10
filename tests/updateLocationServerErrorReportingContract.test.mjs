import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  new URL(
    "../app/api/fleet/update-location/route.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "update-location imports shared reporter",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "location persistence failure is reported",
  () => {
    assert.match(
      route,
      /result\.errorType\s*===\s*["']location_persistence["'][\s\S]*?reportServerError/
    );

    assert.match(
      route,
      /boundary:\s*["']location-persistence["']/
    );
  }
);

test(
  "vehicle not found remains an expected 404",
  () => {
    assert.match(
      route,
      /result\.errorType\s*===\s*["']vehicle_not_found["'][\s\S]*?\?\s*404/
    );
  }
);

test(
  "post-response quality callback reports unexpected rejection",
  () => {
    assert.match(
      route,
      /after\(async\s*\(\)\s*=>\s*\{\s*try\s*\{[\s\S]*?recordCrowdLocationQualityOutcome/
    );

    assert.match(
      route,
      /catch\s*\(\s*qualityError:\s*unknown\s*\)[\s\S]*?reportServerError\s*\(\s*qualityError/
    );

    assert.match(
      route,
      /boundary:\s*["']post-response-quality["']/
    );
  }
);

test(
  "expected auth failures remain 401 and 403",
  () => {
    assert.match(
      route,
      /message\s*===\s*["']Unauthorized["'][\s\S]*?\?\s*401/
    );

    assert.match(
      route,
      /message\s*===\s*["']Permission denied["'][\s\S]*?\?\s*403/
    );
  }
);

test(
  "outer failure reports only 500-classified exceptions",
  () => {
    assert.match(
      route,
      /if\s*\(\s*status\s*===\s*500\s*\)\s*\{[\s\S]*?reportServerError\s*\(\s*err/
    );

    assert.match(
      route,
      /boundary:\s*["']outer-request["']/
    );
  }
);

test(
  "route contains exactly three reporter calls",
  () => {
    const calls =
      route.match(
        /reportServerError\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      3
    );
  }
);

test(
  "successful telemetry outcomes remain intact",
  () => {
    assert.match(
      route,
      /result\.skipped\s*===\s*["']jitter["']/
    );

    assert.match(
      route,
      /result\.skipped\s*===\s*["']gps_spike["']/
    );

    assert.match(
      route,
      /Vehicle location updated successfully/
    );
  }
);