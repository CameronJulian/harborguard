import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteFireStationContext,
  selectRouteFireStationSamplePoint,
} from "../lib/route-safety/resolveRouteFireStationContext.ts";

test(
  "selectRouteFireStationSamplePoint selects the middle route point",
  () => {
    assert.deepEqual(
      selectRouteFireStationSamplePoint([
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteFireStationSamplePoint averages the two middle points",
  () => {
    assert.deepEqual(
      selectRouteFireStationSamplePoint([
        [-33.90, 18.40],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteFireStationSamplePoint ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRouteFireStationSamplePoint([
        [999, 18.40],
        [-33.91, 18.41],
        [Number.NaN, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteFireStationSamplePoint returns null when no valid points exist",
  () => {
    assert.equal(
      selectRouteFireStationSamplePoint([
        [999, 999],
        [Number.NaN, 18.4],
      ]),
      null
    );
  }
);

test(
  "resolveRouteFireStationContext resolves the representative route point",
  async () => {
    let receivedParams = null;

    const expectedContext = {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "RDS",

      stationName:
        "ROELAND STREET",

      stationCode:
        "RDS",

      stationClass:
        "DISTRICT HQ - WEST",

      distanceMeters:
        930,
    };

    const result =
      await resolveRouteFireStationContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.91, 18.41],
          [-33.92, 18.42],
        ],

        resolveContext:
          async (params) => {
            receivedParams =
              params;

            return expectedContext;
          },
      });

    assert.deepEqual(
      receivedParams,
      {
        latitude:
          -33.91,

        longitude:
          18.41,

        searchRadiusMeters:
          10_000,
      }
    );

    assert.deepEqual(
      result,
      expectedContext
    );
  }
);

test(
  "resolveRouteFireStationContext supports explicit search radius",
  async () => {
    let receivedParams = null;

    await resolveRouteFireStationContext({
      routePoints: [
        [-33.90, 18.40],
        [-33.92, 18.42],
      ],

      searchRadiusMeters:
        15_000,

      resolveContext:
        async (params) => {
          receivedParams =
            params;

          return null;
        },
    });

    assert.deepEqual(
      receivedParams,
      {
        latitude:
          -33.91,

        longitude:
          18.41,

        searchRadiusMeters:
          15_000,
      }
    );
  }
);

test(
  "resolveRouteFireStationContext fails open when provider lookup throws",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      const result =
        await resolveRouteFireStationContext({
          routePoints: [
            [-33.90, 18.40],
            [-33.91, 18.41],
          ],

          resolveContext:
            async () => {
              throw new Error(
                "provider unavailable"
              );
            },
        });

      assert.equal(
        result,
        null
      );
    } finally {
      console.warn =
        originalWarn;
    }
  }
);

test(
  "resolveRouteFireStationContext does not call provider without a valid route point",
  async () => {
    let called =
      false;

    const result =
      await resolveRouteFireStationContext({
        routePoints: [
          [999, 999],
        ],

        resolveContext:
          async () => {
            called =
              true;

            return null;
          },
      });

    assert.equal(
      result,
      null
    );

    assert.equal(
      called,
      false
    );
  }
);
