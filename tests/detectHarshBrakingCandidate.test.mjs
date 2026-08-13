import assert from "node:assert/strict";
import test from "node:test";

import {
  detectHarshBrakingCandidate,
} from "../lib/fleet/detectHarshBrakingCandidate.ts";

function baseInput(overrides = {}) {
  return {
    source: "hardware",
    previousSpeedKmh: 60,
    currentSpeedKmh: 30,
    intervalSeconds: 2.5,
    minimumPreviousSpeedKmh: 30,
    minimumSpeedDropKmh: 20,
    minimumIntervalSeconds: 2,
    maximumIntervalSeconds: 15,
    minimumDecelerationMps2: 3,
    ...overrides,
  };
}

test("returns a rounded candidate for valid harsh braking", () => {
  const result = detectHarshBrakingCandidate(
    baseInput()
  );

  assert.deepEqual(result, {
    previousSpeedKmh: 60,
    currentSpeedKmh: 30,
    speedDropKmh: 30,
    intervalSeconds: 2.5,
    decelerationMps2: 3.33,
  });
});

test("rejects manual telemetry", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      source: "manual",
    })
  );

  assert.equal(result, null);
});

test("rejects previous speed below the configured minimum", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 29.9,
      currentSpeedKmh: 0,
      intervalSeconds: 2,
    })
  );

  assert.equal(result, null);
});

test("accepts previous speed exactly at the configured minimum when all other rules pass", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 30,
      currentSpeedKmh: 0,
      intervalSeconds: 2,
    })
  );

  assert.ok(result);
  assert.equal(result.previousSpeedKmh, 30);
});

test("rejects speed drop below the configured minimum", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 60,
      currentSpeedKmh: 40.1,
      intervalSeconds: 1.5,
      minimumIntervalSeconds: 1,
    })
  );

  assert.equal(result, null);
});

test("exact minimum speed drop still requires the deceleration threshold", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 50,
      currentSpeedKmh: 30,
      intervalSeconds: 2,
    })
  );

  assert.equal(result, null);
});

test("rejects interval below the configured minimum", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      intervalSeconds: 1.99,
    })
  );

  assert.equal(result, null);
});

test("accepts the minimum interval boundary when all other rules pass", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      intervalSeconds: 2,
    })
  );

  assert.ok(result);
  assert.equal(result.intervalSeconds, 2);
});

test("rejects interval above the configured maximum", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 180,
      currentSpeedKmh: 0,
      intervalSeconds: 15.01,
    })
  );

  assert.equal(result, null);
});

test("accepts the maximum interval boundary when deceleration also passes", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 180,
      currentSpeedKmh: 0,
      intervalSeconds: 15,
    })
  );

  assert.ok(result);
  assert.equal(result.intervalSeconds, 15);
});

test("accepts exact runtime equality at the minimum deceleration threshold", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 51.6,
      currentSpeedKmh: 30,
      intervalSeconds: 2,
    })
  );

  assert.ok(result);
  assert.equal(result.speedDropKmh, 21.6);
  assert.equal(result.decelerationMps2, 3);
});

test("rejects deceleration below the configured minimum", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 51.5,
      currentSpeedKmh: 30,
      intervalSeconds: 2,
    })
  );

  assert.equal(result, null);
});

test("rejects non-finite previous speed", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: Number.NaN,
    })
  );

  assert.equal(result, null);
});

test("rejects non-finite current speed", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      currentSpeedKmh: Number.POSITIVE_INFINITY,
    })
  );

  assert.equal(result, null);
});

test("rejects negative current speed", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      currentSpeedKmh: -1,
    })
  );

  assert.equal(result, null);
});

test("preserves output rounding rules", () => {
  const result = detectHarshBrakingCandidate(
    baseInput({
      previousSpeedKmh: 63.26,
      currentSpeedKmh: 31.14,
      intervalSeconds: 2.37,
    })
  );

  assert.deepEqual(result, {
    previousSpeedKmh: 63.3,
    currentSpeedKmh: 31.1,
    speedDropKmh: 32.1,
    intervalSeconds: 2.4,
    decelerationMps2: 3.76,
  });
});
