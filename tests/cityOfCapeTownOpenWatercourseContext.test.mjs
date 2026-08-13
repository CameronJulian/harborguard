import test from "node:test";
import assert from "node:assert/strict";

import {
  mapCityOfCapeTownOpenWatercourseFeature,
  selectNearestCityOpenWatercourseFeature,
  resolveCityOfCapeTownOpenWatercourseContext,
} from "../lib/environmental-context/providers/cityOfCapeTownOpenWatercourse.ts";

test("maps City open-watercourse attributes", () => {
  const result =
    mapCityOfCapeTownOpenWatercourseFeature({
      feature: {
        attributes: {
          OBJECTID: 1,
          CM_ID: "NTRL_3692",
          TYPE: "NTRL",
          CHNL_MTRL:
            "Unspecified",
          FDPN_MTRL:
            "Unspecified",
          GRNT: 0.014,
          STS:
            "Unspecified",
          STRM_ORDR: 2,
          RVR_NAME:
            "JAKKALSVLEI",
          OWC_CLS:
            "Main River",
          OWC_DSCR:
            "natural stream",
          CTMT:
            "Salt",
          OWNRSHP:
            "CoCT - CSRM",
          MNT_AUTH:
            "CoCT",
        },
      },

      distanceMeters:
        14.6,
    });

  assert.deepEqual(
    result,
    {
      provider:
        "city_of_cape_town",

      providerFeatureId:
        "NTRL_3692",

      riverName:
        "JAKKALSVLEI",

      watercourseType:
        "NTRL",

      classification:
        "Main River",

      description:
        "natural stream",

      channelMaterial:
        "Unspecified",

      floodplainMaterial:
        "Unspecified",

      gradient:
        0.014,

      status:
        "Unspecified",

      streamOrder:
        2,

      catchment:
        "Salt",

      ownership:
        "CoCT - CSRM",

      maintenanceAuthority:
        "CoCT",

      distanceMeters:
        15,
    }
  );
});

test("falls back to OBJECTID when CM_ID is unavailable", () => {
  const result =
    mapCityOfCapeTownOpenWatercourseFeature({
      feature: {
        attributes: {
          OBJECTID: 42,
          RVR_NAME:
            "Sample River",
        },
      },

      distanceMeters:
        20,
    });

  assert.equal(
    result?.providerFeatureId,
    "42"
  );
});

test("normalizes blank optional strings", () => {
  const result =
    mapCityOfCapeTownOpenWatercourseFeature({
      feature: {
        attributes: {
          CM_ID:
            "NTRL_1",

          RVR_NAME:
            "   ",

          OWC_DSCR:
            "",

          CTMT:
            " ",
        },
      },

      distanceMeters:
        5,
    });

  assert.equal(
    result?.riverName,
    null
  );

  assert.equal(
    result?.description,
    null
  );

  assert.equal(
    result?.catchment,
    null
  );
});

test("returns null for unusable attributes", () => {
  assert.equal(
    mapCityOfCapeTownOpenWatercourseFeature({
      feature: {
        attributes: {},
      },

      distanceMeters:
        5,
    }),
    null
  );
});

test("selects the true nearest watercourse", () => {
  const result =
    selectNearestCityOpenWatercourseFeature({
      latitude:
        -33.9,

      longitude:
        18.4,

      features: [
        {
          attributes: {
            OBJECTID: 1,
            CM_ID:
              "FAR",
            RVR_NAME:
              "Far River",
          },

          geometry: {
            paths: [
              [
                [
                  18.41,
                  -33.91,
                ],
                [
                  18.41,
                  -33.89,
                ],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 2,
            CM_ID:
              "NEAR",
            RVR_NAME:
              "Near River",
          },

          geometry: {
            paths: [
              [
                [
                  18.4001,
                  -33.91,
                ],
                [
                  18.4001,
                  -33.89,
                ],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.riverName,
    "Near River"
  );

  assert.equal(
    result?.providerFeatureId,
    "NEAR"
  );

  assert.ok(
    typeof result
      ?.distanceMeters ===
      "number"
  );

  assert.ok(
    result.distanceMeters <
      20
  );
});

test("uses stable feature-id tie break", () => {
  const result =
    selectNearestCityOpenWatercourseFeature({
      latitude:
        -33.9,

      longitude:
        18.4,

      features: [
        {
          attributes: {
            OBJECTID: 2,
            CM_ID:
              "WATER-B",
          },

          geometry: {
            paths: [
              [
                [
                  18.4,
                  -33.91,
                ],
                [
                  18.4,
                  -33.89,
                ],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 1,
            CM_ID:
              "WATER-A",
          },

          geometry: {
            paths: [
              [
                [
                  18.4,
                  -33.91,
                ],
                [
                  18.4,
                  -33.89,
                ],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "WATER-A"
  );
});

test("skips malformed candidate geometry", () => {
  const result =
    selectNearestCityOpenWatercourseFeature({
      latitude:
        -33.9,

      longitude:
        18.4,

      features: [
        {
          attributes: {
            OBJECTID: 1,
            CM_ID:
              "BROKEN",
          },

          geometry: {
            paths:
              "invalid",
          },
        },

        {
          attributes: {
            OBJECTID: 2,
            CM_ID:
              "VALID",
            RVR_NAME:
              "Valid River",
          },

          geometry: {
            paths: [
              [
                [
                  18.4,
                  -33.91,
                ],
                [
                  18.4,
                  -33.89,
                ],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "VALID"
  );
});

test("returns null for invalid coordinates without fetching", async () => {
  const originalFetch =
    globalThis.fetch;

  let fetchCalled =
    false;

  globalThis.fetch =
    async () => {
      fetchCalled =
        true;

      throw new Error(
        "fetch should not run"
      );
    };

  try {
    const result =
      await resolveCityOfCapeTownOpenWatercourseContext({
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
      fetchCalled,
      false
    );
  } finally {
    globalThis.fetch =
      originalFetch;
  }
});

test("fails open when ArcGIS request fails", async () => {
  const originalFetch =
    globalThis.fetch;

  globalThis.fetch =
    async () => {
      throw new Error(
        "network unavailable"
      );
    };

  try {
    const result =
      await resolveCityOfCapeTownOpenWatercourseContext({
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