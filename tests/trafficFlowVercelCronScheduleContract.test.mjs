import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const config =
  JSON.parse(
    fs.readFileSync(
      "vercel.json",
      "utf8"
    )
  );

const routeSource =
  fs.readFileSync(
    "app/api/traffic-flow/cron/route.ts",
    "utf8"
  );

test(
  "traffic flow collection is not scheduled by Vercel on Hobby",
  () => {
    assert.ok(
      Array.isArray(config.crons),
      "vercel.json must contain a crons array",
    );

    const matches =
      config.crons.filter(
        (entry) =>
          entry?.path ===
          "/api/traffic-flow/cron"
      );

    assert.equal(
      matches.length,
      0,
      "traffic-flow collection must be scheduled externally while HarborGuard uses Vercel Hobby",
    );
  },
);

test(
  "traffic flow cron route remains externally schedulable",
  () => {
    assert.match(
      routeSource,
      /export async function GET\s*\(/,
      "traffic-flow cron route must expose GET",
    );

    assert.match(
      routeSource,
      /process\.env\.CRON_SECRET/,
      "traffic-flow cron route must require CRON_SECRET",
    );

    assert.match(
      routeSource,
      /request\.headers\.get\(["']authorization["']\)/,
      "traffic-flow cron route must read the Authorization header",
    );

    assert.match(
      routeSource,
      /Bearer \$\{cronSecret\}/,
      "traffic-flow cron route must require Bearer CRON_SECRET authentication",
    );
  },
);

test(
  "30 minute external baseline remains below the 100 request daily HERE traffic budget",
  () => {
    const runsPerDay =
      (24 * 60) / 30;

    const defaultDailyBudget =
      100;

    assert.equal(
      runsPerDay,
      48,
    );

    assert.ok(
      runsPerDay <
        defaultDailyBudget,
    );

    assert.ok(
      defaultDailyBudget -
        runsPerDay >=
        50,
      "baseline schedule should retain substantial provider-budget headroom",
    );
  },
);