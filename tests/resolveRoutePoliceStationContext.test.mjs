import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRoutePoliceStationContext,
  selectRoutePoliceStationSamplePoint,
} from "../lib/route-safety/resolveRoutePoliceStationContext.ts";

test(
  "selectRoutePoliceStationSamplePoint selects the middle route point",
  () => {
    assert.deepEqual(
      selectRoutePoliceStationSamplePoint([
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRoutePoliceStationSamplePoint averages the two middle points",
  () => {
    assert.deepEqual(
      selectRoutePoliceStationSamplePoint([
        [-33.90, 18.40],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRoutePoliceStationSamplePoint ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRoutePoliceStationSamplePoint([
        [999, 18.40],
        [-33.91, 18.41],
        [Number.NaN, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRoutePoliceStationSamplePoint returns null when no valid points exist",
  () => {
    assert.equal(
      selectRoutePoliceStationSamplePoint([
        [999, 999],
        [Number.NaN, 18.4],
      ]),
      null
    );
  }
);

test(
  "resolveRoutePoliceStationContext resolves the representative route point",
  async () => {
    let receivedParams = null;

    const expectedContext = {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "17",

      stationName:
        "Cape Town Central",

      cluster:
        "Cape Town",

      distanceMeters:
        820,
    };

    const result =
      await resolveRoutePoliceStationContext({
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
  "resolveRoutePoliceStationContext supports explicit search radius",
  async () => {
    let receivedParams = null;

    await resolveRoutePoliceStationContext({
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
  "resolveRoutePoliceStationContext fails open when provider lookup throws",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      const result =
        await resolveRoutePoliceStationContext({
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
  "resolveRoutePoliceStationContext does not call provider without a valid route point",
  async () => {
    let called =
      false;

    const result =
      await resolveRoutePoliceStationContext({
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
