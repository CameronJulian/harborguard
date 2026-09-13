import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath = path.resolve(
  "app/api/fleet/cron/route-risk-shadow-model-health/route.ts"
);

const route = fs.readFileSync(
  routePath,
  "utf8"
);

test(
  "shadow model-health cron imports centralized server error reporting",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "shadow model-health cron reports unexpected top-level failures",
  () => {
    assert.match(
      route,
      /catch\s*\(\s*error:\s*unknown\s*\)\s*\{[\s\S]*?reportServerError\s*\(\s*error\s*,\s*\{[\s\S]*?domain:\s*["']fleet["'][\s\S]*?operation:\s*["']route-risk-shadow-model-health-cron["'][\s\S]*?boundary:\s*["']top-level["'][\s\S]*?\}\s*\)/
    );
  }
);

test(
  "shadow model-health cron preserves existing console diagnostics",
  () => {
    assert.match(
      route,
      /console\.error\s*\(\s*["']\[route-risk shadow model-health cron\]["']\s*,\s*error\s*\)/
    );
  }
);

test(
  "shadow model-health cron preserves its 500 response boundary",
  () => {
    assert.match(
      route,
      /catch\s*\(\s*error:\s*unknown\s*\)[\s\S]*?return\s+NextResponse\.json\([\s\S]*?errorMessage\s*\(\s*error\s*\)[\s\S]*?status:\s*500/
    );
  }
);

test(
  "shadow model-health cron has exactly one centralized reporter call",
  () => {
    const calls =
      route.match(/reportServerError\s*\(/g) ?? [];

    assert.equal(calls.length, 1);
  }
);
