import assert from "node:assert/strict";

import {
  normalizeTomTomResponse,
} from "../lib/routing/tomTomRouting";

const response = {
  routes: [
    {
      summary: {
        lengthInMeters: 15250,
        travelDurationInSeconds: 1200,
        trafficDelayDurationInSeconds: 180,
        trafficLengthInMeters: 4200,
      },
      path: {
        type: "LineString",
        coordinates: [
          [
            18.587368,
            -33.946139,
          ] as [number, number],
          [
            18.59,
            -33.947,
          ] as [number, number],
          [
            18.6,
            -33.95,
          ] as [number, number],
          [
            18.61,
            -33.96,
          ] as [number, number],
        ],
      },
      legs: [
        {
          summary: {
            lengthInMeters: 15250,
            travelDurationInSeconds: 1200,
            trafficDelayDurationInSeconds: 180,
          },
          path: {
            type: "LineString",
            coordinates: [
              [
                18.587368,
                -33.946139,
              ] as [number, number],
              [
                18.61,
                -33.96,
              ] as [number, number],
            ],
          },
        },
      ],
      instructions: [
        {
          routeOffsetInMeters: 0,
          maneuver: "depart",
          message:
            "Head southeast on Example Road.",
          nextRoadInformation: {
            roadNames: [
              {
                identifier: {
                  text:
                    "Example Road",
                },
                source:
                  "road",
              },
            ],
            roadNumbers: [],
          },
          drivingSide:
            "left",
        },
        {
          routeOffsetInMeters: 2500,
          maneuver:
            "turnRight",
          message:
            "Turn right onto the N2 toward Cape Town.",
          previousRoadInformation: {
            roadNames: [
              {
                identifier: {
                  text:
                    "Example Road",
                },
              },
            ],
          },
          nextRoadInformation: {
            roadNumbers: [
              {
                identifier: {
                  text:
                    "N2",
                },
                source:
                  "signpost",
              },
            ],
            roadNames: [],
          },
          signpost: {
            exitNumber: {
              text:
                "16",
            },
            towardName: {
              text:
                "Cape Town",
            },
          },
          changeOfAngleInDegrees:
            90,
          maneuverView: {
            onRouteAngle:
              "right",
            offRouteAngles: [
              "straight",
              "left",
            ],
          },
          drivingSide:
            "left",
          landmark:
            "atTrafficLight",
        },
        {
          routeOffsetInMeters:
            12000,
          maneuver:
            "keepLeft",
          message:
            "Keep left toward Airport Approach Road.",
          nextRoadInformation: {
            roadNames: [
              {
                identifier: {
                  text:
                    "Airport Approach Road",
                },
              },
            ],
          },
          signpost: {
            towardName: {
              text:
                "Cape Town International Airport",
            },
          },
          maneuverView: {
            onRouteAngle:
              "slightLeft",
            offRouteAngles: [
              "straight",
            ],
          },
          drivingSide:
            "left",
        },
      ],
    },
  ],
};

const result =
  normalizeTomTomResponse(
    response,
    "fast",
  );

assert.equal(
  result.provider,
  "tomtom_orbis_routing_v3",
);

assert.equal(
  result.routes.length,
  1,
);

const route =
  result.routes[0];

assert.equal(
  route.distanceMeters,
  15250,
);

assert.equal(
  route.durationSeconds,
  1200,
);

assert.equal(
  route.trafficDelaySeconds,
  180,
);

assert.equal(
  route.baseDurationSeconds,
  1020,
);

assert.equal(
  route.routePointCount,
  4,
);

assert.deepEqual(
  route.routePoints[0],
  {
    latitude:
      -33.946139,
    longitude:
      18.587368,
  },
);

assert.deepEqual(
  route.routePoints[3],
  {
    latitude:
      -33.96,
    longitude:
      18.61,
  },
);

assert.equal(
  route.navigationInstructions
    .length,
  3,
);

assert.equal(
  route.navigationInstructions[0]
    .action,
  "depart",
);

assert.equal(
  route.navigationInstructions[0]
    .roadLabel,
  "Example Road",
);

assert.equal(
  route.navigationInstructions[1]
    .action,
  "turnRight",
);

assert.equal(
  route.navigationInstructions[1]
    .roadLabel,
  "N2",
);

assert.equal(
  route.navigationInstructions[1]
    .towardLabel,
  "Cape Town",
);

assert.equal(
  route.navigationInstructions[1]
    .exitNumber,
  "16",
);

assert.equal(
  route.navigationInstructions[2]
    .action,
  "keepLeft",
);

assert.equal(
  route.navigationInstructions[2]
    .roadLabel,
  "Airport Approach Road",
);

assert.equal(
  route.navigationTurnByTurnActions
    .length,
  3,
);

const turn =
  route.navigationTurnByTurnActions[1];

assert.equal(
  turn.action,
  "turnRight",
);

assert.equal(
  turn.direction,
  "right",
);

assert.equal(
  turn.turnAngle,
  90,
);

assert.equal(
  turn.currentRoad?.name,
  "Example Road",
);

assert.equal(
  turn.nextRoad?.number,
  "N2",
);

assert.deepEqual(
  turn.exitNumbers,
  [
    "16",
  ],
);

assert.equal(
  turn.drivingSide,
  "left",
);

assert.equal(
  turn.landmark,
  "atTrafficLight",
);

assert.equal(
  turn.maneuverView
    ?.onRouteAngle,
  "right",
);

const laneManeuverProbe =
  normalizeTomTomResponse(
    {
      routes: [
        {
          summary: {
            lengthInMeters: 1000,
            travelDurationInSeconds: 120,
          },
          instructions: [
            {
              routeOffsetInMeters: 100,
              maneuver: "keepLeft",
            },
            {
              routeOffsetInMeters: 200,
              maneuver: "keepRight",
            },
            {
              routeOffsetInMeters: 300,
              maneuver: "mergeLeftLane",
            },
            {
              routeOffsetInMeters: 400,
              maneuver: "mergeRightLane",
            },
            {
              routeOffsetInMeters: 500,
              maneuver: "turnLeft",
            },
          ],
        },
      ],
    },
    "fast",
  );

assert.deepEqual(
  laneManeuverProbe.routes[0]
    .navigationInstructions.map(
      (instruction) =>
        instruction.maneuverGuidance,
    ),
  [
    "keepLeft",
    "keepRight",
    "mergeLeftLane",
    "mergeRightLane",
    null,
  ],
);

assert.deepEqual(
  laneManeuverProbe.routes[0]
    .navigationTurnByTurnActions.map(
      (instruction) =>
        instruction.maneuverGuidance,
    ),
  [
    "keepLeft",
    "keepRight",
    "mergeLeftLane",
    "mergeRightLane",
    null,
  ],
);

assert.equal(
  route.navigationInstructions[2]
    .maneuverGuidance,
  "keepLeft",
);

assert.equal(
  route.navigationTurnByTurnActions[2]
    .maneuverGuidance,
  "keepLeft",
);

console.log(
  "ORBIS_V3_MANEUVER_GUIDANCE=PASS",
);

console.log(
  "PHYSICAL_LANE_TOPOLOGY_INVENTED=false",
);

console.log(
  "ORBIS_V3_SUMMARY_FIELDS=PASS",
);

console.log(
  "ORBIS_V3_GEOJSON_PATH=PASS",
);

console.log(
  "ORBIS_V3_GEOJSON_TUPLES=PASS",
);

console.log(
  "ORBIS_V3_STRUCTURED_ROAD_INFO=PASS",
);

console.log(
  "ORBIS_V3_STRUCTURED_SIGNPOST=PASS",
);

console.log(
  "ORBIS_V3_CAMEL_CASE_MANEUVERS=PASS",
);

console.log(
  "ORBIS_V3_MANEUVER_VIEW=PASS",
);

console.log(
  "LANE_DATA_INVENTED=false",
);

console.log(
  "TOMTOM_ORBIS_V3_NORMALIZER=PASS",
);
