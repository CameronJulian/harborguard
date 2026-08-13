import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownDrainageCatchmentFeature,
  selectCityOfCapeTownDrainageCatchmentFeature,
  resolveCityOfCapeTownDrainageCatchmentContext,
} from "../lib/environmental-context/providers/cityOfCapeTownDrainageCatchment.ts";

test(
  "maps canonical City drainage catchment",
  () => {
    const result =
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          OBJECTID: 21,
          RGN_ID: "RGN_8",
          CTMT_RGN: "HBay",
          AREA_KM2: 39.95851087,
        },
      });

    assert.deepEqual(
      result,
      {
        provider:
          "city_of_cape_town",

        providerFeatureId:
          "RGN_8",

        catchmentRegion:
          "HBay",

        areaKm2:
          39.95851087,
      }
    );
  }
);

test(
  "falls back to OBJECTID when RGN_ID is unavailable",
  () => {
    const result =
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          OBJECTID: 13,
          RGN_ID: "",
          CTMT_RGN: "City",
          AREA_KM2: 56.04686911,
        },
      });

    assert.equal(
      result?.providerFeatureId,
      "13"
    );
  }
);

test(
  "normalizes blank catchment region to null",
  () => {
    const result =
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          OBJECTID: 14,
          RGN_ID: "RGN_6",
          CTMT_RGN: "   ",
          AREA_KM2: 214.85056023,
        },
      });

    assert.equal(
      result?.catchmentRegion,
      null
    );
  }
);

test(
  "normalizes invalid area to null",
  () => {
    const negative =
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          OBJECTID: 1,
          RGN_ID: "RGN_NEGATIVE",
          CTMT_RGN: "Test",
          AREA_KM2: -1,
        },
      });

    const malformed =
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          OBJECTID: 2,
          RGN_ID: "RGN_BAD",
          CTMT_RGN: "Test",
          AREA_KM2: "not-a-number",
        },
      });

    assert.equal(
      negative?.areaKm2,
      null
    );

    assert.equal(
      malformed?.areaKm2,
      null
    );
  }
);

test(
  "rejects feature without durable identity",
  () => {
    assert.equal(
      mapCityOfCapeTownDrainageCatchmentFeature({
        attributes: {
          RGN_ID: "",
          CTMT_RGN: "City",
        },
      }),
      null
    );
  }
);

test(
  "selects catchment deterministically when multiple polygons are returned",
  () => {
    const result =
      selectCityOfCapeTownDrainageCatchmentFeature([
        {
          attributes: {
            OBJECTID: 2,
            RGN_ID: "RGN_9",
            CTMT_RGN: "Second",
            AREA_KM2: 20,
          },
        },

        {
          attributes: {
            OBJECTID: 1,
            RGN_ID: "RGN_8",
            CTMT_RGN: "First",
            AREA_KM2: 10,
          },
        },
      ]);

    assert.equal(
      result?.providerFeatureId,
      "RGN_8"
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
        await resolveCityOfCapeTownDrainageCatchmentContext({
          latitude:
            999,

          longitude:
            18.4,
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
  "queries City Layer 24 as an EPSG:4326 point-in-polygon lookup",
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
                    OBJECTID: 21,
                    RGN_ID: "RGN_8",
                    CTMT_RGN: "HBay",
                    AREA_KM2: 39.95851087,
                  },
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownDrainageCatchmentContext({
          latitude:
            -34.0435,

          longitude:
            18.3490,
        });

      assert.equal(
        result?.providerFeatureId,
        "RGN_8"
      );

      const parsed =
        new URL(requestedUrl);

      assert.ok(
        parsed.pathname.endsWith(
          "/Theme_Based/Basic_Services_Infrastructure/MapServer/24/query"
        )
      );

      assert.equal(
        parsed.searchParams.get(
          "geometry"
        ),
        "18.349,-34.0435"
      );

      assert.equal(
        parsed.searchParams.get(
          "geometryType"
        ),
        "esriGeometryPoint"
      );

      assert.equal(
        parsed.searchParams.get(
          "inSR"
        ),
        "4326"
      );

      assert.equal(
        parsed.searchParams.get(
          "spatialRel"
        ),
        "esriSpatialRelIntersects"
      );

      assert.equal(
        parsed.searchParams.get(
          "returnGeometry"
        ),
        "false"
      );

      assert.equal(
        parsed.searchParams.get(
          "outFields"
        ),
        "OBJECTID,RGN_ID,CTMT_RGN,AREA_KM2"
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
  "HTTP failure fails open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn =
      () => {};

    globalThis.fetch =
      async () => ({
        ok: false,
        status: 503,
        statusText: "Unavailable",
      });

    try {
      const result =
        await resolveCityOfCapeTownDrainageCatchmentContext({
          latitude:
            -33.9249,

          longitude:
            18.4241,
        });

      assert.equal(
        result,
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
  "ArcGIS errors fail open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn =
      () => {};

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
      const result =
        await resolveCityOfCapeTownDrainageCatchmentContext({
          latitude:
            -33.9249,

          longitude:
            18.4241,
        });

      assert.equal(
        result,
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

    console.warn =
      () => {};

    globalThis.fetch =
      async () => {
        throw new Error(
          "network unavailable"
        );
      };

    try {
      const result =
        await resolveCityOfCapeTownDrainageCatchmentContext({
          latitude:
            -34.0435,

          longitude:
            18.349,
        });

      assert.equal(
        result,
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
