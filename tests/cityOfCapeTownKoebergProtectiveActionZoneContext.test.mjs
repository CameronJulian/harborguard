import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownKoebergProtectiveActionZoneFeature,
  resolveCityOfCapeTownKoebergProtectiveActionZoneContext,
} from "../lib/environmental-context/providers/cityOfCapeTownKoebergProtectiveActionZone.ts";

test(
  "maps canonical Koeberg Protective Action Zone feature",
  () => {
    assert.deepEqual(
      mapCityOfCapeTownKoebergProtectiveActionZoneFeature({
        attributes: {
          OBJECTID: 3,
          ZONE_NMBR: "3",
        },
      }),
      {
        provider:
          "city_of_cape_town",

        providerFeatureId:
          "3",

        zoneNumber:
          "3",
      }
    );
  }
);

test(
  "uses OBJECTID as provider identity",
  () => {
    const result =
      mapCityOfCapeTownKoebergProtectiveActionZoneFeature({
        attributes: {
          OBJECTID: 27,
          ZONE_NMBR: "2",
        },
      });

    assert.equal(
      result?.providerFeatureId,
      "27"
    );
  }
);

test(
  "normalizes blank zone number to null",
  () => {
    const result =
      mapCityOfCapeTownKoebergProtectiveActionZoneFeature({
        attributes: {
          OBJECTID: 8,
          ZONE_NMBR: "   ",
        },
      });

    assert.equal(
      result?.zoneNumber,
      null
    );
  }
);

test(
  "rejects feature without OBJECTID",
  () => {
    assert.equal(
      mapCityOfCapeTownKoebergProtectiveActionZoneFeature({
        attributes: {
          ZONE_NMBR: "1",
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
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
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
  "queries Layer 3 using point-in-polygon intersection",
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
              features: [
                {
                  attributes: {
                    OBJECTID: 5,
                    ZONE_NMBR: "2",
                  },
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
          latitude: -33.68,
          longitude: 18.45,
        });

      assert.equal(
        result?.providerFeatureId,
        "5"
      );

      assert.equal(
        result?.zoneNumber,
        "2"
      );

      const parsed =
        new URL(requestedUrl);

      assert.ok(
        parsed.pathname.endsWith(
          "/Theme_Based/Safety_Security/MapServer/3/query"
        )
      );

      assert.equal(
        parsed.searchParams.get("geometry"),
        "18.45,-33.68"
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
        "OBJECTID,ZONE_NMBR"
      );

      assert.equal(
        parsed.searchParams.get("returnGeometry"),
        "false"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "returns null when point is outside all published zones",
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
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
          latitude: -34.20,
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
  "supports City Koeberg PAZ URL override",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalUrl =
      process.env
        .CITY_OF_CAPE_TOWN_KOEBERG_PROTECTIVE_ACTION_ZONE_URL;

    let requestedUrl =
      null;

    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_PROTECTIVE_ACTION_ZONE_URL =
      "https://example.test/koeberg-paz/query";

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
      await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
        latitude: -33.68,
        longitude: 18.45,
      });

      assert.ok(
        requestedUrl.startsWith(
          "https://example.test/koeberg-paz/query?"
        )
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (originalUrl === undefined) {
        delete process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_PROTECTIVE_ACTION_ZONE_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_PROTECTIVE_ACTION_ZONE_URL =
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
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
          latitude: -33.68,
          longitude: 18.45,
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
                "Synthetic ArcGIS error",
            },
          };
        },
      });

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
          latitude: -33.68,
          longitude: 18.45,
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
        await resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
          latitude: -33.68,
          longitude: 18.45,
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
