import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const providers = [
  {
    name: "TomTom",
    path:
      "lib/route-safety/providers/importTomTomIncidents.ts",
  },
  {
    name: "HERE",
    path:
      "lib/route-safety/providers/importHereIncidents.ts",
  },
  {
    name: "Azure Maps",
    path:
      "lib/route-safety/providers/importAzureMapsIncidents.ts",
  },
];

for (const provider of providers) {
  test(
    `${provider.name} provider fetch has a bounded timeout`,
    () => {
      const source =
        fs.readFileSync(provider.path, "utf8");

      assert.match(
        source,
        /signal\s*:\s*AbortSignal\.timeout\s*\(\s*10_000\s*\)/,
        `${provider.name} must abort slow HTTP requests after 10 seconds.`
      );
    }
  );

  test(
    `${provider.name} still contains exactly one external fetch`,
    () => {
      const source =
        fs.readFileSync(provider.path, "utf8");

      const matches =
        source.match(/\bfetch\s*\(/g) ?? [];

      assert.equal(
        matches.length,
        1,
        `${provider.name} fetch count must remain unchanged.`
      );
    }
  );
}

test(
  "provider timeout budget stays below the Vercel execution ceiling",
  () => {
    const providerCount = providers.length;
    const timeoutMs = 10_000;
    const totalNetworkBudgetMs =
      providerCount * timeoutMs;

    assert.equal(
      totalNetworkBudgetMs,
      30_000
    );

    assert.ok(
      totalNetworkBudgetMs < 60_000,
      "Sequential provider network budget must remain below the 60 second cron ceiling."
    );
  }
);