import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath = path.resolve(
  "app/api/hspp/cron/post-positive-lifecycle/route.ts"
);

const route = fs.readFileSync(
  routePath,
  "utf8"
);

test(
  "post-positive lifecycle cron imports the centralized server error reporter",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "post-positive lifecycle cron reports unexpected top-level failures",
  () => {
    assert.match(
      route,
      /catch\s*\(\s*error:\s*unknown\s*\)\s*\{[\s\S]*?reportServerError\s*\(\s*error\s*,\s*\{[\s\S]*?domain:\s*["']hspp["'][\s\S]*?operation:\s*["']post-positive-lifecycle-cron["'][\s\S]*?boundary:\s*["']top-level["'][\s\S]*?\}\s*\)/
    );
  }
);

test(
  "post-positive lifecycle cron preserves its existing console error signal",
  () => {
    assert.match(
      route,
      /console\.error\s*\(\s*["']\[hspp post-positive lifecycle cron\]["']\s*,\s*error\s*,?\s*\)/
    );
  }
);

test(
  "post-positive lifecycle cron preserves its 500 response boundary",
  () => {
    assert.match(
      route,
      /catch\s*\(\s*error:\s*unknown\s*\)[\s\S]*?return\s+NextResponse\.json\([\s\S]*?errorMessage\s*\(\s*error\s*,?\s*\)[\s\S]*?status:\s*500/
    );
  }
);

test(
  "post-positive lifecycle cron has exactly one centralized reporting call",
  () => {
    const calls =
      route.match(/reportServerError\s*\(/g) ?? [];

    assert.equal(calls.length, 1);
  }
);
