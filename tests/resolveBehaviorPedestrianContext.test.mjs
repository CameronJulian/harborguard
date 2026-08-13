import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBehaviorPedestrianContext,
} from "../lib/fleet/resolveBehaviorPedestrianContext.ts";

const point = {
  latitude: -33.928691209372268,
  longitude: 18.424643548305873,
};

function candidate() {
  return {
    evidence: true,
  };
}

const pedestrianContext = {
  provider: "city_of_cape_town",
  featureType: "pedestrian_crossing",
  providerFeatureId: "{PEDESTRIAN-TEST}",
  ownership: "CoCT",
  statusCode: 1,
  raised: false,
  latitude: point.latitude,
  longitude: point.longitude,
  distanceMeters: 12,
};

test("does not resolve pedestrian context when no harsh-driving candidate exists", async () => {
  let calls = 0;

  const result =
    await resolveBehaviorPedestrianContext({
      ...point,
      harshBrakingCandidate: null,
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async () => {
        calls += 1;
        return pedestrianContext;
      },
    });

  assert.equal(calls, 0);
  assert.equal(result, null);
});

test("resolves pedestrian context once for harsh braking", async () => {
  let calls = 0;

  const result =
    await resolveBehaviorPedestrianContext({
      ...point,
      harshBrakingCandidate: candidate(),
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async (input) => {
        calls += 1;
        assert.deepEqual(input, point);
        return pedestrianContext;
      },
    });

  assert.equal(calls, 1);
  assert.deepEqual(result, pedestrianContext);
});

test("resolves pedestrian context once when multiple harsh-driving candidates exist", async () => {
  let calls = 0;

  await resolveBehaviorPedestrianContext({
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

test("rapid acceleration alone qualifies for pedestrian context resolution", async () => {
  let calls = 0;

  await resolveBehaviorPedestrianContext({
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

test("harsh cornering alone qualifies for pedestrian context resolution", async () => {
  let calls = 0;

  await resolveBehaviorPedestrianContext({
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

test("pedestrian resolver failure fails open", async () => {
  const result =
    await resolveBehaviorPedestrianContext({
      ...point,
      harshBrakingCandidate: candidate(),
      rapidAccelerationCandidate: null,
      harshCorneringCandidate: null,
      resolveContext: async () => {
        throw new Error("pedestrian provider unavailable");
      },
    });

  assert.equal(result, null);
});
