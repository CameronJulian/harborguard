import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  new URL(
    "../app/api/fleet/live/route.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "Fleet Live imports shared server reporter",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "Fleet Live reports only outer 500 failures",
  () => {
    assert.match(
      route,
      /if\s*\(\s*status\s*===\s*500\s*\)\s*\{[\s\S]*?reportServerError\s*\(\s*error/
    );

    assert.match(
      route,
      /boundary:\s*["']outer-request["']/
    );

    assert.match(
      route,
      /operation:\s*["']live["']/
    );
  }
);

test(
  "Fleet Live preserves Unauthorized as 401",
  () => {
    assert.match(
      route,
      /message\s*===\s*["']Unauthorized["']\s*\?\s*401\s*:\s*500/
    );
  }
);

test(
  "Fleet Live preserves rate limiting as 429",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!rate\.success\s*\)[\s\S]*?status:\s*429/
    );
  }
);

test(
  "Fleet Live preserves console diagnostics",
  () => {
    assert.match(
      route,
      /console\.error\(["']Fleet live error:["'],\s*error\)/
    );
  }
);

test(
  "Fleet Live contains exactly one server reporter call",
  () => {
    const calls =
      route.match(
        /reportServerError\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );
  }
);

test(
  "Fleet Live database failure throws remain intact",
  () => {
    assert.match(
      route,
      /throw\s+vehiclesError/
    );

    assert.match(
      route,
      /if\s*\(\s*locationsResult\.error\s*\)\s*throw\s+locationsResult\.error/
    );

    assert.match(
      route,
      /if\s*\(\s*stopsResult\.error\s*\)\s*throw\s+stopsResult\.error/
    );

    assert.match(
      route,
      /if\s*\(\s*alertsResult\.error\s*\)\s*throw\s+alertsResult\.error/
    );

    assert.match(
      route,
      /if\s*\(\s*tripsResult\.error\s*\)\s*throw\s+tripsResult\.error/
    );
  }
);