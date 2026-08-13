import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateOperationalRoadRisk,
} from "../lib/routing/roadRiskRecency.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-13T10:00:00Z");

test("clamps negative raw risk to zero", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      -20,
      "2026-08-13T10:00:00Z",
      NOW
    ),
    0
  );
});

test("clamps raw risk above 100", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      200,
      "2026-08-13T10:00:00Z",
      NOW
    ),
    100
  );
});

test("applies fresh <=7 day multiplier", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      40,
      new Date(NOW - 7 * DAY).toISOString(),
      NOW
    ),
    50
  );
});

test("applies <=30 day multiplier", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      50,
      new Date(NOW - 30 * DAY).toISOString(),
      NOW
    ),
    55
  );
});

test("applies <=90 day neutral multiplier", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      50,
      new Date(NOW - 90 * DAY).toISOString(),
      NOW
    ),
    50
  );
});

test("applies <=180 day decay", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      80,
      new Date(NOW - 180 * DAY).toISOString(),
      NOW
    ),
    68
  );
});

test("applies >180 day decay", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      80,
      new Date(NOW - 181 * DAY).toISOString(),
      NOW
    ),
    56
  );
});

test("invalid last_event_at uses neutral weight", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      73,
      "invalid-date",
      NOW
    ),
    73
  );
});

test("rounds operational risk", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      33,
      new Date(NOW - 30 * DAY).toISOString(),
      NOW
    ),
    36
  );
});

test("fresh weighting remains clamped to 100", () => {
  assert.equal(
    calculateOperationalRoadRisk(
      90,
      new Date(NOW - DAY).toISOString(),
      NOW
    ),
    100
  );
});