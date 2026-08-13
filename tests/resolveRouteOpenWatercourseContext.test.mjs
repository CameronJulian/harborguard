import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveRouteOpenWatercourseContext,
  selectRouteOpenWatercourseSamplePoint,
} from "../lib/route-safety/resolveRouteOpenWatercourseContext.ts";

test("selects actual middle point from odd route geometry", () => {
  const result =
    selectRouteOpenWatercourseSamplePoint([
      [-33.90, 18.40],
      [-33.91, 18.41],
      [-33.92, 18.42],
    ]);

  assert.deepEqual(
    result,
    [-33.91, 18.41]
  );
});

test("averages the two middle points for even route geometry", () => {
  const result =
    selectRouteOpenWatercourseSamplePoint([
      [-33.90, 18.40],
      [-33.92, 18.42],
    ]);

  assert.deepEqual(
    result,
    [-33.91, 18.41]
  );
});

test("ignores malformed route coordinates", () => {
  const result =
    selectRouteOpenWatercourseSamplePoint([
      ["invalid", 18.3],
      [-33.91, 18.41],
      [999, 18.2],
    ]);

  assert.deepEqual(
    result,
    [-33.91, 18.41]
  );
});

test("resolves open-watercourse context using route midpoint", async () => {
  let receivedParams = null;

  const expectedContext = {
    provider:
      "city_of_cape_town",

    providerFeatureId:
      "NTRL_3692",

    riverName:
      "JAKKALSVLEI",

    watercourseType:
      "NTRL",

    classification:
      "Main River",

    description:
      "natural stream",

    channelMaterial:
      null,

    floodplainMaterial:
      null,

    gradient:
      null,

    status:
      null,

    streamOrder:
      2,

    catchment:
      "Salt",

    ownership:
      "CoCT - CSRM",

    maintenanceAuthority:
      "CoCT",

    distanceMeters:
      24,
  };

  const result =
    await resolveRouteOpenWatercourseContext({
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
        100,
    }
  );

  assert.deepEqual(
    result,
    expectedContext
  );
});

test("returns null without calling provider when route has no valid points", async () => {
  let called = false;

  const result =
    await resolveRouteOpenWatercourseContext({
      routePoints: [
        ["bad", "point"],
        [999, 999],
      ],

      resolveContext:
        async () => {
          called = true;
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
});

test("fails open when environmental provider throws", async () => {
  const result =
    await resolveRouteOpenWatercourseContext({
      routePoints: [
        [-33.90, 18.40],
        [-33.92, 18.42],
      ],

      resolveContext:
        async () => {
          throw new Error(
            "City service unavailable"
          );
        },
    });

  assert.equal(
    result,
    null
  );
});