import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteDrainageCatchmentContext,
  selectRouteDrainageCatchmentSamplePoint,
} from "../lib/route-safety/resolveRouteDrainageCatchmentContext.ts";

test(
  "selectRouteDrainageCatchmentSamplePoint selects the middle route point",
  () => {
    assert.deepEqual(
      selectRouteDrainageCatchmentSamplePoint([
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteDrainageCatchmentSamplePoint averages the two middle points",
  () => {
    assert.deepEqual(
      selectRouteDrainageCatchmentSamplePoint([
        [-33.90, 18.40],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteDrainageCatchmentSamplePoint ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRouteDrainageCatchmentSamplePoint([
        [999, 18.40],
        [-33.91, 18.41],
        [Number.NaN, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteDrainageCatchmentSamplePoint returns null when no valid points exist",
  () => {
    assert.equal(
      selectRouteDrainageCatchmentSamplePoint([
        [999, 999],
        [Number.NaN, 18.4],
      ]),
      null
    );
  }
);

test(
  "resolveRouteDrainageCatchmentContext resolves the representative route point",
  async () => {
    let receivedParams = null;

    const expectedContext = {
      provider: "city_of_cape_town",
      providerFeatureId: "42",
      catchmentRegion: "TEST REGION",
      areaKm2: 12.5,
    };

    const result =
      await resolveRouteDrainageCatchmentContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.91, 18.41],
          [-33.92, 18.42],
        ],
        resolveContext: async (params) => {
          receivedParams = params;
          return expectedContext;
        },
      });

    assert.deepEqual(
      receivedParams,
      {
        latitude: -33.91,
        longitude: 18.41,
      }
    );

    assert.deepEqual(
      result,
      expectedContext
    );
  }
);

test(
  "resolveRouteDrainageCatchmentContext fails open when provider lookup throws",
  async () => {
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
      const result =
        await resolveRouteDrainageCatchmentContext({
          routePoints: [
            [-33.90, 18.40],
            [-33.91, 18.41],
          ],
          resolveContext: async () => {
            throw new Error("provider unavailable");
          },
        });

      assert.equal(result, null);
    } finally {
      console.warn = originalWarn;
    }
  }
);

test(
  "resolveRouteDrainageCatchmentContext does not call provider without a valid route point",
  async () => {
    let called = false;

    const result =
      await resolveRouteDrainageCatchmentContext({
        routePoints: [
          [999, 999],
        ],
        resolveContext: async () => {
          called = true;
          return null;
        },
      });

    assert.equal(result, null);
    assert.equal(called, false);
  }
);
