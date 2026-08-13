import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRouteMainDrainageContext,
  selectRouteMainDrainageSamplePoint,
} from "../lib/route-safety/resolveRouteMainDrainageContext.ts";

test(
  "selectRouteMainDrainageSamplePoint selects the middle route point",
  () => {
    assert.deepEqual(
      selectRouteMainDrainageSamplePoint([
        [-33.90, 18.40],
        [-33.91, 18.41],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteMainDrainageSamplePoint averages the two middle points",
  () => {
    assert.deepEqual(
      selectRouteMainDrainageSamplePoint([
        [-33.90, 18.40],
        [-33.92, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteMainDrainageSamplePoint ignores invalid coordinates",
  () => {
    assert.deepEqual(
      selectRouteMainDrainageSamplePoint([
        [999, 18.40],
        [-33.91, 18.41],
        [Number.NaN, 18.42],
      ]),
      [-33.91, 18.41]
    );
  }
);

test(
  "selectRouteMainDrainageSamplePoint returns null when no valid points exist",
  () => {
    assert.equal(
      selectRouteMainDrainageSamplePoint([
        [999, 999],
        [Number.NaN, 18.4],
      ]),
      null
    );
  }
);

test(
  "resolveRouteMainDrainageContext resolves the representative route point",
  async () => {
    let receivedParams = null;

    const expectedContext = {
      provider: "city_of_cape_town",
      providerFeatureId: "123",
      assetType: "PIPE",
      crossSection: null,
      material: null,
      nominalDiameterMm: null,
      internalDiameterMm: null,
      widthMm: null,
      heightMm: null,
      upstreamInvertLevel: null,
      downstreamInvertLevel: null,
      gradient: null,
      crossing: null,
      linkFunction: null,
      integratedUrbanDrainage: null,
      dateConstructed: null,
      locationDescription: null,
      catchment: null,
      district: null,
      planningRegion: null,
      comment: null,
      sapObjectType: null,
      sapDescription: null,
      sapUserStatus: null,
      financialAssetKey: null,
      syncDate: null,
      ownership: null,
      maintenanceAuthority: null,
      distanceMeters: 25,
    };

    const result =
      await resolveRouteMainDrainageContext({
        routePoints: [
          [-33.90, 18.40],
          [-33.91, 18.41],
          [-33.92, 18.42],
        ],
        searchRadiusMeters: 150,
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
        searchRadiusMeters: 150,
      }
    );

    assert.deepEqual(
      result,
      expectedContext
    );
  }
);

test(
  "resolveRouteMainDrainageContext fails open when provider lookup throws",
  async () => {
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
      const result =
        await resolveRouteMainDrainageContext({
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
  "resolveRouteMainDrainageContext does not call provider without a valid route point",
  async () => {
    let called = false;

    const result =
      await resolveRouteMainDrainageContext({
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
