import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowCandidateCollection,
} from "../lib/fleet/buildRouteRiskShadowCandidateCollection.ts";
import {
  buildRouteRiskShadowProviderRouteCandidateAdapter,
  ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION,
} from "../lib/fleet/buildRouteRiskShadowProviderRouteCandidateAdapter.ts";

const encodedPolyline =
  "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
const secondEncodedPolyline =
  "_ibE_seK_seK_seK";

function providerResponse(routes) {
  return { routes };
}

function route(encoded = encodedPolyline) {
  return {
    polyline: {
      encodedPolyline: encoded,
    },
  };
}

function adapt(response) {
  return buildRouteRiskShadowProviderRouteCandidateAdapter({
    providerResponse: response,
    scopeSource: "provider_geometry",
    predictionCreatedAt:
      "2026-08-16T12:00:00.000Z",
  });
}

test("adapts one valid provider route through B10", () => {
  const result = adapt(providerResponse([route()]));

  assert.equal(
    result.adapterVersion,
    ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION
  );
  assert.equal(result.adapterState, "AVAILABLE");
  assert.equal(result.candidates.length, 1);
  assert.equal(
    result.candidates[0].normalizationState,
    "AVAILABLE"
  );
  assert.match(
    result.candidates[0].candidateRouteIdentity.routeFingerprint,
    /^[0-9a-f]{64}$/
  );
});

test("preserves provider extraction order while leaving collection ordering to B9", () => {
  const result = adapt(
    providerResponse([
      route(secondEncodedPolyline),
      route(encodedPolyline),
    ])
  );

  assert.equal(result.adapterState, "AVAILABLE");
  assert.equal(result.candidates.length, 2);
  const providerOrder = result.candidates.map(
    (candidate) =>
      candidate.candidateRouteIdentity.routeFingerprint
  );
  assert.notEqual(providerOrder[0], providerOrder[1]);

  const collection =
    buildRouteRiskShadowCandidateCollection({
      candidates: result.candidates,
    });
  assert.equal(collection.collectionState, "AVAILABLE");
  assert.deepEqual(
    collection.candidates.map(
      (candidate) =>
        candidate.candidateRouteIdentity.routeFingerprint
    ),
    [...providerOrder].sort()
  );
});

test("is deterministic and does not mutate provider input", () => {
  const input = providerResponse([
    route(),
    route(secondEncodedPolyline),
  ]);
  const before = structuredClone(input);
  const first = adapt(input);
  const second = adapt(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.equal(
    first.candidates[0].routeEvidenceScope.predictionCreatedAt,
    "2026-08-16T12:00:00.000Z"
  );
});

test("handles empty, unavailable, malformed, and invalid route data", () => {
  assert.equal(
    adapt(null).unavailableReasons[0],
    "invalid_provider_response"
  );
  assert.equal(
    adapt(providerResponse([])).unavailableReasons[0],
    "empty_provider_routes"
  );
  assert.equal(
    adapt(providerResponse([null])).unavailableReasons[0],
    "malformed_route"
  );
  assert.equal(
    adapt(providerResponse([{}])).unavailableReasons[0],
    "missing_polyline"
  );
  assert.equal(
    adapt(providerResponse([route("not-a-polyline")])).unavailableReasons[0],
    "malformed_polyline"
  );
  assert.equal(
    adapt(providerResponse([route("_")])).unavailableReasons[0],
    "malformed_polyline"
  );
});

test("does not fabricate endpoint-only geometry or timestamps", () => {
  const result =
    buildRouteRiskShadowProviderRouteCandidateAdapter({
      providerResponse: providerResponse([{}]),
      scopeSource: "endpoint_only",
      predictionCreatedAt:
        "2026-08-16T12:00:00.000Z",
    });

  assert.equal(result.adapterState, "UNAVAILABLE");
  assert.equal(result.candidates.length, 0);
});

test("contains no network, persistence, scoring, or production integration", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowProviderRouteCandidateAdapter.ts",
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
    "calculateHereRoutes",
    "scoreRouteRisk",
    "persistRouteRisk",
    "NextResponse",
    "rank",
    "recommendation",
    "selectedRoute",
    "operationalRisk",
    "probability",
    "confidence",
    "uncertainty",
    "forecastEvent",
    "forecastSet",
    "Date.now()",
    "new Date()",
  ]) {
    assert.equal(helper.includes(forbidden), false);
  }

  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowProviderRouteCandidateAdapter"
    ),
    false
  );
});
