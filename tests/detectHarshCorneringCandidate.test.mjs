import assert from "node:assert/strict";
import test from "node:test";

import {
  detectHarshCorneringCandidate,
} from "../lib/fleet/detectHarshCorneringCandidate.ts";

const defaults = {
  source: "hardware",
  previousHeading: 10,
  currentHeading: 70,
  normalizedHeadingDeltaDegrees: 60,
  speedKmh: 50,
  intervalSeconds: 5,
  minimumSpeedKmh: 30,
  minimumHeadingChangeDegrees: 45,
  minimumIntervalSeconds: 2,
  maximumIntervalSeconds: 15,
};

function detect(overrides = {}) {
  return detectHarshCorneringCandidate({
    ...defaults,
    ...overrides,
  });
}

test("accepts qualifying hardware telemetry", () => {
  assert.deepEqual(detect(), {
    previousHeading: 10,
    currentHeading: 70,
    headingChangeDegrees: 60,
    speedKmh: 50,
    intervalSeconds: 5,
  });
});

test("accepts qualifying mobile telemetry", () => {
  assert.notEqual(
    detect({
      source: "mobile",
    }),
    null
  );
});

test("rejects manual telemetry", () => {
  assert.equal(
    detect({
      source: "manual",
    }),
    null
  );
});

test("rejects null normalized heading delta", () => {
  assert.equal(
    detect({
      normalizedHeadingDeltaDegrees: null,
    }),
    null
  );
});

test("rejects non-finite normalized heading delta", () => {
  assert.equal(
    detect({
      normalizedHeadingDeltaDegrees: Number.NaN,
    }),
    null
  );
});

test("rejects non-finite previous heading", () => {
  assert.equal(
    detect({
      previousHeading: Number.NaN,
    }),
    null
  );
});

test("rejects non-finite current heading", () => {
  assert.equal(
    detect({
      currentHeading: Number.POSITIVE_INFINITY,
    }),
    null
  );
});

test("rejects non-finite speed", () => {
  assert.equal(
    detect({
      speedKmh: Number.NaN,
    }),
    null
  );
});

test("rejects speed below minimum", () => {
  assert.equal(
    detect({
      speedKmh: 29.999,
    }),
    null
  );
});

test("accepts exact minimum speed boundary", () => {
  assert.notEqual(
    detect({
      speedKmh: 30,
    }),
    null
  );
});

test("rejects interval below minimum boundary", () => {
  assert.equal(
    detect({
      intervalSeconds: 1.999,
    }),
    null
  );
});

test("accepts exact minimum interval boundary", () => {
  assert.notEqual(
    detect({
      intervalSeconds: 2,
    }),
    null
  );
});

test("accepts exact maximum interval boundary", () => {
  assert.notEqual(
    detect({
      intervalSeconds: 15,
    }),
    null
  );
});

test("rejects interval above maximum boundary", () => {
  assert.equal(
    detect({
      intervalSeconds: 15.001,
    }),
    null
  );
});

test("rejects heading change below minimum threshold", () => {
  assert.equal(
    detect({
      normalizedHeadingDeltaDegrees: 44.999,
    }),
    null
  );
});

test("accepts exact heading-change threshold", () => {
  assert.notEqual(
    detect({
      normalizedHeadingDeltaDegrees: 45,
    }),
    null
  );
});

test("preserves current output rounding contract", () => {
  assert.deepEqual(
    detect({
      previousHeading: 10.04,
      currentHeading: 70.06,
      normalizedHeadingDeltaDegrees: 60.04,
      speedKmh: 50.06,
      intervalSeconds: 5.06,
    }),
    {
      previousHeading: 10,
      currentHeading: 70.1,
      headingChangeDegrees: 60,
      speedKmh: 50.1,
      intervalSeconds: 5.1,
    }
  );
});
