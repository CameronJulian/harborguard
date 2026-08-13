import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteKoebergProtectiveActionZoneContext,
  selectRouteKoebergProtectiveActionZoneSamplePoints,
} from "../lib/route-safety/resolveRouteKoebergProtectiveActionZoneContext.ts";

test(
  "selectRouteKoebergProtectiveActionZoneSamplePoints preserves valid route order",
  () => {
    assert.deepEqual(
      selectRouteKoebergProtectiveActionZoneSamplePoints([
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]),
      [
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]
    );
  }
);

test(
  "selectRouteKoebergProtectiveActionZoneSamplePoints ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRouteKoebergProtectiveActionZoneSamplePoints([
        [999, 18.40],
        [-33.91, 18.41],
        [Number.NaN, 18.42],
        [-33.92, -999],
      ]),
      [
        [-33.91, 18.41],
      ]
    );
  }
);

test(
  "selectRouteKoebergProtectiveActionZoneSamplePoints collapses consecutive duplicates",
  () => {
    assert.deepEqual(
      selectRouteKoebergProtectiveActionZoneSamplePoints([
        [-33.90, 18.40],
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.91, 18.41],
      ]),
      [
        [-33.90, 18.40],
        [-33.91, 18.41],
      ]
    );
  }
);

test(
  "resolveRouteKoebergProtectiveActionZoneContext returns first PAZ encountered along route",
  async () => {
    const calls = [];

    const expectedContext = {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "7",

      zoneNumber:
        "2",
    };

    const result =
      await resolveRouteKoebergProtectiveActionZoneContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
          [-33.70, 18.44],
          [-33.60, 18.46],
        ],

        resolveContext:
          async (params) => {
            calls.push(
              params
            );

            if (
              params.latitude ===
              -33.70
            ) {
              return expectedContext;
            }

            return null;
          },
      });

    assert.deepEqual(
      result,
      expectedContext
    );

    assert.deepEqual(
      calls,
      [
        {
          latitude:
            -33.90,

          longitude:
            18.40,
        },
        {
          latitude:
            -33.80,

          longitude:
            18.42,
        },
        {
          latitude:
            -33.70,

          longitude:
            18.44,
        },
      ]
    );
  }
);

test(
  "resolveRouteKoebergProtectiveActionZoneContext detects PAZ away from route midpoint",
  async () => {
    const expectedContext = {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "3",

      zoneNumber:
        "1",
    };

    const result =
      await resolveRouteKoebergProtectiveActionZoneContext({
        routePoints: [
          [-33.60, 18.40],
          [-33.61, 18.41],
          [-33.62, 18.42],
          [-33.63, 18.43],
          [-33.64, 18.44],
        ],

        resolveContext:
          async ({
            latitude,
          }) =>
            latitude === -33.61
              ? expectedContext
              : null,
      });

    assert.deepEqual(
      result,
      expectedContext
    );
  }
);

test(
  "resolveRouteKoebergProtectiveActionZoneContext returns null when route never enters PAZ",
  async () => {
    const result =
      await resolveRouteKoebergProtectiveActionZoneContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.91, 18.41],
          [-33.92, 18.42],
        ],

        resolveContext:
          async () =>
            null,
      });

    assert.equal(
      result,
      null
    );
  }
);

test(
  "resolveRouteKoebergProtectiveActionZoneContext continues after individual lookup failure",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    const expectedContext = {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "9",

      zoneNumber:
        "3",
    };

    try {
      let callCount =
        0;

      const result =
        await resolveRouteKoebergProtectiveActionZoneContext({
          routePoints: [
            [-33.90, 18.40],
            [-33.80, 18.42],
            [-33.70, 18.44],
          ],

          resolveContext:
            async () => {
              callCount += 1;

              if (
                callCount === 1
              ) {
                throw new Error(
                  "synthetic provider failure"
                );
              }

              if (
                callCount === 2
              ) {
                return expectedContext;
              }

              return null;
            },
        });

      assert.deepEqual(
        result,
        expectedContext
      );

      assert.equal(
        callCount,
        2
      );
    } finally {
      console.warn =
        originalWarn;
    }
  }
);

test(
  "resolveRouteKoebergProtectiveActionZoneContext fails open when every lookup fails",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      const result =
        await resolveRouteKoebergProtectiveActionZoneContext({
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
  "resolveRouteKoebergProtectiveActionZoneContext does not call provider without valid route points",
  async () => {
    let called =
      false;

    const result =
      await resolveRouteKoebergProtectiveActionZoneContext({
        routePoints: [
          [999, 999],
          [Number.NaN, 18.4],
        ],

        resolveContext:
          async () => {
            called = true;

            return {
              provider:
                "city_of_cape_town",

              providerFeatureId:
                "1",

              zoneNumber:
                "1",
            };
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
