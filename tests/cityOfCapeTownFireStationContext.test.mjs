import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownFireStationFeature,
  resolveCityOfCapeTownFireStationContext,
  selectCityOfCapeTownFireStationFeature,
} from "../lib/environmental-context/providers/cityOfCapeTownFireStations.ts";

test(
  "maps canonical City fire station feature",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 1,
            FIRE_STN_NAME: "EPPING",
            FIRE_STN_CODE: "EPG",
            FIRE_STN_CLASS: "COMMUNITY STATION",
          },
        },
        distanceMeters: 123.6,
      });

    assert.deepEqual(
      result,
      {
        provider:
          "city_of_cape_town",

        providerFeatureId:
          "EPG",

        stationName:
          "EPPING",

        stationCode:
          "EPG",

        stationClass:
          "COMMUNITY STATION",

        distanceMeters:
          124,
      }
    );
  }
);

test(
  "prefers FIRE_STN_CODE as durable provider identity",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 99,
            FIRE_STN_NAME:
              "BELLVILLE",
            FIRE_STN_CODE:
              "BVL",
            FIRE_STN_CLASS:
              "DISTRICT HQ - NORTH",
          },
        },
        distanceMeters:
          10,
      });

    assert.equal(
      result?.providerFeatureId,
      "BVL"
    );
  }
);

test(
  "falls back to OBJECTID when station code is unavailable",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 42,
            FIRE_STN_NAME:
              "TEST STATION",
            FIRE_STN_CODE:
              "   ",
            FIRE_STN_CLASS:
              "COMMUNITY STATION",
          },
        },
        distanceMeters:
          25,
      });

    assert.equal(
      result?.providerFeatureId,
      "42"
    );

    assert.equal(
      result?.stationCode,
      null
    );
  }
);

test(
  "preserves City station classification verbatim",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 4,
            FIRE_STN_NAME:
              "ROELAND STREET",
            FIRE_STN_CODE:
              "RDS",
            FIRE_STN_CLASS:
              "DISTRICT HQ - WEST",
          },
        },
        distanceMeters:
          100,
      });

    assert.equal(
      result?.stationClass,
      "DISTRICT HQ - WEST"
    );
  }
);

test(
  "normalizes blank optional station metadata to null",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 8,
            FIRE_STN_NAME: "   ",
            FIRE_STN_CODE: "",
            FIRE_STN_CLASS: " ",
          },
        },
        distanceMeters:
          50,
      });

    assert.equal(
      result?.stationName,
      null
    );

    assert.equal(
      result?.stationCode,
      null
    );

    assert.equal(
      result?.stationClass,
      null
    );
  }
);

test(
  "rejects feature without durable identity",
  () => {
    assert.equal(
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            FIRE_STN_NAME:
              "UNKNOWN",
            FIRE_STN_CODE:
              "",
          },
        },
        distanceMeters:
          10,
      }),
      null
    );
  }
);

test(
  "rejects invalid distance",
  () => {
    const result =
      mapCityOfCapeTownFireStationFeature({
        feature: {
          attributes: {
            OBJECTID: 1,
            FIRE_STN_CODE: "EPG",
          },
        },
        distanceMeters:
          -1,
      });

    assert.equal(
      result,
      null
    );
  }
);

test(
  "selects nearest fire station using returned EPSG:4326 point geometry",
  () => {
    const result =
      selectCityOfCapeTownFireStationFeature({
        latitude:
          -33.9249,

        longitude:
          18.4241,

        searchRadiusMeters:
          10_000,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              FIRE_STN_NAME:
                "FARTHER",
              FIRE_STN_CODE:
                "FAR",
              FIRE_STN_CLASS:
                "COMMUNITY STATION",
            },
            geometry: {
              x:
                18.4805,
              y:
                -33.9160,
            },
          },

          {
            attributes: {
              OBJECTID: 2,
              FIRE_STN_NAME:
                "NEAREST",
              FIRE_STN_CODE:
                "NRS",
              FIRE_STN_CLASS:
                "DISTRICT HQ",
            },
            geometry: {
              x:
                18.4251,
              y:
                -33.9333,
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "NRS"
    );

    assert.equal(
      result?.stationName,
      "NEAREST"
    );

    assert.ok(
      Number.isFinite(
        result?.distanceMeters
      )
    );

    assert.ok(
      result.distanceMeters <
        2_000
    );
  }
);

test(
  "ignores candidate with missing point geometry",
  () => {
    const result =
      selectCityOfCapeTownFireStationFeature({
        latitude:
          -33.9249,

        longitude:
          18.4241,

        searchRadiusMeters:
          10_000,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              FIRE_STN_CODE:
                "BAD",
            },
          },

          {
            attributes: {
              OBJECTID: 2,
              FIRE_STN_NAME:
                "VALID",
              FIRE_STN_CODE:
                "VAL",
              FIRE_STN_CLASS:
                "COMMUNITY STATION",
            },
            geometry: {
              x:
                18.4251,
              y:
                -33.9333,
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "VAL"
    );
  }
);

test(
  "rejects locally computed candidate outside requested radius",
  () => {
    const result =
      selectCityOfCapeTownFireStationFeature({
        latitude:
          -33.9249,

        longitude:
          18.4241,

        searchRadiusMeters:
          50,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              FIRE_STN_CODE:
                "FAR",
            },
            geometry: {
              x:
                18.5,
              y:
                -33.9,
            },
          },
        ],
      });

    assert.equal(
      result,
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
        await resolveCityOfCapeTownFireStationContext({
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
  "queries City Layer 6 with bounded point search and geometry",
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
                    FIRE_STN_NAME:
                      "ROELAND STREET",
                    FIRE_STN_CODE:
                      "RDS",
                    FIRE_STN_CLASS:
                      "DISTRICT HQ - WEST",
                  },

                  geometry: {
                    x:
                      18.4251247611,
                    y:
                      -33.9332984485,
                  },
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownFireStationContext({
          latitude:
            -33.9249,

          longitude:
            18.4241,
        });

      assert.equal(
        result?.providerFeatureId,
        "RDS"
      );

      const parsed =
        new URL(requestedUrl);

      assert.ok(
        parsed.pathname.endsWith(
          "/Theme_Based/Safety_Security/MapServer/6/query"
        )
      );

      assert.equal(
        parsed.searchParams.get(
          "geometry"
        ),
        "18.4241,-33.9249"
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
          "distance"
        ),
        "10000"
      );

      assert.equal(
        parsed.searchParams.get(
          "units"
        ),
        "esriSRUnit_Meter"
      );

      assert.equal(
        parsed.searchParams.get(
          "outFields"
        ),
        "OBJECTID,FIRE_STN_NAME,FIRE_STN_CODE,FIRE_STN_CLASS"
      );

      assert.equal(
        parsed.searchParams.get(
          "returnGeometry"
        ),
        "true"
      );

      assert.equal(
        parsed.searchParams.get(
          "outSR"
        ),
        "4326"
      );

      assert.equal(
        parsed.searchParams.get(
          "resultRecordCount"
        ),
        "50"
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
  "caps excessive search radius at provider maximum",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let requestedUrl =
      null;

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
      await resolveCityOfCapeTownFireStationContext({
        latitude:
          -33.9249,

        longitude:
          18.4241,

        searchRadiusMeters:
          999_999,
      });

      const parsed =
        new URL(requestedUrl);

      assert.equal(
        parsed.searchParams.get(
          "distance"
        ),
        "25000"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "supports City Fire Station URL override",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalUrl =
      process.env
        .CITY_OF_CAPE_TOWN_FIRE_STATIONS_URL;

    let requestedUrl =
      null;

    process.env
      .CITY_OF_CAPE_TOWN_FIRE_STATIONS_URL =
      "https://example.test/fire-stations/query";

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
      await resolveCityOfCapeTownFireStationContext({
        latitude:
          -33.9249,

        longitude:
          18.4241,
      });

      assert.ok(
        requestedUrl.startsWith(
          "https://example.test/fire-stations/query?"
        )
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalUrl ===
        undefined
      ) {
        delete process.env
          .CITY_OF_CAPE_TOWN_FIRE_STATIONS_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_FIRE_STATIONS_URL =
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

    console.warn =
      () => {};

    globalThis.fetch =
      async () => ({
        ok: false,
        status: 503,
        statusText:
          "Unavailable",
      });

    try {
      const result =
        await resolveCityOfCapeTownFireStationContext({
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
  "ArcGIS error fails open to null",
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
        await resolveCityOfCapeTownFireStationContext({
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
        await resolveCityOfCapeTownFireStationContext({
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
