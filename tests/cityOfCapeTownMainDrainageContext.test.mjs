import test from "node:test";
import assert from "node:assert/strict";

import {
  mapCityOfCapeTownMainDrainageFeature,
  selectNearestCityMainDrainageFeature,
  resolveCityOfCapeTownMainDrainageContext,
} from "../lib/environmental-context/providers/cityOfCapeTownMainDrainage.ts";

test("maps City main-drainage culvert attributes", () => {
  const result =
    mapCityOfCapeTownMainDrainageFeature({
      feature: {
        attributes: {
          OBJECTID: 43245,
          CM_ID: "CULV_577",
          TYPE: "CULV",
          CRS_SCTN: "Unspecified",
          MTRL: "Unspecified",
          NMNL_DMTR: -3,
          INTL_DMTR: -3,
          WDTH: 0,
          HGHT: 0,
          UPST_INVT_LVL: 0,
          DWNS_INVT_LVL: 0,
          GRNT: null,
          CRSG: "N",
          LINK_FCN: "NA",
          INTG_URB_DRNG: "MR",
          DATE_CNST: null,
          LCTN_DSCR:
            "PRINCESS STREET HOUT BAY",
          CTMT: "HBay",
          DSTR: 8,
          PLNG_RGN: "S",
          CMNT: "",
          SAP_OBJ_TYPE: "ZT018",
          SAP_DESCR:
            "PRINCESS STREET HOUT BAY",
          SAP_USR_STS: 1,
          FIN_KEY: "STW000007094",
          SYNC_DATE: 1725578504000,
          OWNRSHP: "CoCT - CSRM",
          MNT_AUTH: "CoCT",
        },
      },

      distanceMeters:
        13.7,
    });

  assert.equal(
    result?.provider,
    "city_of_cape_town"
  );

  assert.equal(
    result?.providerFeatureId,
    "CULV_577"
  );

  assert.equal(
    result?.assetType,
    "CULV"
  );

  assert.equal(
    result?.locationDescription,
    "PRINCESS STREET HOUT BAY"
  );

  assert.equal(
    result?.catchment,
    "HBay"
  );

  assert.equal(
    result?.nominalDiameterMm,
    null
  );

  assert.equal(
    result?.ownership,
    "CoCT - CSRM"
  );

  assert.equal(
    result?.maintenanceAuthority,
    "CoCT"
  );

  assert.equal(
    result?.distanceMeters,
    14
  );
});

test("maps City main-drainage pipe dimensions", () => {
  const result =
    mapCityOfCapeTownMainDrainageFeature({
      feature: {
        attributes: {
          OBJECTID: 43312,
          CM_ID: "PIPE_154878",
          TYPE: "PIPE",
          CRS_SCTN: "Circular",
          NMNL_DMTR: 600,
          INTL_DMTR: 0,
          WDTH: -3,
          HGHT: -3,
          CTMT: "HBay",
          OWNRSHP: "CoCT - CSRM",
          MNT_AUTH: "CoCT",
        },
      },

      distanceMeters:
        4.2,
    });

  assert.equal(
    result?.assetType,
    "PIPE"
  );

  assert.equal(
    result?.crossSection,
    "Circular"
  );

  assert.equal(
    result?.nominalDiameterMm,
    600
  );

  assert.equal(
    result?.internalDiameterMm,
    0
  );

  assert.equal(
    result?.widthMm,
    null
  );

  assert.equal(
    result?.heightMm,
    null
  );
});

test("falls back to OBJECTID when CM_ID is unavailable", () => {
  const result =
    mapCityOfCapeTownMainDrainageFeature({
      feature: {
        attributes: {
          OBJECTID: 99,
          TYPE: "PIPE",
        },
      },

      distanceMeters:
        5,
    });

  assert.equal(
    result?.providerFeatureId,
    "99"
  );
});

test("normalizes negative sentinel dimensions to null", () => {
  const result =
    mapCityOfCapeTownMainDrainageFeature({
      feature: {
        attributes: {
          CM_ID: "PIPE_TEST",
          TYPE: "PIPE",
          NMNL_DMTR: -3,
          INTL_DMTR: -1,
          WDTH: -3,
          HGHT: -3,
        },
      },

      distanceMeters:
        5,
    });

  assert.equal(
    result?.nominalDiameterMm,
    null
  );

  assert.equal(
    result?.internalDiameterMm,
    null
  );

  assert.equal(
    result?.widthMm,
    null
  );

  assert.equal(
    result?.heightMm,
    null
  );
});

test("returns null for unusable attributes", () => {
  assert.equal(
    mapCityOfCapeTownMainDrainageFeature({
      feature: {
        attributes: {},
      },

      distanceMeters:
        10,
    }),
    null
  );
});

test("selects the true nearest drainage polyline", () => {
  const result =
    selectNearestCityMainDrainageFeature({
      latitude:
        -34.0,

      longitude:
        18.35,

      features: [
        {
          attributes: {
            OBJECTID: 1,
            CM_ID: "FAR",
            TYPE: "PIPE",
          },

          geometry: {
            paths: [
              [
                [
                  18.36,
                  -34.01,
                ],
                [
                  18.36,
                  -33.99,
                ],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 2,
            CM_ID: "NEAR",
            TYPE: "CULV",
          },

          geometry: {
            paths: [
              [
                [
                  18.3501,
                  -34.01,
                ],
                [
                  18.3501,
                  -33.99,
                ],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "NEAR"
  );

  assert.equal(
    result?.assetType,
    "CULV"
  );

  assert.ok(
    result.distanceMeters < 20
  );
});

test("uses stable feature identity tie break", () => {
  const result =
    selectNearestCityMainDrainageFeature({
      latitude:
        -34.0,

      longitude:
        18.35,

      features: [
        {
          attributes: {
            OBJECTID: 2,
            CM_ID: "PIPE-B",
            TYPE: "PIPE",
          },

          geometry: {
            paths: [
              [
                [
                  18.35,
                  -34.01,
                ],
                [
                  18.35,
                  -33.99,
                ],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 1,
            CM_ID: "PIPE-A",
            TYPE: "PIPE",
          },

          geometry: {
            paths: [
              [
                [
                  18.35,
                  -34.01,
                ],
                [
                  18.35,
                  -33.99,
                ],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.providerFeatureId,
    "PIPE-A"
  );
});

test("skips malformed drainage geometry", () => {
  const result =
    selectNearestCityMainDrainageFeature({
      latitude:
        -34.0,

      longitude:
        18.35,

      features: [
        {
          attributes: {
            CM_ID: "BROKEN",
            TYPE: "PIPE",
          },

          geometry: {
            paths: "invalid",
          },
        },

        {
          attributes: {
            CM_ID: "VALID",
            TYPE: "CULV",
          },

          geometry: {
            paths: [
              [
                [
                  18.35,
                  -34.01,
                ],
                [
                  18.35,
                  -33.99,
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

test("invalid coordinates do not call ArcGIS", async () => {
  const originalFetch =
    globalThis.fetch;

  let fetchCalled =
    false;

  globalThis.fetch =
    async () => {
      fetchCalled = true;

      throw new Error(
        "fetch should not run"
      );
    };

  try {
    const result =
      await resolveCityOfCapeTownMainDrainageContext({
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

test("fails open when City drainage service is unavailable", async () => {
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
      await resolveCityOfCapeTownMainDrainageContext({
        latitude:
          -34.0,

        longitude:
          18.35,
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
