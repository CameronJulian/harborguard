import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowCandidateCollection,
} from "../lib/fleet/buildRouteRiskShadowCandidateCollection.ts";
import {
  buildRouteRiskShadowCandidateRouteIdentity,
} from "../lib/fleet/buildRouteRiskShadowCandidateRouteIdentity.ts";
import {
  buildRouteRiskShadowCandidateRouteNormalization,
  ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION,
} from "../lib/fleet/buildRouteRiskShadowCandidateRouteNormalization.ts";
import {
  ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
} from "../lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts";

const routePoints = [
  [-33.9, 18.4],
  [-33.89, 18.4],
  [-33.89, 18.41],
];

function normalize(points = routePoints) {
  return buildRouteRiskShadowCandidateRouteNormalization({
    routePoints: points,
    scopeSource: "provider_geometry",
    predictionCreatedAt:
      "2026-08-16T12:00:00.000Z",
  });
}

test("builds deterministic explicitly versioned normalization", () => {
  const first = normalize();
  const second = normalize();

  assert.deepEqual(first, second);
  assert.equal(
    first.normalizationVersion,
    ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION
  );
  assert.equal(first.normalizationState, "AVAILABLE");
  assert.equal(first.authority, "NON_AUTHORITATIVE");
  assert.equal(
    first.routeEvidenceScope.scopeVersion,
    ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION
  );
});

test("preserves canonical ordered geometry and reuses existing identities", () => {
  const result = normalize();
  assert.deepEqual(
    result.routeEvidenceScope.routePoints.map(
      ({ index, latitude, longitude }) =>
        ({ index, latitude, longitude })
    ),
    [
      { index: 0, latitude: -33.9, longitude: 18.4 },
      { index: 1, latitude: -33.89, longitude: 18.4 },
      { index: 2, latitude: -33.89, longitude: 18.41 },
    ]
  );

  const directIdentity =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope:
        result.routeEvidenceScope,
    });
  assert.deepEqual(
    result.candidateRouteIdentity,
    directIdentity
  );
});

test("is directly compatible with the B9 candidate collection", () => {
  const first = normalize();
  const second = normalize([
    [-34.0, 18.5],
    [-33.99, 18.5],
    [-33.99, 18.51],
  ]);

  const collection =
    buildRouteRiskShadowCandidateCollection({
      candidates: [first, second],
    });

  assert.equal(collection.collectionState, "AVAILABLE");
  assert.equal(collection.candidates.length, 2);
  assert.equal(
    collection.candidateSetIdentity.identityState,
    "AVAILABLE"
  );
});

test("represents unavailable and malformed geometry deterministically", () => {
  const insufficient = normalize([]);
  assert.equal(
    insufficient.normalizationState,
    "UNAVAILABLE"
  );
  assert.equal(
    insufficient.candidateRouteIdentity.routeFingerprint,
    null
  );
  assert.equal(
    insufficient.unavailableReason,
    "insufficient_route_points"
  );

  const malformed = normalize([
    [-33.9, 18.4],
    [Number.NaN, 18.4],
  ]);
  assert.equal(malformed.normalizationState, "UNAVAILABLE");
  assert.equal(
    malformed.unavailableReason,
    "invalid_route_points"
  );

  const invalidTimestamp =
    buildRouteRiskShadowCandidateRouteNormalization({
      routePoints,
      scopeSource: "provider_geometry",
      predictionCreatedAt: "not-a-timestamp",
    });
  assert.equal(
    invalidTimestamp.unavailableReason,
    "invalid_prediction_timestamp"
  );
});

test("does not mutate inputs or generate timestamps", () => {
  const input = structuredClone(routePoints);
  const before = structuredClone(input);
  const result = normalize(input);

  assert.deepEqual(input, before);
  assert.equal(
    result.routeEvidenceScope.predictionCreatedAt,
    "2026-08-16T12:00:00.000Z"
  );
  assert.equal(
    Object.hasOwn(result, "createdAt"),
    false
  );
});

test("contains no provider calls or operational semantics", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowCandidateRouteNormalization.ts",
    "utf8"
  );
  const productionRoute = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  for (const forbidden of [
    "fetch(",
    ".from(",
    ".rpc(",
    "scoreRouteRisk",
    "persistRouteRisk",
    "calculateHereRoutes",
    "NextResponse",
    "rank",
    "recommendation",
    "selectedRoute",
    "forecastEvent",
    "forecastSet",
    "operationalRisk",
    "confidence",
    "uncertainty",
    "new Date()",
  ]) {
    assert.equal(helper.includes(forbidden), false);
  }

  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowCandidateRouteNormalization"
    ),
    false
  );
});
