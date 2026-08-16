import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowCandidateCollection,
  ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION,
} from "../lib/fleet/buildRouteRiskShadowCandidateCollection.ts";
import {
  buildRouteRiskShadowCandidateRouteIdentity,
} from "../lib/fleet/buildRouteRiskShadowCandidateRouteIdentity.ts";
import {
  buildRouteRiskShadowRouteEvidenceScope,
} from "../lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts";

const pointsA = [
  [-33.9, 18.4],
  [-33.89, 18.4],
  [-33.89, 18.41],
];
const pointsB = [
  [-34.0, 18.5],
  [-33.99, 18.5],
  [-33.99, 18.51],
];

function candidate(points) {
  const routeEvidenceScope =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints: points,
      scopeSource: "provider_geometry",
      predictionCreatedAt:
        "2026-08-16T12:00:00.000Z",
    });
  return {
    routeEvidenceScope,
    candidateRouteIdentity:
      buildRouteRiskShadowCandidateRouteIdentity({
        routeEvidenceScope,
      }),
  };
}

test("builds a deterministic versioned ordered candidate collection", () => {
  const first = buildRouteRiskShadowCandidateCollection({
    candidates: [candidate(pointsB), candidate(pointsA)],
  });
  const second = buildRouteRiskShadowCandidateCollection({
    candidates: [candidate(pointsA), candidate(pointsB)],
  });

  assert.deepEqual(first, second);
  assert.equal(
    first.collectionVersion,
    ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION
  );
  assert.equal(first.collectionState, "AVAILABLE");
  assert.equal(first.authority, "NON_AUTHORITATIVE");
  assert.equal(first.candidates.length, 2);
  assert.equal(
    first.candidateSetIdentity.identityState,
    "AVAILABLE"
  );
  assert.deepEqual(
    first.candidates.map(
      (member) =>
        member.candidateRouteIdentity.routeFingerprint
    ),
    [...first.candidates]
      .map(
        (member) =>
          member.candidateRouteIdentity.routeFingerprint
      )
      .sort()
  );
});

test("reuses identities and preserves each route-evidence scope", () => {
  const input = [candidate(pointsA), candidate(pointsB)];
  const before = structuredClone(input);
  const result = buildRouteRiskShadowCandidateCollection({
    candidates: input,
  });

  assert.deepEqual(input, before);
  for (const member of result.candidates) {
    const derived =
      buildRouteRiskShadowCandidateRouteIdentity({
        routeEvidenceScope:
          member.routeEvidenceScope,
      });
    assert.deepEqual(
      member.candidateRouteIdentity,
      derived
    );
    assert.ok(member.routeEvidenceScope.routePoints.length >= 2);
  }
});

test("rejects duplicates, unavailable members, and empty collections", () => {
  const one = candidate(pointsA);
  const duplicate = buildRouteRiskShadowCandidateCollection({
    candidates: [one, one],
  });
  assert.equal(duplicate.collectionState, "UNAVAILABLE");
  assert.equal(
    duplicate.unavailableReason,
    "candidate_set_identity_unavailable"
  );

  const unavailableScope =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints: [],
      scopeSource: "endpoint_only",
      predictionCreatedAt:
        "2026-08-16T12:00:00.000Z",
    });
  const unavailable =
    buildRouteRiskShadowCandidateCollection({
      candidates: [{
        routeEvidenceScope: unavailableScope,
        candidateRouteIdentity:
          buildRouteRiskShadowCandidateRouteIdentity({
            routeEvidenceScope: unavailableScope,
          }),
      }],
    });
  assert.equal(unavailable.collectionState, "UNAVAILABLE");
  assert.equal(
    unavailable.unavailableReason,
    "invalid_candidate_member"
  );

  const empty = buildRouteRiskShadowCandidateCollection({
    candidates: [],
  });
  assert.equal(empty.collectionState, "UNAVAILABLE");
  assert.equal(
    empty.unavailableReason,
    "empty_candidate_collection"
  );
});

test("contains no operational, persistence, or event semantics", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowCandidateCollection.ts",
    "utf8"
  );
  const productionRoute = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  for (const forbidden of [
    ".from(",
    ".rpc(",
    "fetch(",
    "crowd_segment_",
    "scoreRouteRisk",
    "persistRouteRisk",
    "forecastEvent",
    "forecastSet",
    "rank",
    "recommendation",
    "selectedRoute",
    "operationalRiskScore",
    "uncertaintyPenalty",
    "NextResponse",
  ]) {
    assert.equal(helper.includes(forbidden), false);
  }
  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowCandidateCollection"
    ),
    false
  );
  const result = buildRouteRiskShadowCandidateCollection({
    candidates: [candidate(pointsA)],
  });
  for (const forbiddenField of [
    "predictionCreatedAt",
    "probability",
    "model",
    "rank",
    "recommendation",
    "selectedRoute",
    "forecastSet",
    "forecastEvent",
  ]) {
    assert.equal(forbiddenField in result, false);
  }
});
