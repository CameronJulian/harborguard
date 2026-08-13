import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBehaviorTrafficCalmingContext,
} from "../lib/fleet/resolveBehaviorTrafficCalmingContext.ts";

const point = {
  latitude: -33.9249,
  longitude: 18.4241,
};

function candidate() {
  return { detected: true };
}

test("does not resolve context when no harsh-driving candidate exists", async () => {
  let calls = 0;

  const result =
    await resolveBehaviorTrafficCalmingContext({
      ...point,
      harshBrakingCandidate: null,
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async () => {
        calls += 1;
        return null;
      },
    });

  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("resolves once for harsh braking", async () => {
  let calls = 0;

  const expected = {
    featureType: "speed_bump",
    provider: "city_of_cape_town",
    providerFeatureId: "7:123",
    latitude: point.latitude,
    longitude: point.longitude,
    distanceMeters: 12,
  };

  const result =
    await resolveBehaviorTrafficCalmingContext({
      ...point,
      harshBrakingCandidate: candidate(),
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async (input) => {
        calls += 1;
        assert.deepEqual(input, point);
        return expected;
      },
    });

  assert.equal(calls, 1);
  assert.deepEqual(result, expected);
});

test("resolves once when multiple harsh-driving candidates exist", async () => {
  let calls = 0;

  await resolveBehaviorTrafficCalmingContext({
    ...point,
    harshBrakingCandidate: candidate(),
    rapidAccelerationCandidate: candidate(),
    harshCorneringCandidate: candidate(),
    resolveContext: async () => {
      calls += 1;
      return null;
    },
  });

  assert.equal(calls, 1);
});

test("rapid acceleration alone qualifies for context resolution", async () => {
  let calls = 0;

  await resolveBehaviorTrafficCalmingContext({
    ...point,
    harshBrakingCandidate: null,
    rapidAccelerationCandidate: candidate(),
    harshCorneringCandidate: null,
    resolveContext: async () => {
      calls += 1;
      return null;
    },
  });

  assert.equal(calls, 1);
});

test("harsh cornering alone qualifies for context resolution", async () => {
  let calls = 0;

  await resolveBehaviorTrafficCalmingContext({
    ...point,
    harshBrakingCandidate: null,
    rapidAccelerationCandidate: null,
    harshCorneringCandidate: candidate(),
    resolveContext: async () => {
      calls += 1;
      return null;
    },
  });

  assert.equal(calls, 1);
});

test("external resolver failure fails open", async () => {
  const result =
    await resolveBehaviorTrafficCalmingContext({
      ...point,
      harshBrakingCandidate: candidate(),
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async () => {
        throw new Error("provider unavailable");
      },
    });

  assert.equal(result, null);
});
