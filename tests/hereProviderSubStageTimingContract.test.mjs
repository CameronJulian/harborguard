import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "lib/route-safety/providers/importHereIncidents.ts";

const source =
  fs.readFileSync(path, "utf8");

const stages = [
  "source-config",
  "fetch",
  "response-json",
  "observation-evidence-persistence",
  "snapshot-persistence",
  "road-context",
  "insert-alerts",
  "apply-hspp-assessment",
  "total",
];

test(
  "HERE exposes all required sub-stage timings",
  () => {
    for (const stage of stages) {
      assert.match(
        source,
        new RegExp(
          `logHereTiming\\(\\s*"${stage}"`
        ),
        `Missing HERE timing stage: ${stage}`
      );
    }
  }
);

test(
  "HERE timing helper remains low sensitivity",
  () => {
    const helper =
      source.match(
        /const logHereTiming[\s\S]*?};/
      );

    assert.ok(helper);

    assert.match(
      helper[0],
      /stage,\s*durationMs:/
    );

    assert.doesNotMatch(
      helper[0],
      /organizationId|token|secret|authorization|payload|response|apiKey|providerMessageId|observedAt/i
    );
  }
);

test(
  "HERE fetch remains bounded to ten seconds",
  () => {
    assert.match(
      source,
      /signal\s*:\s*AbortSignal\.timeout\s*\(\s*10_000\s*\)/
    );
  }
);

test(
  "HERE timing instrumentation introduces no concurrency",
  () => {
    assert.doesNotMatch(
      source,
      /Promise\.all\s*\(/
    );

    assert.doesNotMatch(
      source,
      /Promise\.allSettled\s*\(/
    );
  }
);