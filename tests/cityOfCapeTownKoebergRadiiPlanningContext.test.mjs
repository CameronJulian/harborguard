import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownKoebergRadiiPlanningFeature,
  resolveCityOfCapeTownKoebergRadiiPlanningContext,
} from "../lib/environmental-context/providers/cityOfCapeTownKoebergRadiiPlanning.ts";

test(
  "maps canonical Koeberg Radii Planning feature",
  () => {
    assert.deepEqual(
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 3,
          DSTN: 16,
        },
      }),
      {
        provider:
          "city_of_cape_town",

        providerFeatureId:
          "3",

        planningDistanceKm:
          16,
      }
    );
  }
);

test(
  "uses OBJECTID as provider identity",
  () => {
    const result =
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 11,
          DSTN: 80,
        },
      });

    assert.equal(
      result?.providerFeatureId,
      "11"
    );
  }
);

test(
  "normalizes numeric DSTN string",
  () => {
    const result =
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 2,
          DSTN: "10",
        },
      });

    assert.equal(
      result?.planningDistanceKm,
      10
    );
  }
);

test(
  "rejects feature without OBJECTID",
  () => {
    assert.equal(
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          DSTN: 20,
        },
      }),
      null
    );
  }
);

test(
  "rejects null or non-positive DSTN",
  () => {
    assert.equal(
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 1,
          DSTN: null,
        },
      }),
      null
    );

    assert.equal(
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 1,
          DSTN: 0,
        },
      }),
      null
    );

    assert.equal(
      mapCityOfCapeTownKoebergRadiiPlanningFeature({
        attributes: {
          OBJECTID: 1,
          DSTN: "invalid",
        },
      }),
      null
    );
  }
);

test(
  "invalid coordinates do not call ArcGIS",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let called =
      false;

    globalThis.fetch =
      async () => {
        called = true;

        throw new Error(
          "fetch should not run"
        );
      };

    try {
      const result =
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: 999,
          longitude: 18.4,
        });

      assert.equal(
        result,
        null
      );

      assert.equal(
        called,
        false
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "queries Layer 4 using point-in-polygon intersection",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let requestedUrl =
      null;

    let requestedOptions =
      null;

    globalThis.fetch =
      async (url, options) => {
        requestedUrl =
          String(url);

        requestedOptions =
          options;

        return {
          ok: true,
          status: 200,
          statusText: "OK",

          async json() {
            return {
              features: [
                {
                  attributes: {
                    OBJECTID: 4,
                    DSTN: 20,
                  },
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.826,
          longitude: 18.489,
        });

      assert.deepEqual(
        result,
        {
          provider:
            "city_of_cape_town",

          providerFeatureId:
            "4",

          planningDistanceKm:
            20,
        }
      );

      const parsed =
        new URL(requestedUrl);

      assert.ok(
        parsed.pathname.endsWith(
          "/Theme_Based/Safety_Security/MapServer/4/query"
        )
      );

      assert.equal(
        parsed.searchParams.get("geometry"),
        "18.489,-33.826"
      );

      assert.equal(
        parsed.searchParams.get("geometryType"),
        "esriGeometryPoint"
      );

      assert.equal(
        parsed.searchParams.get("inSR"),
        "4326"
      );

      assert.equal(
        parsed.searchParams.get("spatialRel"),
        "esriSpatialRelIntersects"
      );

      assert.equal(
        parsed.searchParams.get("outFields"),
        "OBJECTID,DSTN"
      );

      assert.equal(
        parsed.searchParams.get("returnGeometry"),
        "false"
      );

      assert.equal(
        parsed.searchParams.get("resultRecordCount"),
        "25"
      );

      assert.equal(
        requestedOptions?.cache,
        "no-store"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "selects the smallest planning distance when multiple valid polygons are returned",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",

        async json() {
          return {
            features: [
              {
                attributes: {
                  OBJECTID: 6,
                  DSTN: 30,
                },
              },
              {
                attributes: {
                  OBJECTID: 2,
                  DSTN: 10,
                },
              },
              {
                attributes: {
                  OBJECTID: 4,
                  DSTN: 20,
                },
              },
            ],
          };
        },
      });

    try {
      const result =
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.70,
          longitude: 18.45,
        });

      assert.equal(
        result?.planningDistanceKm,
        10
      );

      assert.equal(
        result?.providerFeatureId,
        "2"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "uses provider identity as deterministic tie-breaker",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",

        async json() {
          return {
            features: [
              {
                attributes: {
                  OBJECTID: 9,
                  DSTN: 20,
                },
              },
              {
                attributes: {
                  OBJECTID: 4,
                  DSTN: 20,
                },
              },
            ],
          };
        },
      });

    try {
      const result =
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.70,
          longitude: 18.45,
        });

      assert.equal(
        result?.providerFeatureId,
        "4"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "returns null when point is outside all published planning bands",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",

        async json() {
          return {
            features: [],
          };
        },
      });

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -34.70,
          longitude: 18.40,
        }),
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "supports City Koeberg Radii Planning URL override",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalUrl =
      process.env
        .CITY_OF_CAPE_TOWN_KOEBERG_RADII_PLANNING_URL;

    let requestedUrl =
      null;

    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_RADII_PLANNING_URL =
      "https://example.test/koeberg-radii/query";

    globalThis.fetch =
      async (url) => {
        requestedUrl =
          String(url);

        return {
          ok: true,
          status: 200,
          statusText: "OK",

          async json() {
            return {
              features: [],
            };
          },
        };
      };

    try {
      await resolveCityOfCapeTownKoebergRadiiPlanningContext({
        latitude: -33.68,
        longitude: 18.43,
      });

      assert.ok(
        requestedUrl.startsWith(
          "https://example.test/koeberg-radii/query?"
        )
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (originalUrl === undefined) {
        delete process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_RADII_PLANNING_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_RADII_PLANNING_URL =
          originalUrl;
      }
    }
  }
);

test(
  "HTTP failure fails open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn = () => {};

    globalThis.fetch =
      async () => ({
        ok: false,
        status: 503,
        statusText: "Unavailable",
      });

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.68,
          longitude: 18.43,
        }),
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      console.warn =
        originalWarn;
    }
  }
);

test(
  "ArcGIS error fails open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn = () => {};

    globalThis.fetch =
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",

        async json() {
          return {
            error: {
              code: 500,
              message:
                "Synthetic ArcGIS failure",
            },
          };
        },
      });

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.68,
          longitude: 18.43,
        }),
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      console.warn =
        originalWarn;
    }
  }
);

test(
  "network failure fails open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn = () => {};

    globalThis.fetch =
      async () => {
        throw new Error(
          "network unavailable"
        );
      };

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergRadiiPlanningContext({
          latitude: -33.68,
          longitude: 18.43,
        }),
        null
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      console.warn =
        originalWarn;
    }
  }
);
