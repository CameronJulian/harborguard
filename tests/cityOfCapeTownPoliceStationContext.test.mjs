import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownPoliceStationFeature,
  resolveCityOfCapeTownPoliceStationContext,
  selectCityOfCapeTownPoliceStationFeature,
} from "../lib/environmental-context/providers/cityOfCapeTownPoliceStations.ts";

test(
  "maps canonical City police station feature",
  () => {
    const result =
      mapCityOfCapeTownPoliceStationFeature({
        feature: {
          attributes: {
            OBJECTID: 1,
            STN: "Rondebosch",
            CLST: "Claremont",
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
          "1",

        stationName:
          "Rondebosch",

        cluster:
          "Claremont",

        distanceMeters:
          124,
      }
    );
  }
);

test(
  "uses OBJECTID as provider identity",
  () => {
    const result =
      mapCityOfCapeTownPoliceStationFeature({
        feature: {
          attributes: {
            OBJECTID: 42,
            STN: "Cape Town Central",
            CLST: "Cape Town",
          },
        },
        distanceMeters: 10,
      });

    assert.equal(
      result?.providerFeatureId,
      "42"
    );
  }
);

test(
  "normalizes blank station metadata to null",
  () => {
    const result =
      mapCityOfCapeTownPoliceStationFeature({
        feature: {
          attributes: {
            OBJECTID: 8,
            STN: "   ",
            CLST: "",
          },
        },
        distanceMeters: 50,
      });

    assert.equal(
      result?.stationName,
      null
    );

    assert.equal(
      result?.cluster,
      null
    );
  }
);

test(
  "rejects feature without OBJECTID",
  () => {
    assert.equal(
      mapCityOfCapeTownPoliceStationFeature({
        feature: {
          attributes: {
            STN: "Unknown",
            CLST: "Unknown",
          },
        },
        distanceMeters: 10,
      }),
      null
    );
  }
);

test(
  "rejects invalid distance",
  () => {
    assert.equal(
      mapCityOfCapeTownPoliceStationFeature({
        feature: {
          attributes: {
            OBJECTID: 1,
            STN: "Rondebosch",
          },
        },
        distanceMeters: -1,
      }),
      null
    );
  }
);

test(
  "selects nearest police station from EPSG:4326 geometry",
  () => {
    const result =
      selectCityOfCapeTownPoliceStationFeature({
        latitude: -33.9249,
        longitude: 18.4241,
        searchRadiusMeters: 10_000,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              STN: "Farther",
              CLST: "Test",
            },
            geometry: {
              x: 18.50175,
              y: -33.87562,
            },
          },

          {
            attributes: {
              OBJECTID: 2,
              STN: "Nearest",
              CLST: "Test",
            },
            geometry: {
              x: 18.42310,
              y: -33.92774,
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "2"
    );

    assert.equal(
      result?.stationName,
      "Nearest"
    );

    assert.ok(
      result.distanceMeters < 1_000
    );
  }
);

test(
  "ignores candidate without valid point geometry",
  () => {
    const result =
      selectCityOfCapeTownPoliceStationFeature({
        latitude: -33.9249,
        longitude: 18.4241,
        searchRadiusMeters: 10_000,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              STN: "Invalid",
            },
          },

          {
            attributes: {
              OBJECTID: 2,
              STN: "Valid",
              CLST: "Cape Town",
            },
            geometry: {
              x: 18.42310,
              y: -33.92774,
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "2"
    );
  }
);

test(
  "rejects locally computed candidate outside requested radius",
  () => {
    const result =
      selectCityOfCapeTownPoliceStationFeature({
        latitude: -33.9249,
        longitude: 18.4241,
        searchRadiusMeters: 50,

        features: [
          {
            attributes: {
              OBJECTID: 1,
              STN: "Far",
            },
            geometry: {
              x: 18.50,
              y: -33.90,
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
        await resolveCityOfCapeTownPoliceStationContext({
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
  "queries City Police Stations Layer 7 with bounded point search",
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
                    OBJECTID: 17,
                    STN: "Cape Town Central",
                    CLST: "Cape Town",
                  },
                  geometry: {
                    x: 18.4231,
                    y: -33.92774,
                  },
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownPoliceStationContext({
          latitude: -33.9249,
          longitude: 18.4241,
        });

      assert.equal(
        result?.providerFeatureId,
        "17"
      );

      const parsed =
        new URL(requestedUrl);

      assert.ok(
        parsed.pathname.endsWith(
          "/Theme_Based/Safety_Security/MapServer/7/query"
        )
      );

      assert.equal(
        parsed.searchParams.get("geometry"),
        "18.4241,-33.9249"
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
        parsed.searchParams.get("distance"),
        "10000"
      );

      assert.equal(
        parsed.searchParams.get("units"),
        "esriSRUnit_Meter"
      );

      assert.equal(
        parsed.searchParams.get("outFields"),
        "OBJECTID,STN,CLST"
      );

      assert.equal(
        parsed.searchParams.get("returnGeometry"),
        "true"
      );

      assert.equal(
        parsed.searchParams.get("outSR"),
        "4326"
      );

      assert.equal(
        parsed.searchParams.get("resultRecordCount"),
        "100"
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
      await resolveCityOfCapeTownPoliceStationContext({
        latitude: -33.9249,
        longitude: 18.4241,
        searchRadiusMeters: 999_999,
      });

      const parsed =
        new URL(requestedUrl);

      assert.equal(
        parsed.searchParams.get("distance"),
        "25000"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "supports City Police Station URL override",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalUrl =
      process.env
        .CITY_OF_CAPE_TOWN_POLICE_STATIONS_URL;

    let requestedUrl =
      null;

    process.env
      .CITY_OF_CAPE_TOWN_POLICE_STATIONS_URL =
      "https://example.test/police-stations/query";

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
      await resolveCityOfCapeTownPoliceStationContext({
        latitude: -33.9249,
        longitude: 18.4241,
      });

      assert.ok(
        requestedUrl.startsWith(
          "https://example.test/police-stations/query?"
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
          .CITY_OF_CAPE_TOWN_POLICE_STATIONS_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_POLICE_STATIONS_URL =
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
        statusText: "Unavailable",
      });

    try {
      const result =
        await resolveCityOfCapeTownPoliceStationContext({
          latitude: -33.9249,
          longitude: 18.4241,
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
        await resolveCityOfCapeTownPoliceStationContext({
          latitude: -33.9249,
          longitude: 18.4241,
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
        await resolveCityOfCapeTownPoliceStationContext({
          latitude: -33.9249,
          longitude: 18.4241,
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
