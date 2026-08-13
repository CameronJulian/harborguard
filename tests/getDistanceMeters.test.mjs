import assert from "node:assert/strict";
import test from "node:test";

import {
  getDistanceMeters,
} from "../lib/geo/getDistanceMeters.ts";

function assertClose(actual, expected, tolerance, message) {
  assert.equal(Number.isFinite(actual), true, `${message}: expected finite result`);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("returns zero for identical coordinates", () => {
  const coordinate = {
    latitude: -33.9249,
    longitude: 18.4241,
  };

  assert.equal(
    getDistanceMeters(coordinate, coordinate),
    0
  );
});

test("calculates one degree of latitude at the equator", () => {
  const distance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 0,
    },
    {
      latitude: 1,
      longitude: 0,
    }
  );

  assertClose(
    distance,
    111194.92664455874,
    0.000001,
    "one degree latitude"
  );
});

test("calculates one degree of longitude at the equator", () => {
  const distance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 1,
    }
  );

  assertClose(
    distance,
    111194.92664455874,
    0.000001,
    "one degree longitude"
  );
});

test("one degree latitude and longitude are equal at the equator", () => {
  const latitudeDistance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 0,
    },
    {
      latitude: 1,
      longitude: 0,
    }
  );

  const longitudeDistance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 1,
    }
  );

  assertClose(
    latitudeDistance,
    longitudeDistance,
    0.000001,
    "equatorial degree distances"
  );
});

test("preserves a realistic short Cape Town distance", () => {
  const distance = getDistanceMeters(
    {
      latitude: -33.9249,
      longitude: 18.4241,
    },
    {
      latitude: -33.9259,
      longitude: 18.4241,
    }
  );

  assertClose(
    distance,
    111.19492664429958,
    0.000001,
    "Cape Town short distance"
  );
});

test("distance is symmetric", () => {
  const first = {
    latitude: -33.9249,
    longitude: 18.4241,
  };

  const second = {
    latitude: -34,
    longitude: 18.5,
  };

  const forward = getDistanceMeters(first, second);
  const reverse = getDistanceMeters(second, first);

  assertClose(
    forward,
    reverse,
    0.000001,
    "symmetric distance"
  );
});

test("calculates antipodal distance as approximately pi times Earth radius", () => {
  const distance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 180,
    }
  );

  const expected = Math.PI * 6371e3;

  assertClose(
    distance,
    expected,
    0.000001,
    "antipodal distance"
  );
});

test("preserves current NaN behavior for non-finite latitude", () => {
  const distance = getDistanceMeters(
    {
      latitude: Number.NaN,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 0,
    }
  );

  assert.equal(Number.isNaN(distance), true);
});

test("preserves current NaN behavior for infinite latitude", () => {
  const distance = getDistanceMeters(
    {
      latitude: Number.POSITIVE_INFINITY,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 0,
    }
  );

  assert.equal(Number.isNaN(distance), true);
});

test("does not add coordinate-range validation", () => {
  const latitudeDistance = getDistanceMeters(
    {
      latitude: 91,
      longitude: 0,
    },
    {
      latitude: 0,
      longitude: 0,
    }
  );

  const longitudeDistance = getDistanceMeters(
    {
      latitude: 0,
      longitude: 181,
    },
    {
      latitude: 0,
      longitude: 0,
    }
  );

  assert.equal(Number.isFinite(latitudeDistance), true);
  assert.equal(Number.isFinite(longitudeDistance), true);
});
