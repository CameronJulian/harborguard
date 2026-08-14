import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteKoebergEvacuationDirectionContext,
  selectRouteKoebergEvacuationDirectionSamplePoints,
} from "../lib/route-safety/resolveRouteKoebergEvacuationDirectionContext.ts";

function context({
  providerFeatureId,
  sourceLayerId,
  direction,
  routeName,
  routeType,
  distanceMeters,
}) {
  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    sourceLayerId,

    direction,

    routeName,

    routeType,

    distanceMeters,
  };
}

test(
  "selectRouteKoebergEvacuationDirectionSamplePoints preserves valid route order",
  () => {
    assert.deepEqual(
      selectRouteKoebergEvacuationDirectionSamplePoints([
        [-33.90, 18.40],
        [-33.80, 18.42],
        [-33.70, 18.44],
      ]),
      [
        [-33.90, 18.40],
        [-33.80, 18.42],
        [-33.70, 18.44],
      ]
    );
  }
);

test(
  "selectRouteKoebergEvacuationDirectionSamplePoints ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRouteKoebergEvacuationDirectionSamplePoints([
        [999, 18.40],
        [-33.90, 18.40],
        [Number.NaN, 18.42],
        [-33.80, -999],
      ]),
      [
        [-33.90, 18.40],
      ]
    );
  }
);

test(
  "selectRouteKoebergEvacuationDirectionSamplePoints collapses consecutive duplicate points",
  () => {
    assert.deepEqual(
      selectRouteKoebergEvacuationDirectionSamplePoints([
        [-33.90, 18.40],
        [-33.90, 18.40],
        [-33.80, 18.42],
        [-33.80, 18.42],
        [-33.70, 18.44],
      ]),
      [
        [-33.90, 18.40],
        [-33.80, 18.42],
        [-33.70, 18.44],
      ]
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext does not call provider without valid route points",
  async () => {
    let called =
      false;

    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [999, 999],
          [Number.NaN, 18.40],
        ],

        resolveContext:
          async () => {
            called =
              true;

            return context({
              providerFeatureId:
                "0:1",

              sourceLayerId:
                0,

              direction:
                "north",

              routeName:
                "North route",

              routeType:
                "EVAC",

              distanceMeters:
                100,
            });
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

test(
  "resolveRouteKoebergEvacuationDirectionContext returns null when all samples return null",
  async () => {
    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
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
  "resolveRouteKoebergEvacuationDirectionContext resolves one evacuation direction",
  async () => {
    const expected =
      context({
        providerFeatureId:
          "2:27",

        sourceLayerId:
          2,

        direction:
          "east",

        routeName:
          "East evacuation route",

        routeType:
          "Primary",

        distanceMeters:
          425,
      });

    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.80, 18.42],
        ],

        resolveContext:
          async () =>
            expected,
      });

    assert.deepEqual(
      result,
      expected
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext chooses smallest distanceMeters across route",
  async () => {
    const calls =
      [];

    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
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
              -33.90
            ) {
              return context({
                providerFeatureId:
                  "0:30",

                sourceLayerId:
                  0,

                direction:
                  "north",

                routeName:
                  "North outer",

                routeType:
                  "Primary",

                distanceMeters:
                  900,
              });
            }

            if (
              params.latitude ===
              -33.80
            ) {
              return context({
                providerFeatureId:
                  "1:18",

                sourceLayerId:
                  1,

                direction:
                  "south",

                routeName:
                  "South route",

                routeType:
                  "Primary",

                distanceMeters:
                  250,
              });
            }

            if (
              params.latitude ===
              -33.70
            ) {
              return context({
                providerFeatureId:
                  "2:4",

                sourceLayerId:
                  2,

                direction:
                  "east",

                routeName:
                  "East nearest",

                routeType:
                  "Primary",

                distanceMeters:
                  35,
              });
            }

            return context({
              providerFeatureId:
                "0:11",

              sourceLayerId:
                0,

              direction:
                "north",

              routeName:
                "North later",

              routeType:
                "Secondary",

              distanceMeters:
                400,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "2:4"
    );

    assert.equal(
      result?.direction,
      "east"
    );

    assert.equal(
      result?.distanceMeters,
      35
    );

    assert.equal(
      calls.length,
      4
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext detects nearest direction away from route midpoint",
  async () => {
    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
          [-33.70, 18.44],
          [-33.60, 18.46],
          [-33.50, 18.48],
        ],

        resolveContext:
          async ({
            latitude,
          }) => {
            if (
              latitude === -33.90
            ) {
              return context({
                providerFeatureId:
                  "1:early",

                sourceLayerId:
                  1,

                direction:
                  "south",

                routeName:
                  "Nearest before midpoint",

                routeType:
                  "Primary",

                distanceMeters:
                  20,
              });
            }

            if (
              latitude === -33.70
            ) {
              return context({
                providerFeatureId:
                  "0:midpoint",

                sourceLayerId:
                  0,

                direction:
                  "north",

                routeName:
                  "Midpoint route",

                routeType:
                  "Primary",

                distanceMeters:
                  800,
              });
            }

            return context({
              providerFeatureId:
                "2:outer",

              sourceLayerId:
                2,

              direction:
                "east",

              routeName:
                "Outer route",

              routeType:
                "Secondary",

              distanceMeters:
                1200,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "1:early"
    );

    assert.equal(
      result?.distanceMeters,
      20
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext keeps first occurrence for equal distanceMeters",
  async () => {
    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
          [-33.70, 18.44],
        ],

        resolveContext:
          async ({
            latitude,
          }) => {
            if (
              latitude === -33.90
            ) {
              return context({
                providerFeatureId:
                  "0:first",

                sourceLayerId:
                  0,

                direction:
                  "north",

                routeName:
                  "First minimum",

                routeType:
                  "Primary",

                distanceMeters:
                  50,
              });
            }

            if (
              latitude === -33.80
            ) {
              return context({
                providerFeatureId:
                  "2:second",

                sourceLayerId:
                  2,

                direction:
                  "east",

                routeName:
                  "Second minimum",

                routeType:
                  "Primary",

                distanceMeters:
                  50,
              });
            }

            return context({
              providerFeatureId:
                "1:outer",

              sourceLayerId:
                1,

              direction:
                "south",

              routeName:
                "Outer",

              routeType:
                "Secondary",

              distanceMeters:
                500,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "0:first"
    );

    assert.equal(
      result?.direction,
      "north"
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext preserves provider direction name type and identity",
  async () => {
    const expected =
      context({
        providerFeatureId:
          "2:314",

        sourceLayerId:
          2,

        direction:
          "east",

        routeName:
          "Melkbos East",

        routeType:
          "Primary evacuation",

        distanceMeters:
          12,
      });

    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.70, 18.44],
        ],

        resolveContext:
          async () =>
            expected,
      });

    assert.deepEqual(
      result,
      expected
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext ignores invalid provider distance",
  async () => {
    let callCount =
      0;

    const result =
      await resolveRouteKoebergEvacuationDirectionContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
          [-33.70, 18.44],
        ],

        resolveContext:
          async () => {
            callCount +=
              1;

            if (
              callCount === 1
            ) {
              return context({
                providerFeatureId:
                  "0:bad-negative",

                sourceLayerId:
                  0,

                direction:
                  "north",

                routeName:
                  null,

                routeType:
                  null,

                distanceMeters:
                  -1,
              });
            }

            if (
              callCount === 2
            ) {
              return context({
                providerFeatureId:
                  "1:bad-nan",

                sourceLayerId:
                  1,

                direction:
                  "south",

                routeName:
                  null,

                routeType:
                  null,

                distanceMeters:
                  Number.NaN,
              });
            }

            return context({
              providerFeatureId:
                "2:valid",

              sourceLayerId:
                2,

              direction:
                "east",

              routeName:
                "Valid",

              routeType:
                "Primary",

              distanceMeters:
                25,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "2:valid"
    );
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext continues after individual provider failure",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      let callCount =
        0;

      const expected =
        context({
          providerFeatureId:
            "1:5",

          sourceLayerId:
            1,

          direction:
            "south",

          routeName:
            "Recovered route",

          routeType:
            "Primary",

          distanceMeters:
            10,
        });

      const result =
        await resolveRouteKoebergEvacuationDirectionContext({
          routePoints: [
            [-33.90, 18.40],
            [-33.80, 18.42],
            [-33.70, 18.44],
          ],

          resolveContext:
            async () => {
              callCount +=
                1;

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
                return expected;
              }

              return context({
                providerFeatureId:
                  "2:8",

                sourceLayerId:
                  2,

                direction:
                  "east",

                routeName:
                  "Later route",

                routeType:
                  "Secondary",

                distanceMeters:
                  300,
              });
            },
        });

      assert.deepEqual(
        result,
        expected
      );

      assert.equal(
        callCount,
        3
      );
    } finally {
      console.warn =
        originalWarn;
    }
  }
);

test(
  "resolveRouteKoebergEvacuationDirectionContext fails open when all provider calls fail",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      const result =
        await resolveRouteKoebergEvacuationDirectionContext({
          routePoints: [
            [-33.90, 18.40],
            [-33.80, 18.42],
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
