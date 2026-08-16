import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowRouteEvidenceScope,
  ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
} from "../lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts";

const predictionCreatedAt =
  "2026-08-16T12:00:00+02:00";

const providerRoutePoints = [
  [-33.9, 18.4],
  [-33.89, 18.4],
  [-33.89, 18.41],
];

test("builds deterministic explicitly versioned provider-geometry scope", () => {
  const input = {
    routePoints:
      providerRoutePoints,
    scopeSource:
      "provider_geometry",
    predictionCreatedAt,
  };

  const first =
    buildRouteRiskShadowRouteEvidenceScope(input);
  const second =
    buildRouteRiskShadowRouteEvidenceScope(input);

  assert.deepEqual(first, second);
  assert.equal(
    first.scopeVersion,
    ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION
  );
  assert.equal(
    first.scopeSource,
    "provider_geometry"
  );
  assert.equal(
    first.predictionCreatedAt,
    "2026-08-16T10:00:00.000Z"
  );
});

test("distinguishes endpoint-only scope and preserves point order", () => {
  const routePoints = [
    [-33.9251234, 18.4249876],
    [-33.9012345, 18.5012345],
  ];

  const before =
    structuredClone(routePoints);

  const result =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints,
      scopeSource:
        "endpoint_only",
      predictionCreatedAt,
    });

  assert.equal(
    result.scopeSource,
    "endpoint_only"
  );
  assert.deepEqual(
    result.routePoints.map(
      (point) => [
        point.latitude,
        point.longitude,
      ]
    ),
    [
      [-33.925123, 18.424988],
      [-33.901235, 18.501234],
    ]
  );
  assert.deepEqual(routePoints, before);
});

test("uses deterministic Crowd-compatible segment and direction identity", () => {
  const result =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints:
        providerRoutePoints,
      scopeSource:
        "provider_geometry",
      predictionCreatedAt,
    });

  assert.deepEqual(
    result.routePoints.map(
      (point) => point.segmentKey
    ),
    [
      "-33.900:18.400",
      "-33.890:18.400",
      "-33.890:18.410",
    ]
  );

  assert.deepEqual(
    result.routeSegments,
    [
      {
        index: 0,
        fromPointIndex: 0,
        toPointIndex: 1,
        segmentKey:
          "-33.890:18.400",
        directionBucket: 0,
      },
      {
        index: 1,
        fromPointIndex: 1,
        toPointIndex: 2,
        segmentKey:
          "-33.890:18.410",
        directionBucket: 2,
      },
    ]
  );

  assert.deepEqual(
    result.identityContract
      .directionBucketLabels,
    [
      "N",
      "NE",
      "E",
      "SE",
      "S",
      "SW",
      "W",
      "NW",
    ]
  );
});

test("represents degenerate and unavailable route provenance without guessing", () => {
  const degenerate =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints: [
        [-33.9, 18.4],
        [-33.9, 18.4],
      ],
      scopeSource:
        "endpoint_only",
      predictionCreatedAt,
    });

  assert.equal(
    degenerate.routeSegments[0]
      .directionBucket,
    null
  );

  const unavailable =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints: [],
      scopeSource:
        "endpoint_only",
      predictionCreatedAt,
    });

  assert.equal(
    unavailable.scopeSource,
    "unavailable"
  );
  assert.equal(
    unavailable.unavailableReason,
    "insufficient_route_points"
  );
  assert.equal(
    unavailable.predictionCreatedAt,
    "2026-08-16T10:00:00.000Z"
  );
  assert.deepEqual(
    unavailable.routePoints,
    []
  );
});

test("route persists scope with existing evidence metadata and unchanged prediction", () => {
  const route = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  const persistence = fs.readFileSync(
    "lib/fleet/persistRouteRiskShadowPrediction.ts",
    "utf8"
  );
  const scopeHelper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts",
    "utf8"
  );
  const crowdExposure = fs.readFileSync(
    "lib/fleet/createAnonymousJourneyExposure.ts",
    "utf8"
  );

  const assessmentIndex = route.indexOf(
    "assessRouteRiskShadowEvidence({"
  );
  const scopeIndex = route.indexOf(
    "buildRouteRiskShadowRouteEvidenceScope({"
  );
  const persistenceIndex = route.indexOf(
    "await persistRouteRiskShadowPrediction({"
  );

  assert.ok(assessmentIndex >= 0);
  assert.ok(scopeIndex > assessmentIndex);
  assert.ok(persistenceIndex > scopeIndex);

  assert.match(
    route,
    /\.select\("id, created_at"\)/
  );
  assert.match(
    route,
    /predictionCreatedAt:\s*snapshot\.created_at/
  );
  assert.match(
    route,
    /metadata:\s*\{\s*evidenceSufficiency,\s*routeEvidenceScope,\s*\}/
  );
  assert.match(
    route,
    /decodedRoutePoints\.length > 0\s*\? "provider_geometry"\s*:\s*"endpoint_only"/
  );

  assert.match(
    persistence,
    /predicted_probability:\s*predictedProbability/
  );
  assert.doesNotMatch(
    persistence,
    /buildRouteRiskShadowRouteEvidenceScope/
  );

  for (const forbidden of [
    "crowd_segment_traversals",
    "crowd_segment_exposure_stats",
    ".from(",
    ".rpc(",
    "fetch(",
  ]) {
    assert.equal(
      scopeHelper.includes(forbidden),
      false
    );
  }

  assert.match(
    crowdExposure,
    /buildCrowdSegmentKey/
  );
  assert.match(
    crowdExposure,
    /resolveCrowdDirectionBucket/
  );

  const responseIndex = route.indexOf(
    "return NextResponse.json({",
    persistenceIndex
  );

  assert.ok(responseIndex > persistenceIndex);
  assert.doesNotMatch(
    route.slice(responseIndex),
    /routeEvidenceScope/
  );
});

test("scope construction cannot alter an existing model output", () => {
  const prediction = {
    predictedProbability: 0.82,
  };
  const before =
    structuredClone(prediction);

  buildRouteRiskShadowRouteEvidenceScope({
    routePoints:
      providerRoutePoints,
    scopeSource:
      "provider_geometry",
    predictionCreatedAt,
  });

  assert.deepEqual(prediction, before);
});
