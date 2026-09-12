import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routes = [
  {
    name: "HERE",
    path: "../app/api/route-safety/cron/providers/here/route.ts",
    operation: "here-cron",
    consoleLabel: "[route-safety HERE cron]",
  },
  {
    name: "TomTom",
    path: "../app/api/route-safety/cron/providers/tomtom/route.ts",
    operation: "tomtom-cron",
    consoleLabel: "[route-safety TomTom cron]",
  },
  {
    name: "Azure Maps",
    path: "../app/api/route-safety/cron/providers/azure-maps/route.ts",
    operation: "azure-maps-cron",
    consoleLabel: "[route-safety Azure Maps cron]",
  },
  {
    name: "reconciliation",
    path: "../app/api/route-safety/cron/providers/reconcile/route.ts",
    operation: "reconciliation-cron",
    consoleLabel: "[route-safety reconciliation cron]",
  },
  {
    name: "combined provider",
    path: "../app/api/route-safety/cron/providers/route.ts",
    operation: "provider-cron",
    consoleLabel: "[route-safety provider cron]",
  },
];

for (const routeSpec of routes) {
  const source = fs.readFileSync(
    new URL(routeSpec.path, import.meta.url),
    "utf8"
  );

  test(
    `${routeSpec.name} cron imports shared server reporter`,
    () => {
      assert.match(
        source,
        /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
      );
    }
  );

  test(
    `${routeSpec.name} terminal failure reports outer request boundary`,
    () => {
      assert.match(
        source,
        /catch\s*\(\s*error:\s*unknown\s*\)[\s\S]*?console\.error[\s\S]*?reportServerError\s*\(\s*error/
      );

      assert.match(
        source,
        /domain:\s*["']route-safety["']/
      );

      assert.match(
        source,
        new RegExp(
          `operation:\\s*["']${routeSpec.operation}["']`
        )
      );

      assert.match(
        source,
        /boundary:\s*["']outer-request["']/
      );
    }
  );

  test(
    `${routeSpec.name} cron preserves console diagnostics`,
    () => {
      assert.match(
        source,
        new RegExp(
          `console\\.error\\s*\\(\\s*["']${routeSpec.consoleLabel
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
        )
      );
    }
  );

  test(
    `${routeSpec.name} cron contains exactly one server reporter call`,
    () => {
      const calls =
        source.match(
          /reportServerError\s*\(/g
        ) ?? [];

      assert.equal(
        calls.length,
        1
      );
    }
  );
}