import test from "node:test";
import assert from "node:assert/strict";

import {
  detectRapidAccelerationCandidate,
} from "../lib/fleet/detectRapidAccelerationCandidate.ts";

const productionThresholds = {
  minimumSpeedIncreaseKmh: 20,
  minimumIntervalSeconds: 2,
  maximumIntervalSeconds: 15,
  minimumAccelerationMps2: 3,
};

function candidate(overrides = {}) {
  return detectRapidAccelerationCandidate({
    source: "hardware",
    previousSpeedKmh: 40,
    currentSpeedKmh: 65,
    intervalSeconds: 2,
    ...productionThresholds,
    ...overrides,
  });
}

test("accepts qualifying hardware telemetry", () => {
  assert.deepEqual(candidate(), {
    previousSpeedKmh: 40,
    currentSpeedKmh: 65,
    speedIncreaseKmh: 25,
    intervalSeconds: 2,
    accelerationMps2: 3.47,
  });
});

test("accepts qualifying mobile telemetry", () => {
  assert.deepEqual(
    candidate({
      source: "mobile",
    }),
    {
      previousSpeedKmh: 40,
      currentSpeedKmh: 65,
      speedIncreaseKmh: 25,
      intervalSeconds: 2,
      accelerationMps2: 3.47,
    }
  );
});

test("rejects manual telemetry", () => {
  assert.equal(
    candidate({
      source: "manual",
    }),
    null
  );
});

test("rejects non-finite previous speed", () => {
  for (const previousSpeedKmh of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    assert.equal(
      candidate({
        previousSpeedKmh,
      }),
      null
    );
  }
});

test("rejects non-finite current speed", () => {
  for (const currentSpeedKmh of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    assert.equal(
      candidate({
        currentSpeedKmh,
      }),
      null
    );
  }
});

test("rejects negative previous speed", () => {
  assert.equal(
    candidate({
      previousSpeedKmh: -1,
    }),
    null
  );
});

test("rejects negative current speed", () => {
  assert.equal(
    candidate({
      currentSpeedKmh: -1,
    }),
    null
  );
});

test("rejects interval below minimum boundary", () => {
  assert.equal(
    candidate({
      intervalSeconds: 1.9999,
    }),
    null
  );
});

test("accepts exact minimum interval boundary when other gates pass", () => {
  assert.notEqual(
    candidate({
      intervalSeconds: 2,
    }),
    null
  );
});

test("accepts exact maximum interval boundary when other gates pass", () => {
  const result = candidate({
    previousSpeedKmh: 0,
    currentSpeedKmh: 162,
    intervalSeconds: 15,
  });

  assert.notEqual(result, null);
  assert.equal(result.intervalSeconds, 15);
  assert.equal(result.accelerationMps2, 3);
});

test("rejects interval above maximum boundary", () => {
  assert.equal(
    candidate({
      previousSpeedKmh: 0,
      currentSpeedKmh: 163,
      intervalSeconds: 15.0001,
    }),
    null
  );
});

test("rejects speed increase below minimum threshold", () => {
  assert.equal(
    candidate({
      previousSpeedKmh: 40,
      currentSpeedKmh: 59.9999,
      intervalSeconds: 1,
      minimumIntervalSeconds: 1,
    }),
    null
  );
});

test("exact speed-increase threshold still obeys acceleration gate", () => {
  assert.equal(
    candidate({
      previousSpeedKmh: 40,
      currentSpeedKmh: 60,
      intervalSeconds: 2,
    }),
    null
  );
});

test("rejects acceleration below minimum threshold", () => {
  assert.equal(
    candidate({
      previousSpeedKmh: 40,
      currentSpeedKmh: 61.59,
      intervalSeconds: 2,
    }),
    null
  );
});

test("accepts exact acceleration threshold", () => {
  assert.deepEqual(
    candidate({
      previousSpeedKmh: 40,
      currentSpeedKmh: 61.6,
      intervalSeconds: 2,
    }),
    {
      previousSpeedKmh: 40,
      currentSpeedKmh: 61.6,
      speedIncreaseKmh: 21.6,
      intervalSeconds: 2,
      accelerationMps2: 3,
    }
  );
});

test("preserves existing output rounding contract", () => {
  assert.deepEqual(
    candidate({
      previousSpeedKmh: 40.05,
      currentSpeedKmh: 65.06,
      intervalSeconds: 2.05,
    }),
    {
      previousSpeedKmh: 40.1,
      currentSpeedKmh: 65.1,
      speedIncreaseKmh: 25,
      intervalSeconds: 2.1,
      accelerationMps2: 3.39,
    }
  );
});