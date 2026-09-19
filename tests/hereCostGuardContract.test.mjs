import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/here/hereCostGuard.ts",
    "utf8",
  );

test(
  "HERE cost guard defines every paid provider surface",
  () => {
    for (const surface of [
      "traffic-flow",
      "traffic-incidents",
      "destination-search",
      "routing",
      "speed-limit",
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${surface.replace(
            /[-/\\^$*+?.()|[\]{}]/g,
            "\\$&",
          )}"`,
        ),
      );
    }
  },
);

test(
  "HERE cost guard uses one-day fixed windows",
  () => {
    assert.match(
      source,
      /Ratelimit\.fixedWindow\(\s*dailyLimit,\s*"1 d",?\s*\)/,
    );
  },
);

test(
  "HERE cost guard has isolated prefixes by surface",
  () => {
    assert.match(
      source,
      /"harborguard"/,
    );

    assert.match(
      source,
      /"here-cost-guard"/,
    );

    assert.match(
      source,
      /surface/,
    );
  },
);

test(
  "HERE cost guard is fail closed without Redis",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!entry\s*\)/,
    );

    assert.match(
      source,
      /allowed:\s*false/,
    );

    assert.match(
      source,
      /reason:\s*"redis-unavailable"/,
    );
  },
);

test(
  "HERE cost guard reports exhausted budgets",
  () => {
    assert.match(
      source,
      /"budget-exhausted"/,
    );

    assert.match(
      source,
      /result\.success[\s\S]*\? "allowed"[\s\S]*: "budget-exhausted"/,
    );
  },
);

test(
  "HERE cost guard fails closed when the limiter errors",
  () => {
    assert.match(
      source,
      /catch\s*\(error\)/,
    );

    assert.match(
      source,
      /reason:\s*"guard-error"/,
    );
  },
);

test(
  "HERE cost guard exposes environment controlled daily limits",
  () => {
    for (const variable of [
      "HERE_TRAFFIC_FLOW_DAILY_LIMIT",
      "HERE_TRAFFIC_INCIDENTS_DAILY_LIMIT",
      "HERE_DESTINATION_SEARCH_DAILY_LIMIT",
      "HERE_ROUTING_DAILY_LIMIT",
      "HERE_SPEED_LIMIT_DAILY_LIMIT",
    ]) {
      assert.match(
        source,
        new RegExp(variable),
      );
    }
  },
);

test(
  "HERE cost guard does not contain network fetches",
  () => {
    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /hereapi\.com/i,
    );
  },
);
