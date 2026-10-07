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

test(
  "traffic flow collection is scheduled every 30 minutes",
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
      1,
      "traffic-flow cron must appear exactly once",
    );

    assert.equal(
      matches[0].schedule,
      "*/30 * * * *",
    );
  },
);

test(
  "30 minute baseline remains below the 100 request daily HERE traffic budget",
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