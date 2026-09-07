import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/executeVehicleLocationArchivePrune.ts",
      import.meta.url
    ),
    "utf8"
  );


test(
  "archive prune executor is server-only and accepts an explicit Supabase client",
  () => {
    assert.match(
      source,
      /import "server-only";/
    );

    assert.match(
      source,
      /supabase:\s*SupabaseClient/
    );

    assert.doesNotMatch(
      source,
      /supabaseAdmin/
    );
  }
);


test(
  "archive prune executor checks durable prune state before live eligibility",
  () => {
    const durableRead =
      source.indexOf(
        '.select(\n        "id,pruned_at"'
      );

    const eligibility =
      source.indexOf(
        "assessVehicleLocationArchivePruningEligibility({"
      );

    assert.ok(
      durableRead >= 0
    );

    assert.ok(
      eligibility >= 0
    );

    assert.ok(
      durableRead <
        eligibility
    );
  }
);


test(
  "already-pruned manifests reach the database exact retry path",
  () => {
    assert.match(
      source,
      /durableRow\.pruned_at !== null/
    );

    assert.match(
      source,
      /durableRetry:\s*true/
    );

    assert.match(
      source,
      /invokePruneRpc\(\{/
    );
  }
);


test(
  "unpruned manifests must pass established pruning eligibility",
  () => {
    assert.match(
      source,
      /assessVehicleLocationArchivePruningEligibility/
    );

    assert.match(
      source,
      /if \(!eligibility\.eligible\)/
    );

    assert.match(
      source,
      /reason:\s*eligibility\.reason/
    );
  }
);


test(
  "initial prune validates deleted count against independently verified row count",
  () => {
    assert.match(
      source,
      /result\.deletedRowCount !==\s*eligibility\.rowCount/
    );
  }
);


test(
  "RPC response requires exactly one row and the requested manifest identity",
  () => {
    assert.match(
      source,
      /data\.length !== 1/
    );

    assert.match(
      source,
      /row\.manifest_id !== manifestId/
    );

    assert.match(
      source,
      /Number\.isSafeInteger/
    );
  }
);


test(
  "executor contains no cron retention or automatic caller",
  () => {
    assert.doesNotMatch(
      source,
      /cron\.schedule|scheduleJob|setInterval/
    );

    assert.doesNotMatch(
      source,
      /retentionDays|retentionHours/
    );

    assert.doesNotMatch(
      source,
      /app\/api/
    );
  }
);