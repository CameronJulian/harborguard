import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runnerPath =
  "lib/route-safety/providers/runOrganizationProviderImport.ts";

const source =
  fs.readFileSync(runnerPath, "utf8");

test(
  "provider runner records all five stage timings and total timing",
  () => {
    const requiredStages = [
      "expire-alerts",
      "here",
      "tomtom",
      "azure-maps",
      "reconciliation",
      "total",
    ];

    for (const stage of requiredStages) {
      assert.match(
        source,
        new RegExp(
          `logStageTiming\\(\\s*"${stage}"`
        ),
        `Missing timing for ${stage}.`
      );
    }
  }
);

test(
  "provider stage timing logs only stage and duration",
  () => {
    assert.match(
      source,
      /\[Route Safety provider timing\]/
    );

    assert.match(
      source,
      /stage,\s*durationMs:/
    );
  }
);

test(
  "provider stage timing does not log sensitive identifiers",
  () => {
    const helperMatch =
      source.match(
        /const logStageTiming[\s\S]*?};/
      );

    assert.ok(
      helperMatch,
      "Timing helper must exist."
    );

    const helper =
      helperMatch[0];

    assert.doesNotMatch(
      helper,
      /organizationId|token|secret|key|authorization|payload|response|error/i
    );
  }
);

test(
  "provider runner preserves sequential execution",
  () => {
    assert.doesNotMatch(
      source,
      /Promise\.all/
    );

    assert.doesNotMatch(
      source,
      /Promise\.allSettled/
    );

    const awaits =
      source.match(/\bawait\b/g) ?? [];

    assert.equal(
      awaits.length,
      5,
      "Instrumentation must not change provider execution semantics."
    );
  }
);