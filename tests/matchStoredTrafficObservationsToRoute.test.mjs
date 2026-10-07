import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath =
  path.resolve(
    process.cwd(),
    "lib/traffic/matchStoredTrafficObservationsToRoute.ts"
  );

const {
  MAX_ROUTE_TRAFFIC_DISTANCE_METERS,
  normalizeCandidateRoutePoints,
  matchStoredTrafficObservationsToRoute,
} = await import(
  pathToFileURL(modulePath).href
);

test(
  "normalizes HERE latitude longitude tuples",
  () => {
    assert.deepEqual(
      normalizeCandidateRoutePoints([
        [-33.9, 18.5],
        [-34.0, 18.6],
      ]),
      [
        [-33.9, 18.5],
        [-34.0, 18.6],
      ]
    );
  }
);

test(
  "normalizes TomTom route point objects",
  () => {
    assert.deepEqual(
      normalizeCandidateRoutePoints([
        {
          latitude: -33.9,
          longitude: 18.5,
        },
        {
          latitude: -34.0,
          longitude: 18.6,
        },
      ]),
      [
        [-33.9, 18.5],
        [-34.0, 18.6],
      ]
    );
  }
);

test(
  "rejects malformed and invalid route points",
  () => {
    assert.deepEqual(
      normalizeCandidateRoutePoints([
        null,
        ["bad", 18.5],
        [91, 18.5],
        {
          latitude: -33.9,
          longitude: 181,
        },
      ]),
      []
    );
  }
);

test(
  "matches stored traffic geometry touching the candidate route",
  () => {
    const result =
      matchStoredTrafficObservationsToRoute(
        [
          [-33.9, 18.5],
          [-34.0, 18.6],
        ],
        [
          {
            providerSegmentId: "A",
            providerGeometry: {
              links: [
                {
                  points: [
                    {
                      lat: -33.9,
                      lng: 18.5,
                    },
                  ],
                },
              ],
            },
            road: "Road A",
            currentSpeed: 20,
            freeFlowSpeed: 60,
            congestion: 70,
            delayMinutes: 8,
            confidence: 0.9,
            jamFactor: 8,
            observedAt:
              "2026-10-07T08:10:00.000Z",
          },
        ]
      );

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0]
        .providerSegmentId,
      "A"
    );

    assert.ok(
      result[0]
        .distanceFromRouteMeters <= 1
    );

    assert.equal(
      result[0].congestion,
      70
    );
  }
);

test(
  "works with TomTom route point object shape",
  () => {
    const result =
      matchStoredTrafficObservationsToRoute(
        [
          {
            latitude: -33.9,
            longitude: 18.5,
          },
        ],
        [
          {
            providerSegmentId: "A",
            providerGeometry: {
              links: [
                {
                  points: [
                    {
                      lat: -33.9,
                      lng: 18.5,
                    },
                  ],
                },
              ],
            },
            road: "Road A",
            currentSpeed: 20,
            freeFlowSpeed: 60,
            congestion: 60,
            delayMinutes: 5,
            confidence: 0.9,
            jamFactor: 7,
            observedAt:
              "2026-10-07T08:10:00.000Z",
          },
        ]
      );

    assert.equal(
      result.length,
      1
    );
  }
);

test(
  "excludes stored traffic more than one kilometre from route",
  () => {
    const result =
      matchStoredTrafficObservationsToRoute(
        [
          [-33.9, 18.5],
        ],
        [
          {
            providerSegmentId: "far",
            providerGeometry: {
              links: [
                {
                  points: [
                    {
                      lat: -33.9,
                      lng: 18.52,
                    },
                  ],
                },
              ],
            },
            road: "Far Road",
            currentSpeed: 20,
            freeFlowSpeed: 60,
            congestion: 90,
            delayMinutes: 10,
            confidence: 1,
            jamFactor: 10,
            observedAt:
              "2026-10-07T08:10:00.000Z",
          },
        ]
      );

    assert.deepEqual(
      result,
      []
    );
  }
);

test(
  "uses one kilometre as default advisory route traffic ceiling",
  () => {
    assert.equal(
      MAX_ROUTE_TRAFFIC_DISTANCE_METERS,
      1000
    );
  }
);

test(
  "sorts matching observations nearest to route first",
  () => {
    const result =
      matchStoredTrafficObservationsToRoute(
        [
          [-33.9, 18.5],
        ],
        [
          {
            providerSegmentId: "near",
            providerGeometry: {
              links: [
                {
                  points: [
                    {
                      lat: -33.9,
                      lng: 18.5001,
                    },
                  ],
                },
              ],
            },
            road: "Near",
            currentSpeed: 30,
            freeFlowSpeed: 60,
            congestion: 40,
            delayMinutes: 3,
            confidence: 0.9,
            jamFactor: 5,
            observedAt:
              "2026-10-07T08:10:00.000Z",
          },
          {
            providerSegmentId: "less-near",
            providerGeometry: {
              links: [
                {
                  points: [
                    {
                      lat: -33.9,
                      lng: 18.505,
                    },
                  ],
                },
              ],
            },
            road: "Less Near",
            currentSpeed: 40,
            freeFlowSpeed: 60,
            congestion: 30,
            delayMinutes: 2,
            confidence: 0.8,
            jamFactor: 4,
            observedAt:
              "2026-10-07T08:10:00.000Z",
          },
        ]
      );

    assert.equal(
      result.length,
      2
    );

    assert.equal(
      result[0]
        .providerSegmentId,
      "near"
    );
  }
);

test(
  "fails closed for missing route geometry",
  () => {
    assert.deepEqual(
      matchStoredTrafficObservationsToRoute(
        [],
        []
      ),
      []
    );
  }
);
