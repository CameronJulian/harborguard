import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/tomtom/tomTomCostGuard.ts",
    "utf8",
  );

test(
  "TomTom cost guard exposes routing budget",
  () => {
    assert.match(
      source,
      /"routing"/,
    );

    assert.match(
      source,
      /TOMTOM_ROUTING_DAILY_LIMIT/,
    );
  },
);

test(
  "TomTom routing budget has conservative default",
  () => {
    assert.match(
      source,
      /defaultDailyLimit:\s*100/,
    );
  },
);

test(
  "TomTom cost guard uses one-day fixed window",
  () => {
    assert.match(
      source,
      /Ratelimit\.fixedWindow\(\s*dailyLimit,\s*"1 d",?\s*\)/,
    );
  },
);

test(
  "TomTom cost guard fails closed without Redis",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!entry\s*\)/,
    );

    assert.match(
      source,
      /reason:\s*"redis-unavailable"/,
    );

    assert.match(
      source,
      /allowed:\s*false/,
    );
  },
);

test(
  "TomTom cost guard reports exhausted budget",
  () => {
    assert.match(
      source,
      /"budget-exhausted"/,
    );
  },
);

test(
  "TomTom cost guard fails closed on guard error",
  () => {
    assert.match(
      source,
      /reason:\s*"guard-error"/,
    );
  },
);

test(
  "TomTom cost guard contains no provider network request",
  () => {
    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /api\.tomtom\.com/i,
    );
  },
);
