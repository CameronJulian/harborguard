import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../lib/route-safety/upsertRouteSafetyAlerts.ts",
    import.meta.url
  ),
  "utf8"
);

test("same-provider persistence uses exactly one batch wrapper call", () => {
  const calls =
    source.match(
      /await\s+refreshRouteSafetySameProviderBatch\s*\(/g
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("old same-provider worker pool is removed", () => {
  for (const marker of [
    "SAME_PROVIDER_UPDATE_CONCURRENCY",
    "sameProviderNextQueueIndex",
    "sameProviderSchedulingStopped",
    "sameProviderFailure",
    "sameProviderQueueEntries",
    "runSameProviderQueue",
    "runSameProviderWorker",
    "sameProviderWorkerCount",
    "sameProviderWorkers",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(marker)
    );
  }
});

test("same-provider batch input preserves input ordering", () => {
  assert.match(
    source,
    /sameProviderTasks[\s\S]*?\.flat\(\)[\s\S]*?\.sort\([\s\S]*?inputIndex/
  );

  assert.match(
    source,
    /refreshes:[\s\S]*?sameProviderTasks\.map/
  );
});

test("same-provider resolutions remain canonical", () => {
  assert.match(
    source,
    /outcome:\s*"refreshed_existing"/
  );

  assert.match(
    source,
    /inputIndex:\s*sameProviderResult\.inputIndex/
  );

  assert.match(
    source,
    /alertId:\s*sameProviderResult\.alertId/
  );
});

test("cross-provider persistence remains directly awaited", () => {
  assert.match(
    source,
    /const \{ error: mergeError \} = await supabase/
  );
});

test("new alerts remain one bulk insert path", () => {
  assert.match(
    source,
    /\.insert\(rowsToInsert\)/
  );
});
