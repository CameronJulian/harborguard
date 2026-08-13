import test from "node:test";
import assert from "node:assert/strict";

import {
  mapCityOfCapeTownRoadFeature,
  selectNearestCityRoadFeature,
} from "../lib/road-context/providers/cityOfCapeTown.ts";

import {
  getPointToPolylineDistanceMeters,
} from "../lib/geo/getPointToPolylineDistanceMeters.ts";

test("maps City road centreline attributes", () => {
  const result =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 42,
        ROAD_NAME:
          "Vanguard Drive",
        SL_RCL_KEY:
          "RCL-123",
        TO_DRCT:
          "N B",
        FROM_DRCT:
          "S B",
        PROW_CLSF_CODE:
          "2",
        SPD_LMT:
          60,
        SPD_LMT_SRC:
          "Confirmed",
        SURF_TYPE:
          "Asphalt",
      },
    });

  assert.deepEqual(result, {
    provider:
      "city_of_cape_town",
    providerSegmentId:
      "RCL-123",
    roadName:
      "Vanguard Drive",
    roadClassification:
      "2",
    speedLimitKph:
      60,
    speedLimitSource:
      "Confirmed",
    direction:
      "S B / N B",
    surfaceType:
      "Asphalt",
    maintenanceAuthority: null,
    ownership: null,
    distanceMeters:
      null,
  });
});

test("maps rounded geometric distance", () => {
  const result =
    mapCityOfCapeTownRoadFeature(
      {
        attributes: {
          OBJECTID: 1,
          ROAD_NAME:
            "Main Road",
        },
      },
      12.6
    );

  assert.equal(
    result?.distanceMeters,
    13
  );
});

test("falls back to OBJECTID when RCL key is missing", () => {
  const result =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 98,
        ROAD_NAME:
          "Main Road",
      },
    });

  assert.equal(
    result?.providerSegmentId,
    "98"
  );
});

test("returns null for missing attributes", () => {
  assert.equal(
    mapCityOfCapeTownRoadFeature({}),
    null
  );
});

test("normalizes blank strings to null", () => {
  const result =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 1,
        ROAD_NAME: "   ",
        SPD_LMT_SRC: "",
        SURF_TYPE: " ",
      },
    });

  assert.equal(
    result?.roadName,
    null
  );

  assert.equal(
    result?.speedLimitSource,
    null
  );

  assert.equal(
    result?.surfaceType,
    null
  );
});

test("rejects unusable speed limits", () => {
  const zero =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 1,
        SPD_LMT: 0,
      },
    });

  const unrealistic =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 2,
        SPD_LMT: 500,
      },
    });

  assert.equal(
    zero?.speedLimitKph,
    null
  );

  assert.equal(
    unrealistic?.speedLimitKph,
    null
  );
});

test("uses one available direction", () => {
  const result =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 1,
        TO_DRCT: "N B",
        FROM_DRCT: null,
      },
    });

  assert.equal(
    result?.direction,
    "N B"
  );
});

test("distance is zero when point lies on segment", () => {
  const distance =
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.9,
        longitude: 18.4,
      },
      [
        [
          [18.39, -33.9],
          [18.41, -33.9],
        ],
      ]
    );

  assert.ok(
    distance !== null
  );

  assert.ok(
    distance < 0.01
  );
});

test("measures distance beside horizontal segment", () => {
  const distance =
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.899,
        longitude: 18.4,
      },
      [
        [
          [18.39, -33.9],
          [18.41, -33.9],
        ],
      ]
    );

  assert.ok(
    distance !== null
  );

  assert.ok(
    distance > 100 &&
    distance < 120
  );
});

test("measures distance beside vertical segment", () => {
  const distance =
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.9,
        longitude: 18.401,
      },
      [
        [
          [18.4, -33.91],
          [18.4, -33.89],
        ],
      ]
    );

  assert.ok(
    distance !== null
  );

  assert.ok(
    distance > 85 &&
    distance < 100
  );
});

test("uses nearest endpoint when projection lies outside segment", () => {
  const distance =
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.9,
        longitude: 18.42,
      },
      [
        [
          [18.39, -33.9],
          [18.4, -33.9],
        ],
      ]
    );

  assert.ok(
    distance !== null
  );

  assert.ok(
    distance > 1800 &&
    distance < 1900
  );
});

test("supports multiple ArcGIS paths", () => {
  const distance =
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.9,
        longitude: 18.4,
      },
      [
        [
          [18.0, -33.9],
          [18.1, -33.9],
        ],
        [
          [18.39, -33.9],
          [18.41, -33.9],
        ],
      ]
    );

  assert.ok(
    distance !== null
  );

  assert.ok(
    distance < 0.01
  );
});

test("returns null for empty geometry", () => {
  assert.equal(
    getPointToPolylineDistanceMeters(
      {
        latitude: -33.9,
        longitude: 18.4,
      },
      []
    ),
    null
  );
});

test("selects the true nearest road candidate", () => {
  const result =
    selectNearestCityRoadFeature({
      latitude: -33.9,
      longitude: 18.4,

      features: [
        {
          attributes: {
            OBJECTID: 1,
            ROAD_NAME:
              "Far Road",
            SL_RCL_KEY:
              "RCL-FAR",
          },

          geometry: {
            paths: [
              [
                [18.41, -33.91],
                [18.41, -33.89],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 99,
            ROAD_NAME:
              "Near Road",
            SL_RCL_KEY:
              "RCL-NEAR",
          },

          geometry: {
            paths: [
              [
                [18.4001, -33.91],
                [18.4001, -33.89],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.roadName,
    "Near Road"
  );

  assert.equal(
    result?.providerSegmentId,
    "RCL-NEAR"
  );

  assert.ok(
    typeof result?.distanceMeters ===
      "number"
  );

  assert.ok(
    result.distanceMeters <
      20
  );
});

test("uses stable segment ID tie break", () => {
  const result =
    selectNearestCityRoadFeature({
      latitude: -33.9,
      longitude: 18.4,

      features: [
        {
          attributes: {
            OBJECTID: 2,
            ROAD_NAME:
              "Road B",
            SL_RCL_KEY:
              "RCL-B",
          },

          geometry: {
            paths: [
              [
                [18.4, -33.91],
                [18.4, -33.89],
              ],
            ],
          },
        },

        {
          attributes: {
            OBJECTID: 1,
            ROAD_NAME:
              "Road A",
            SL_RCL_KEY:
              "RCL-A",
          },

          geometry: {
            paths: [
              [
                [18.4, -33.91],
                [18.4, -33.89],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.providerSegmentId,
    "RCL-A"
  );
});

test("skips malformed candidate geometry", () => {
  const result =
    selectNearestCityRoadFeature({
      latitude: -33.9,
      longitude: 18.4,

      features: [
        {
          attributes: {
            OBJECTID: 1,
            ROAD_NAME:
              "Broken Road",
          },

          geometry: {
            paths:
              "invalid",
          },
        },

        {
          attributes: {
            OBJECTID: 2,
            ROAD_NAME:
              "Valid Road",
          },

          geometry: {
            paths: [
              [
                [18.4, -33.91],
                [18.4, -33.89],
              ],
            ],
          },
        },
      ],
    });

  assert.equal(
    result?.roadName,
    "Valid Road"
  );
});

test("maps City road ownership and maintenance authority", () => {
  const result =
    mapCityOfCapeTownRoadFeature({
      attributes: {
        OBJECTID: 3,
        ROAD_NAME: "MAIN",
        SL_RCL_KEY: "RCL00000300",
        MNT_AUTH: "CoCT",
        OWNRSHP:
          "Western Cape Government",
      },
    });

  assert.equal(
    result?.maintenanceAuthority,
    "CoCT"
  );

  assert.equal(
    result?.ownership,
    "Western Cape Government"
  );

  assert.equal(
    result?.providerSegmentId,
    "RCL00000300"
  );
});