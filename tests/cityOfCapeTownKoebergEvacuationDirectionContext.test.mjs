import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownKoebergEvacuationFeature,
  resolveCityOfCapeTownKoebergEvacuationDirectionContext,
  selectNearestCityOfCapeTownKoebergEvacuationFeature,
} from "../lib/environmental-context/providers/cityOfCapeTownKoebergEvacuationDirections.ts";

function pointPath({
  latitude,
  longitude,
}) {
  return {
    paths: [
      [
        [
          longitude,
          latitude,
        ],
        [
          longitude + 0.0001,
          latitude,
        ],
      ],
    ],
  };
}

test(
  "maps canonical north evacuation feature",
  () => {
    assert.deepEqual(
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 0,
        direction: "north",

        feature: {
          attributes: {
            OBJECTID: 2,
            NAME:
              "ATLANTIS CONTRA-FLOW",
            TYPE:
              "CONTRA-FLOW",
          },
        },

        distanceMeters:
          123.4,
      }),
      {
        provider:
          "city_of_cape_town",

        providerFeatureId:
          "0:2",

        sourceLayerId:
          0,

        direction:
          "north",

        routeName:
          "ATLANTIS CONTRA-FLOW",

        routeType:
          "CONTRA-FLOW",

        distanceMeters:
          123,
      }
    );
  }
);

test(
  "uses layer-qualified provider identity",
  () => {
    const north =
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 0,
        direction: "north",
        feature: {
          attributes: {
            OBJECTID: 1,
          },
        },
        distanceMeters: 10,
      });

    const south =
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 1,
        direction: "south",
        feature: {
          attributes: {
            OBJECTID: 1,
          },
        },
        distanceMeters: 10,
      });

    assert.equal(
      north?.providerFeatureId,
      "0:1"
    );

    assert.equal(
      south?.providerFeatureId,
      "1:1"
    );

    assert.notEqual(
      north?.providerFeatureId,
      south?.providerFeatureId
    );
  }
);

test(
  "normalizes blank NAME and TYPE to null",
  () => {
    const result =
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 1,
        direction: "south",

        feature: {
          attributes: {
            OBJECTID: 8,
            NAME: " ",
            TYPE: "   ",
          },
        },

        distanceMeters:
          44,
      });

    assert.equal(
      result?.routeName,
      null
    );

    assert.equal(
      result?.routeType,
      null
    );
  }
);

test(
  "preserves published east route TYPE",
  () => {
    const result =
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 2,
        direction: "east",

        feature: {
          attributes: {
            OBJECTID: 1,
            NAME:
              "TRAFFIC EVACUATION MANAGEMENT PLAN",
            TYPE:
              "NORTH-SOUTH ALTERNATIVE ROUTE",
          },
        },

        distanceMeters:
          250,
      });

    assert.equal(
      result?.routeType,
      "NORTH-SOUTH ALTERNATIVE ROUTE"
    );
  }
);

test(
  "rejects feature without OBJECTID",
  () => {
    assert.equal(
      mapCityOfCapeTownKoebergEvacuationFeature({
        layerId: 0,
        direction: "north",

        feature: {
          attributes: {
            NAME:
              "ATLANTIS CONTRA-FLOW",
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
  "selects true nearest polyline across layers",
  () => {
    const result =
      selectNearestCityOfCapeTownKoebergEvacuationFeature({
        latitude:
          -33.676,

        longitude:
          18.432,

        candidates: [
          {
            layerId: 0,
            direction: "north",

            feature: {
              attributes: {
                OBJECTID: 4,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.68,
                  longitude:
                    18.45,
                }),
            },
          },
          {
            layerId: 1,
            direction: "south",

            feature: {
              attributes: {
                OBJECTID: 19,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.6761,
                  longitude:
                    18.4321,
                }),
            },
          },
          {
            layerId: 2,
            direction: "east",

            feature: {
              attributes: {
                OBJECTID: 5,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.70,
                  longitude:
                    18.50,
                }),
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "1:19"
    );

    assert.equal(
      result?.direction,
      "south"
    );
  }
);

test(
  "uses stable layer-qualified identity tie break",
  () => {
    const result =
      selectNearestCityOfCapeTownKoebergEvacuationFeature({
        latitude:
          -33.676,

        longitude:
          18.432,

        candidates: [
          {
            layerId: 2,
            direction: "east",

            feature: {
              attributes: {
                OBJECTID: 1,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.676,
                  longitude:
                    18.432,
                }),
            },
          },
          {
            layerId: 0,
            direction: "north",

            feature: {
              attributes: {
                OBJECTID: 1,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.676,
                  longitude:
                    18.432,
                }),
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "0:1"
    );
  }
);

test(
  "skips malformed polyline geometry",
  () => {
    const result =
      selectNearestCityOfCapeTownKoebergEvacuationFeature({
        latitude:
          -33.676,

        longitude:
          18.432,

        candidates: [
          {
            layerId: 0,
            direction: "north",

            feature: {
              attributes: {
                OBJECTID: 1,
              },

              geometry: {
                paths:
                  "invalid",
              },
            },
          },
          {
            layerId: 2,
            direction: "east",

            feature: {
              attributes: {
                OBJECTID: 4,
              },

              geometry:
                pointPath({
                  latitude:
                    -33.6762,
                  longitude:
                    18.4322,
                }),
            },
          },
        ],
      });

    assert.equal(
      result?.providerFeatureId,
      "2:4"
    );
  }
);

test(
  "invalid coordinates do not call City layers",
  async () => {
    const originalFetch =
      globalThis.fetch;

    let calls =
      0;

    globalThis.fetch =
      async () => {
        calls += 1;

        throw new Error(
          "fetch should not run"
        );
      };

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
          latitude: 999,
          longitude: 18.4,
        }),
        null
      );

      assert.equal(
        calls,
        0
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "queries all three evacuation direction layers",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const urls = [];

    globalThis.fetch =
      async (url) => {
        urls.push(
          String(url)
        );

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
      const result =
        await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
          latitude: -33.676,
          longitude: 18.432,
        });

      assert.equal(
        result,
        null
      );

      assert.equal(
        urls.length,
        3
      );

      const paths =
        urls.map(
          (value) =>
            new URL(value).pathname
        );

      assert.ok(
        paths.some(
          (path) =>
            path.endsWith(
              "/Safety_Security/MapServer/0/query"
            )
        )
      );

      assert.ok(
        paths.some(
          (path) =>
            path.endsWith(
              "/Safety_Security/MapServer/1/query"
            )
        )
      );

      assert.ok(
        paths.some(
          (path) =>
            path.endsWith(
              "/Safety_Security/MapServer/2/query"
            )
        )
      );

      for (const value of urls) {
        const parsed =
          new URL(value);

        assert.equal(
          parsed.searchParams.get(
            "geometry"
          ),
          "18.432,-33.676"
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
            "outSR"
          ),
          "4326"
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
          "OBJECTID,NAME,TYPE"
        );

        assert.equal(
          parsed.searchParams.get(
            "returnGeometry"
          ),
          "true"
        );
      }
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "selects globally nearest returned feature",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async (url) => {
        const pathname =
          new URL(
            String(url)
          ).pathname;

        if (
          pathname.endsWith(
            "/0/query"
          )
        ) {
          return {
            ok: true,

            async json() {
              return {
                features: [
                  {
                    attributes: {
                      OBJECTID: 4,
                      NAME: " ",
                      TYPE: " ",
                    },

                    geometry:
                      pointPath({
                        latitude:
                          -33.69,
                        longitude:
                          18.45,
                      }),
                  },
                ],
              };
            },
          };
        }

        if (
          pathname.endsWith(
            "/1/query"
          )
        ) {
          return {
            ok: true,

            async json() {
              return {
                features: [
                  {
                    attributes: {
                      OBJECTID: 19,
                      NAME: " ",
                      TYPE: " ",
                    },

                    geometry:
                      pointPath({
                        latitude:
                          -33.6761,
                        longitude:
                          18.4321,
                      }),
                  },
                ],
              };
            },
          };
        }

        return {
          ok: true,

          async json() {
            return {
              features: [
                {
                  attributes: {
                    OBJECTID: 5,
                    NAME: " ",
                    TYPE: " ",
                  },

                  geometry:
                    pointPath({
                      latitude:
                        -33.72,
                      longitude:
                        18.50,
                    }),
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
          latitude:
            -33.676,

          longitude:
            18.432,
        });

      assert.equal(
        result?.providerFeatureId,
        "1:19"
      );

      assert.equal(
        result?.direction,
        "south"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "one unavailable City layer does not prevent another layer resolving",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn = () => {};

    globalThis.fetch =
      async (url) => {
        const pathname =
          new URL(
            String(url)
          ).pathname;

        if (
          pathname.endsWith(
            "/0/query"
          )
        ) {
          throw new Error(
            "north unavailable"
          );
        }

        if (
          pathname.endsWith(
            "/1/query"
          )
        ) {
          return {
            ok: false,
            status: 503,
            statusText:
              "Unavailable",
          };
        }

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
                    NAME: " ",
                    TYPE: "Road",
                  },

                  geometry:
                    pointPath({
                      latitude:
                        -33.6761,
                      longitude:
                        18.4321,
                    }),
                },
              ],
            };
          },
        };
      };

    try {
      const result =
        await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
          latitude:
            -33.676,

          longitude:
            18.432,
        });

      assert.equal(
        result?.providerFeatureId,
        "2:4"
      );

      assert.equal(
        result?.direction,
        "east"
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
  "caps explicit search radius at 25000 metres",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const urls = [];

    globalThis.fetch =
      async (url) => {
        urls.push(
          String(url)
        );

        return {
          ok: true,

          async json() {
            return {
              features: [],
            };
          },
        };
      };

    try {
      await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
        latitude:
          -33.676,

        longitude:
          18.432,

        searchRadiusMeters:
          999999,
      });

      assert.equal(
        urls.length,
        3
      );

      for (const value of urls) {
        assert.equal(
          new URL(value)
            .searchParams
            .get("distance"),
          "25000"
        );
      }
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "supports independent north south and east URL overrides",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalNorth =
      process.env
        .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL;

    const originalSouth =
      process.env
        .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL;

    const originalEast =
      process.env
        .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL;

    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL =
      "https://example.test/north/query";

    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL =
      "https://example.test/south/query";

    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL =
      "https://example.test/east/query";

    const urls = [];

    globalThis.fetch =
      async (url) => {
        urls.push(
          String(url)
        );

        return {
          ok: true,

          async json() {
            return {
              features: [],
            };
          },
        };
      };

    try {
      await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
        latitude:
          -33.676,

        longitude:
          18.432,
      });

      assert.ok(
        urls.some(
          (url) =>
            url.startsWith(
              "https://example.test/north/query?"
            )
        )
      );

      assert.ok(
        urls.some(
          (url) =>
            url.startsWith(
              "https://example.test/south/query?"
            )
        )
      );

      assert.ok(
        urls.some(
          (url) =>
            url.startsWith(
              "https://example.test/east/query?"
            )
        )
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalNorth ===
        undefined
      ) {
        delete process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL =
          originalNorth;
      }

      if (
        originalSouth ===
        undefined
      ) {
        delete process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL =
          originalSouth;
      }

      if (
        originalEast ===
        undefined
      ) {
        delete process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL;
      } else {
        process.env
          .CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL =
          originalEast;
      }
    }
  }
);

test(
  "all unavailable layers fail open to null",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalWarn =
      console.warn;

    console.warn = () => {};

    globalThis.fetch =
      async () => {
        throw new Error(
          "service unavailable"
        );
      };

    try {
      assert.equal(
        await resolveCityOfCapeTownKoebergEvacuationDirectionContext({
          latitude:
            -33.676,

          longitude:
            18.432,
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
