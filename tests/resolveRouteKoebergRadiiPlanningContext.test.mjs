import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteKoebergRadiiPlanningContext,
  selectRouteKoebergRadiiPlanningSamplePoints,
} from "../lib/route-safety/resolveRouteKoebergRadiiPlanningContext.ts";

function context({
  providerFeatureId,
  planningDistanceKm,
}) {
  return {
    provider:
      "city_of_cape_town",

    providerFeatureId:
      String(providerFeatureId),

    planningDistanceKm,
  };
}

test(
  "selectRouteKoebergRadiiPlanningSamplePoints preserves valid route order",
  () => {
    assert.deepEqual(
      selectRouteKoebergRadiiPlanningSamplePoints([
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
  "selectRouteKoebergRadiiPlanningSamplePoints ignores invalid route coordinates",
  () => {
    assert.deepEqual(
      selectRouteKoebergRadiiPlanningSamplePoints([
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
  "selectRouteKoebergRadiiPlanningSamplePoints collapses consecutive duplicate route points",
  () => {
    assert.deepEqual(
      selectRouteKoebergRadiiPlanningSamplePoints([
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
  "resolveRouteKoebergRadiiPlanningContext does not call provider without valid route points",
  async () => {
    let called =
      false;

    const result =
      await resolveRouteKoebergRadiiPlanningContext({
        routePoints: [
          [999, 999],
          [Number.NaN, 18.4],
        ],

        resolveContext:
          async () => {
            called = true;

            return context({
              providerFeatureId:
                1,

              planningDistanceKm:
                5,
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
  "resolveRouteKoebergRadiiPlanningContext returns null when all samples resolve null",
  async () => {
    const result =
      await resolveRouteKoebergRadiiPlanningContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.80, 18.42],
          [-33.70, 18.44],
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
  "resolveRouteKoebergRadiiPlanningContext resolves a single planning band",
  async () => {
    const expected =
      context({
        providerFeatureId:
          7,

        planningDistanceKm:
          16,
      });

    const result =
      await resolveRouteKoebergRadiiPlanningContext({
        routePoints: [
          [-33.90, 18.40],
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
  "resolveRouteKoebergRadiiPlanningContext chooses smallest planningDistanceKm across route",
  async () => {
    const calls =
      [];

    const result =
      await resolveRouteKoebergRadiiPlanningContext({
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
                  30,

                planningDistanceKm:
                  30,
              });
            }

            if (
              params.latitude ===
              -33.80
            ) {
              return context({
                providerFeatureId:
                  16,

                planningDistanceKm:
                  16,
              });
            }

            if (
              params.latitude ===
              -33.70
            ) {
              return context({
                providerFeatureId:
                  5,

                planningDistanceKm:
                  5,
              });
            }

            return context({
              providerFeatureId:
                20,

              planningDistanceKm:
                20,
            });
          },
      });

    assert.equal(
      result?.planningDistanceKm,
      5
    );

    assert.equal(
      result?.providerFeatureId,
      "5"
    );

    assert.equal(
      calls.length,
      4
    );
  }
);

test(
  "resolveRouteKoebergRadiiPlanningContext detects smaller band away from route midpoint",
  async () => {
    const result =
      await resolveRouteKoebergRadiiPlanningContext({
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
                  "early",

                planningDistanceKm:
                  5,
              });
            }

            if (
              latitude === -33.70
            ) {
              return context({
                providerFeatureId:
                  "midpoint",

                planningDistanceKm:
                  30,
              });
            }

            return context({
              providerFeatureId:
                "outer",

              planningDistanceKm:
                50,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "early"
    );

    assert.equal(
      result?.planningDistanceKm,
      5
    );
  }
);

test(
  "resolveRouteKoebergRadiiPlanningContext keeps first occurrence for equal minimum distance",
  async () => {
    const result =
      await resolveRouteKoebergRadiiPlanningContext({
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
                  "first-minimum",

                planningDistanceKm:
                  5,
              });
            }

            if (
              latitude === -33.80
            ) {
              return context({
                providerFeatureId:
                  "second-minimum",

                planningDistanceKm:
                  5,
              });
            }

            return context({
              providerFeatureId:
                "outer",

              planningDistanceKm:
                16,
            });
          },
      });

    assert.equal(
      result?.providerFeatureId,
      "first-minimum"
    );

    assert.equal(
      result?.planningDistanceKm,
      5
    );
  }
);

test(
  "resolveRouteKoebergRadiiPlanningContext continues after individual provider failure",
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
            5,

          planningDistanceKm:
            5,
        });

      const result =
        await resolveRouteKoebergRadiiPlanningContext({
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
                return expected;
              }

              return context({
                providerFeatureId:
                  16,

                planningDistanceKm:
                  16,
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
  "resolveRouteKoebergRadiiPlanningContext fails open when all provider calls fail",
  async () => {
    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    try {
      const result =
        await resolveRouteKoebergRadiiPlanningContext({
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
