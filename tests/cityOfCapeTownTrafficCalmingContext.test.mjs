import test from "node:test";
import assert from "node:assert/strict";

import {
  mapCityOfCapeTownTrafficCalmingFeature,
  resolveCityOfCapeTownTrafficCalmingContext,
  selectNearestCityTrafficCalmingFeature,
} from "../lib/road-context/providers/cityOfCapeTownTrafficCalming.ts";

function feature({
  objectId = 1,
  globalId = "{GLOBAL-1}",
  ownership = "CoCT",
  statusCode = 1,
  longitude = 18.4,
  latitude = -33.9,
} = {}) {
  return {
    attributes: {
      OBJECTID: objectId,
      GlobalID: globalId,
      OWNRSHP: ownership,
      SAP_USR_STS: statusCode,
    },

    geometry: {
      x: longitude,
      y: latitude,
    },
  };
}

function jsonResponse(
  body,
  {
    ok = true,
    status = 200,
    statusText = "OK",
  } = {}
) {
  return {
    ok,
    status,
    statusText,

    async json() {
      return body;
    },
  };
}

test("maps a City speed bump feature", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature: feature({
        globalId:
          "{SPEED-BUMP-1}",

        longitude:
          18.568740579444921,

        latitude:
          -34.000830918413577,
      }),

      distanceMeters:
        42.6,
    });

  assert.deepEqual(result, {
    provider:
      "city_of_cape_town",

    featureType:
      "speed_bump",

    providerFeatureId:
      "{SPEED-BUMP-1}",

    ownership:
      "CoCT",

    statusCode:
      1,

    latitude:
      -34.000830918413577,

    longitude:
      18.568740579444921,

    distanceMeters:
      43,
  });
});

test("maps a raised intersection feature", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "raised_intersection",

      feature:
        feature({
          globalId:
            "{RAISED-1}",
        }),

      distanceMeters:
        10,
    });

  assert.equal(
    result?.featureType,
    "raised_intersection"
  );
});

test("prefers GlobalID for provider identity", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature:
        feature({
          objectId: 99,
          globalId:
            "{GLOBAL-99}",
        }),

      distanceMeters:
        5,
    });

  assert.equal(
    result?.providerFeatureId,
    "{GLOBAL-99}"
  );
});

test("falls back to OBJECTID when GlobalID is missing", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature:
        feature({
          objectId: 6048,
          globalId: null,
        }),

      distanceMeters:
        5,
    });

  assert.equal(
    result?.providerFeatureId,
    "6048"
  );
});

test("rejects feature without durable identity", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature:
        feature({
          objectId: null,
          globalId: null,
        }),

      distanceMeters:
        5,
    });

  assert.equal(
    result,
    null
  );
});

test("normalizes blank ownership to null", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature:
        feature({
          ownership: "   ",
        }),

      distanceMeters:
        5,
    });

  assert.equal(
    result?.ownership,
    null
  );
});

test("normalizes non-finite status code to null", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature:
        feature({
          statusCode:
            "not-a-number",
        }),

      distanceMeters:
        5,
    });

  assert.equal(
    result?.statusCode,
    null
  );
});

test("rejects malformed point geometry", () => {
  const result =
    mapCityOfCapeTownTrafficCalmingFeature({
      featureType:
        "speed_bump",

      feature: {
        attributes: {
          OBJECTID: 1,
        },

        geometry: {
          x: "invalid",
          y: -33.9,
        },
      },

      distanceMeters:
        5,
    });

  assert.equal(
    result,
    null
  );
});

test("selects nearest feature across both City layers", () => {
  const result =
    selectNearestCityTrafficCalmingFeature({
      latitude: -33.9,
      longitude: 18.4,

      searchRadiusMeters:
        250,

      layers: [
        {
          featureType:
            "speed_bump",

          features: [
            feature({
              globalId:
                "{FAR-BUMP}",

              longitude:
                18.402,
            }),
          ],
        },

        {
          featureType:
            "raised_intersection",

          features: [
            feature({
              globalId:
                "{NEAR-RAISED}",

              longitude:
                18.4001,
            }),
          ],
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "{NEAR-RAISED}"
  );

  assert.equal(
    result?.featureType,
    "raised_intersection"
  );
});

test("locally rejects ArcGIS candidate outside requested radius", () => {
  const result =
    selectNearestCityTrafficCalmingFeature({
      latitude: -33.9,
      longitude: 18.4,

      searchRadiusMeters:
        20,

      layers: [
        {
          featureType:
            "speed_bump",

          features: [
            feature({
              longitude:
                18.401,
            }),
          ],
        },
      ],
    });

  assert.equal(
    result,
    null
  );
});

test("uses deterministic identity tie break", () => {
  const result =
    selectNearestCityTrafficCalmingFeature({
      latitude: -33.9,
      longitude: 18.4,

      searchRadiusMeters:
        100,

      layers: [
        {
          featureType:
            "speed_bump",

          features: [
            feature({
              globalId:
                "{B}",
            }),

            feature({
              globalId:
                "{A}",
            }),
          ],
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "{A}"
  );
});

test("invalid resolver coordinates do not call ArcGIS", async () => {
  const originalFetch =
    globalThis.fetch;

  let calls = 0;

  globalThis.fetch =
    async () => {
      calls += 1;

      return jsonResponse({
        features: [],
      });
    };

  try {
    const result =
      await resolveCityOfCapeTownTrafficCalmingContext({
        latitude: 1000,
        longitude: 18.4,
      });

    assert.equal(
      result,
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
});

test("resolver queries both City traffic-calming layers", async () => {
  const originalFetch =
    globalThis.fetch;

  const urls = [];

  globalThis.fetch =
    async (input) => {
      urls.push(
        String(input)
      );

      return jsonResponse({
        features: [],
      });
    };

  try {
    const result =
      await resolveCityOfCapeTownTrafficCalmingContext({
        latitude:
          -34.0016,

        longitude:
          18.5668,

        searchRadiusMeters:
          250,
      });

    assert.equal(
      result,
      null
    );

    assert.equal(
      urls.length,
      2
    );

    assert.ok(
      urls.some(
        (url) =>
          url.includes(
            "/FeatureServer/7/query"
          )
      )
    );

    assert.ok(
      urls.some(
        (url) =>
          url.includes(
            "/FeatureServer/8/query"
          )
      )
    );
  } finally {
    globalThis.fetch =
      originalFetch;
  }
});

test("resolver returns nearest live-shaped City candidate", async () => {
  const originalFetch =
    globalThis.fetch;

  globalThis.fetch =
    async (input) => {
      const url =
        String(input);

      if (
        url.includes(
          "/FeatureServer/7/query"
        )
      ) {
        return jsonResponse({
          features: [
            {
              attributes: {
                OBJECTID:
                  6048,

                SAP_USR_STS:
                  1,

                OWNRSHP:
                  "CoCT",

                GlobalID:
                  "{2BAE926E-2FEC-4155-9A4C-FE4CD6677B53}",
              },

              geometry: {
                x:
                  18.568740579444921,

                y:
                  -34.000830918413577,
              },
            },
          ],
        });
      }

      return jsonResponse({
        features: [],
      });
    };

  try {
    const result =
      await resolveCityOfCapeTownTrafficCalmingContext({
        latitude:
          -34.0016,

        longitude:
          18.5668,

        searchRadiusMeters:
          250,
      });

    assert.equal(
      result?.featureType,
      "speed_bump"
    );

    assert.equal(
      result?.providerFeatureId,
      "{2BAE926E-2FEC-4155-9A4C-FE4CD6677B53}"
    );

    assert.equal(
      result?.ownership,
      "CoCT"
    );

    assert.equal(
      result?.statusCode,
      1
    );

    assert.ok(
      typeof result?.distanceMeters ===
        "number"
    );

    assert.ok(
      result.distanceMeters <=
        250
    );
  } finally {
    globalThis.fetch =
      originalFetch;
  }
});

test("one unavailable City layer does not suppress the other", async () => {
  const originalFetch =
    globalThis.fetch;

  globalThis.fetch =
    async (input) => {
      const url =
        String(input);

      if (
        url.includes(
          "/FeatureServer/7/query"
        )
      ) {
        return jsonResponse(
          {},
          {
            ok: false,
            status: 503,
            statusText:
              "Unavailable",
          }
        );
      }

      return jsonResponse({
        features: [
          feature({
            globalId:
              "{RAISED-SURVIVES}",

            longitude:
              18.4001,
          }),
        ],
      });
    };

  try {
    const result =
      await resolveCityOfCapeTownTrafficCalmingContext({
        latitude:
          -33.9,

        longitude:
          18.4,

        searchRadiusMeters:
          100,
      });

    assert.equal(
      result?.featureType,
      "raised_intersection"
    );

    assert.equal(
      result?.providerFeatureId,
      "{RAISED-SURVIVES}"
    );
  } finally {
    globalThis.fetch =
      originalFetch;
  }
});

test("ArcGIS errors fail open to null", async () => {
  const originalFetch =
    globalThis.fetch;

  globalThis.fetch =
    async () =>
      jsonResponse({
        error: {
          code: 500,
          message:
            "Synthetic ArcGIS error",
        },
      });

  try {
    const result =
      await resolveCityOfCapeTownTrafficCalmingContext({
        latitude:
          -33.9,

        longitude:
          18.4,
      });

    assert.equal(
      result,
      null
    );
  } finally {
    globalThis.fetch =
      originalFetch;
  }
});
