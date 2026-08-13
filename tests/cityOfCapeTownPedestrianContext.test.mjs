import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCityOfCapeTownPedestrianCrossingFeature,
  resolveCityOfCapeTownPedestrianContext,
  selectNearestCityPedestrianCrossing,
} from "../lib/road-context/providers/cityOfCapeTownPedestrianContext.ts";

function feature({
  id = 1,
  globalId = "{TEST-GLOBAL-ID}",
  ownership = "CoCT",
  statusCode = 1,
  raised = 0,
  latitude = -33.928691209372268,
  longitude = 18.424643548305873,
} = {}) {
  return {
    attributes: {
      OBJECTID: id,
      GlobalID: globalId,
      OWNRSHP: ownership,
      SAP_USR_STS: statusCode,
      RAISED: raised,
    },
    geometry: {
      x: longitude,
      y: latitude,
    },
  };
}

test("maps canonical pedestrian crossing context", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature(),
      distanceMeters: 12.4,
    });

  assert.deepEqual(result, {
    provider: "city_of_cape_town",
    featureType: "pedestrian_crossing",
    providerFeatureId: "{TEST-GLOBAL-ID}",
    ownership: "CoCT",
    statusCode: 1,
    raised: false,
    latitude: -33.928691209372268,
    longitude: 18.424643548305873,
    distanceMeters: 12,
  });
});

test("maps raised pedestrian crossing", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature({ raised: 1 }),
      distanceMeters: 5,
    });

  assert.equal(result?.raised, true);
});

test("maps unknown raised value to null", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature({ raised: 2 }),
      distanceMeters: 5,
    });

  assert.equal(result?.raised, null);
});

test("normalizes blank ownership to null", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature({ ownership: "   " }),
      distanceMeters: 5,
    });

  assert.equal(result?.ownership, null);
});

test("falls back to OBJECTID when GlobalID is blank", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature({ globalId: " ", id: 77 }),
      distanceMeters: 5,
    });

  assert.equal(result?.providerFeatureId, "77");
});

test("rejects invalid coordinates", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature({ latitude: 999 }),
      distanceMeters: 5,
    });

  assert.equal(result, null);
});

test("rejects negative distance", () => {
  const result =
    mapCityOfCapeTownPedestrianCrossingFeature({
      feature: feature(),
      distanceMeters: -1,
    });

  assert.equal(result, null);
});

test("selects nearest crossing", () => {
  const result = selectNearestCityPedestrianCrossing({
    latitude: -33.928691209372268,
    longitude: 18.424643548305873,
    searchRadiusMeters: 250,
    features: [
      feature({
        globalId: "{FAR}",
        latitude: -33.9292,
      }),
      feature({
        globalId: "{NEAR}",
        latitude: -33.9287,
      }),
    ],
  });

  assert.equal(result?.providerFeatureId, "{NEAR}");
});

test("returns null when no crossing is inside radius", () => {
  const result = selectNearestCityPedestrianCrossing({
    latitude: -33.928691209372268,
    longitude: 18.424643548305873,
    searchRadiusMeters: 10,
    features: [
      feature({ latitude: -33.93 }),
    ],
  });

  assert.equal(result, null);
});

test("queries City pedestrian crossing Layer 9", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify({
        features: [feature()],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  try {
    const result =
      await resolveCityOfCapeTownPedestrianContext({
        latitude: -33.928691209372268,
        longitude: 18.424643548305873,
      });

    assert.match(
      requestedUrl,
      /FeatureServer\/9\/query/
    );

    assert.equal(
      result?.featureType,
      "pedestrian_crossing"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses deterministic identity tie break", () => {
  const latitude = -33.928691209372268;
  const longitude = 18.424643548305873;

  const result = selectNearestCityPedestrianCrossing({
    latitude,
    longitude,
    searchRadiusMeters: 250,
    features: [
      feature({
        globalId: "{Z-CROSSING}",
        latitude,
        longitude,
      }),
      feature({
        globalId: "{A-CROSSING}",
        latitude,
        longitude,
      }),
    ],
  });

  assert.equal(
    result?.providerFeatureId,
    "{A-CROSSING}"
  );
});

test("invalid resolver coordinates do not call ArcGIS", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;

    throw new Error(
      "fetch should not be called for invalid coordinates"
    );
  };

  try {
    const result =
      await resolveCityOfCapeTownPedestrianContext({
        latitude: 999,
        longitude: 18.424643548305873,
      });

    assert.equal(result, null);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HTTP failure fails open to null", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        message: "Service unavailable",
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  try {
    const result =
      await resolveCityOfCapeTownPedestrianContext({
        latitude: -33.928691209372268,
        longitude: 18.424643548305873,
      });

    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ArcGIS errors fail open to null", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 500,
          message: "ArcGIS failure",
          details: [
            "Pedestrian crossing layer unavailable",
          ],
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  try {
    const result =
      await resolveCityOfCapeTownPedestrianContext({
        latitude: -33.928691209372268,
        longitude: 18.424643548305873,
      });

    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
