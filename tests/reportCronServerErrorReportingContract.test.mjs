import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath = path.resolve(
  "app/api/reports/cron/route.ts"
);

const route = fs.readFileSync(
  routePath,
  "utf8"
);

test(
  "report cron imports the centralized server error reporter",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "report cron reports unexpected top-level failures before returning 500",
  () => {
    assert.match(
      route,
      /catch\s*\(\s*err:\s*any\s*\)\s*\{[\s\S]*?reportServerError\s*\(\s*err\s*,\s*\{[\s\S]*?domain:\s*["']reports["'][\s\S]*?operation:\s*["']scheduled-report-cron["'][\s\S]*?boundary:\s*["']top-level["'][\s\S]*?\}\s*\)[\s\S]*?return\s+NextResponse\.json/
    );
  }
);

test(
  "report cron preserves the existing 500 response contract",
  () => {
    assert.match(
      route,
      /\{\s*error:\s*err\.message\s*\|\|\s*["']Cron report failed\.["']\s*\}[\s\S]*?\{\s*status:\s*500\s*\}/
    );
  }
);

test(
  "report cron has exactly one centralized server error reporting call",
  () => {
    const calls =
      route.match(/reportServerError\s*\(/g) ?? [];

    assert.equal(calls.length, 1);
  }
);
