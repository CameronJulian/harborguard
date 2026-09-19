import assert from "node:assert/strict";

import {
  normalizeRoutingProfile,
  rankRoutes,
  scoreRouteRisk,
} from "../lib/routing/routeRiskRanking";

assert.equal(
  normalizeRoutingProfile(
    "safest",
  ),
  "safest",
);

assert.equal(
  normalizeRoutingProfile(
    "fastest",
  ),
  "fastest",
);

assert.equal(
  normalizeRoutingProfile(
    "balanced",
  ),
  "balanced",
);

assert.equal(
  normalizeRoutingProfile(
    "unknown",
  ),
  "safest",
);

const risk =
  scoreRouteRisk(
    [
      [
        -33.946139,
        18.587368,
      ],
    ],
    [
      {
        id:
          "segment-1",
        latitude:
          -33.946139,
        longitude:
          18.587368,
        radius_meters:
          150,
        risk_score:
          32,
        verification_count:
          0,
        last_event_at:
          new Date().toISOString(),
      },
    ],
  );

assert.equal(
  risk.matchedSegmentCount,
  1,
);

assert.deepEqual(
  risk.matchedSegmentIds,
  ["segment-1"],
);

assert.ok(
  risk.normalizedRiskScore >
    0,
);

assert.ok(
  risk.safetyScore <
    100,
);

const routes =
  [
    {
      index: 0,
      durationSeconds: 600,
      safetyScore: 50,
    },
    {
      index: 1,
      durationSeconds: 700,
      safetyScore: 90,
    },
    {
      index: 2,
      durationSeconds: 500,
      safetyScore: 30,
    },
  ];

const safest =
  rankRoutes(
    routes,
    "safest",
  );

assert.equal(
  safest[0].index,
  1,
);

assert.equal(
  safest[0].rank,
  1,
);

assert.equal(
  safest[0].isRecommended,
  true,
);

const fastest =
  rankRoutes(
    routes,
    "fastest",
  );

assert.equal(
  fastest[0].index,
  2,
);

const balanced =
  rankRoutes(
    routes,
    "balanced",
  );

assert.equal(
  balanced[0].index,
  1,
);

console.log(
  "ROUTE_RISK_SHARED_SCORER=PASS",
);

console.log(
  "ROUTE_RISK_SAFEST_RANKING=PASS",
);

console.log(
  "ROUTE_RISK_FASTEST_RANKING=PASS",
);

console.log(
  "ROUTE_RISK_BALANCED_RANKING=PASS",
);
