import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGpsMovement,
} from "../lib/fleet/evaluateGpsMovement.ts";

test("classifies movement below the minimum distance as jitter", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 9,
    intervalSeconds: 5,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "jitter",
    calculatedSpeedKmh: 6.48,
  });
});

test("accepts movement exactly at the minimum distance when speed is valid", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 10,
    intervalSeconds: 5,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "accepted",
    calculatedSpeedKmh: 7.2,
  });
});

test("accepts normal movement inside the configured limits", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 100,
    intervalSeconds: 10,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "accepted",
    calculatedSpeedKmh: 36,
  });
});

test("classifies movement above the maximum allowed speed as a gps spike", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 1000,
    intervalSeconds: 10,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "gps_spike",
    calculatedSpeedKmh: 360,
  });
});

test("accepts movement when calculated speed equals the configured maximum", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 500,
    intervalSeconds: 15,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120.00000000000001,
  });

  assert.deepEqual(result, {
    outcome: "accepted",
    calculatedSpeedKmh: 120.00000000000001,
  });
});

test("uses calculated speed zero when interval is zero", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 100,
    intervalSeconds: 0,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "accepted",
    calculatedSpeedKmh: 0,
  });
});

test("uses calculated speed zero when interval is negative", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 100,
    intervalSeconds: -5,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.deepEqual(result, {
    outcome: "accepted",
    calculatedSpeedKmh: 0,
  });
});

test("still applies the jitter rule before speed classification", () => {
  const result = evaluateGpsMovement({
    distanceMeters: 5,
    intervalSeconds: 0.01,
    minimumDistanceMeters: 10,
    maximumAllowedSpeedKmh: 120,
  });

  assert.equal(result.outcome, "jitter");
  assert.equal(result.calculatedSpeedKmh, 1800);
});
