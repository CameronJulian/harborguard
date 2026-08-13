import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTrafficCalmingContext,
} from "../lib/route-safety/extractTrafficCalmingContext.ts";

function validContext() {
  return {
    provider: "city_of_cape_town",
    featureType: "speed_bump",
    providerFeatureId: "7:123",
    ownership: "City of Cape Town",
    statusCode: 1,
    latitude: -33.9249,
    longitude: 18.4241,
    distanceMeters: 12,
  };
}

test("extracts canonical traffic-calming context", () => {
  const context = validContext();

  assert.deepEqual(
    extractTrafficCalmingContext({
      trafficCalmingContext: context,
    }),
    context
  );
});

test("accepts raised-intersection context", () => {
  const context = {
    ...validContext(),
    featureType: "raised_intersection",
    providerFeatureId: "8:456",
  };

  assert.deepEqual(
    extractTrafficCalmingContext({
      trafficCalmingContext: context,
    }),
    context
  );
});

test("preserves nullable provider attributes", () => {
  const context = {
    ...validContext(),
    ownership: null,
    statusCode: null,
  };

  assert.deepEqual(
    extractTrafficCalmingContext({
      trafficCalmingContext: context,
    }),
    context
  );
});

test("returns null when context is absent", () => {
  assert.equal(
    extractTrafficCalmingContext({
      description: "fixture",
    }),
    null
  );
});

test("rejects unknown provider", () => {
  assert.equal(
    extractTrafficCalmingContext({
      trafficCalmingContext: {
        ...validContext(),
        provider: "fixture-provider",
      },
    }),
    null
  );
});

test("rejects unknown feature type", () => {
  assert.equal(
    extractTrafficCalmingContext({
      trafficCalmingContext: {
        ...validContext(),
        featureType: "speed_hump",
      },
    }),
    null
  );
});

test("rejects malformed provider feature identity", () => {
  assert.equal(
    extractTrafficCalmingContext({
      trafficCalmingContext: {
        ...validContext(),
        providerFeatureId: "",
      },
    }),
    null
  );
});

test("rejects malformed status code", () => {
  assert.equal(
    extractTrafficCalmingContext({
      trafficCalmingContext: {
        ...validContext(),
        statusCode: "active",
      },
    }),
    null
  );
});

test("rejects negative distance", () => {
  assert.equal(
    extractTrafficCalmingContext({
      trafficCalmingContext: {
        ...validContext(),
        distanceMeters: -1,
      },
    }),
    null
  );
});