import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "lib/route-safety/providers/importTomTomIncidents.ts";

const source =
  fs.readFileSync(path, "utf8");

const stages = [
  "source-config",
  "fetch",
  "response-json",
  "persist-observation",
  "persist-hspp-evidence",
  "snapshot-persistence",
  "road-context",
  "insert-alerts",
  "apply-hspp-assessment",
  "total",
];

test(
  "TomTom exposes all required sub-stage timings",
  () => {
    for (const stage of stages) {
      assert.match(
        source,
        new RegExp(
          `logTomTomTiming\\(\\s*"${stage}"`
        ),
        `Missing TomTom timing stage: ${stage}`
      );
    }
  }
);

test(
  "TomTom timing helper remains low sensitivity",
  () => {
    const helper =
      source.match(
        /const logTomTomTiming[\s\S]*?};/
      );

    assert.ok(helper);

    assert.match(
      helper[0],
      /stage,\s*durationMs:/
    );

    assert.doesNotMatch(
      helper[0],
      /organizationId|token|secret|authorization|payload|response|apiKey/i
    );
  }
);

test(
  "TomTom fetch remains bounded to ten seconds",
  () => {
    assert.match(
      source,
      /signal\s*:\s*AbortSignal\.timeout\s*\(\s*10_000\s*\)/
    );
  }
);

test(
  "TomTom sub-stage instrumentation does not introduce concurrency",
  () => {
    assert.doesNotMatch(
      source,
      /Promise\.all/
    );

    assert.doesNotMatch(
      source,
      /Promise\.allSettled/
    );
  }
);