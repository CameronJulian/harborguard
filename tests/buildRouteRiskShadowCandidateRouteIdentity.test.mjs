import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowCandidateRouteIdentity,
  ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
} from "../lib/fleet/buildRouteRiskShadowCandidateRouteIdentity.ts";

import {
  buildRouteRiskShadowRouteEvidenceScope,
  ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
} from "../lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts";

const routePoints = [
  [-33.9, 18.4],
  [-33.89, 18.4],
  [-33.89, 18.41],
];

function routeScope({
  points = routePoints,
  scopeSource = "provider_geometry",
  predictionCreatedAt =
    "2026-08-16T12:00:00+02:00",
} = {}) {
  return buildRouteRiskShadowRouteEvidenceScope({
    routePoints: points,
    scopeSource,
    predictionCreatedAt,
  });
}

test("builds a deterministic explicitly versioned SHA-256 candidate-route identity", () => {
  const scope = routeScope();

  const first =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: scope,
    });
  const second =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: scope,
    });

  assert.deepEqual(first, second);
  assert.equal(
    first.identityVersion,
    ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION
  );
  assert.equal(
    first.identityState,
    "AVAILABLE"
  );
  assert.equal(first.algorithm, "SHA-256");
  assert.equal(
    first.routeEvidenceScopeVersion,
    ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION
  );
  assert.match(
    first.routeFingerprint,
    /^[0-9a-f]{64}$/
  );
});

test("produces the fixed fingerprint for the canonical route fixture", () => {
  const result =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope(),
    });

  assert.equal(
    result.routeFingerprint,
    "ffd7c803f95575105ea873091cbcadbba2466315103a31eb1a4db0cf5a6f64fc"
  );
});

test("excludes prediction time from route identity", () => {
  const first =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope({
        predictionCreatedAt:
          "2026-08-16T10:00:00.000Z",
      }),
    });
  const second =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope({
        predictionCreatedAt:
          "2026-08-17T10:00:00.000Z",
      }),
    });

  assert.equal(
    first.routeFingerprint,
    second.routeFingerprint
  );
});

test("preserves directed point order in route identity", () => {
  const forward =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope(),
    });
  const reversed =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope({
        points: [...routePoints].reverse(),
      }),
    });

  assert.notEqual(
    forward.routeFingerprint,
    reversed.routeFingerprint
  );
});

test("changes identity when one canonical route point changes", () => {
  const original =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope(),
    });
  const changed =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope({
        points: [
          routePoints[0],
          [-33.889, 18.4],
          routePoints[2],
        ],
      }),
    });

  assert.notEqual(
    original.routeFingerprint,
    changed.routeFingerprint
  );
});

test("includes route scope source in identity semantics", () => {
  const providerGeometry =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope(),
    });
  const endpointOnly =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope({
        scopeSource: "endpoint_only",
      }),
    });

  assert.notEqual(
    providerGeometry.routeFingerprint,
    endpointOnly.routeFingerprint
  );
  assert.equal(
    providerGeometry.scopeSource,
    "provider_geometry"
  );
  assert.equal(
    endpointOnly.scopeSource,
    "endpoint_only"
  );
});

test("returns unavailable identity without fabricating a fingerprint", () => {
  const scope = routeScope({
    points: [],
    scopeSource: "endpoint_only",
  });

  const result =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: scope,
    });

  assert.equal(
    result.identityState,
    "UNAVAILABLE"
  );
  assert.equal(result.routeFingerprint, null);
  assert.equal(
    result.scopeSource,
    "unavailable"
  );
  assert.equal(
    result.unavailableReason,
    "insufficient_route_points"
  );
});

test("does not mutate canonical route scope input", () => {
  const scope = routeScope();
  const before = structuredClone(scope);

  buildRouteRiskShadowCandidateRouteIdentity({
    routeEvidenceScope: scope,
  });

  assert.deepEqual(scope, before);
});

test("uses only route identity evidence and remains pure and unintegrated", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowCandidateRouteIdentity.ts",
    "utf8"
  );
  const productionRoute = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  const inputContractStart = helper.indexOf(
    "export type BuildRouteRiskShadowCandidateRouteIdentityInput"
  );
  const inputContractEnd = helper.indexOf(
    "export type RouteRiskShadowCandidateRouteIdentity ="
  );
  const inputContract = helper.slice(
    inputContractStart,
    inputContractEnd
  );

  assert.ok(inputContractStart >= 0);
  assert.ok(inputContractEnd > inputContractStart);
  assert.match(
    inputContract,
    /routeEvidenceScope/
  );

  for (const forbiddenInput of [
    "model:",
    "probability:",
    "evidenceAssessment:",
    "travelCostProvenance:",
    "distance:",
    "duration:",
    "rank:",
    "recommendation:",
    "candidateSet:",
    "forecastSet:",
  ]) {
    assert.equal(
      inputContract.includes(forbiddenInput),
      false
    );
  }

  for (const forbiddenOperation of [
    ".from(",
    ".rpc(",
    "fetch(",
    "crowd_segment_traversals",
    "crowd_segment_exposure_stats",
    "scoreRouteRiskLogisticModel",
    "persistRouteRiskShadowPrediction",
    "calculateHereRoutes",
    "NextResponse",
    "new Date()",
  ]) {
    assert.equal(
      helper.includes(forbiddenOperation),
      false
    );
  }

  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowCandidateRouteIdentity"
    ),
    false
  );

  const result =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope: routeScope(),
    });

  for (const forbiddenField of [
    "predictionCreatedAt",
    "snapshotId",
    "model",
    "probability",
    "evidenceAssessment",
    "travelCostProvenance",
    "distance",
    "duration",
    "rank",
    "recommendation",
    "selectedRoute",
    "candidateSetId",
    "forecastSetId",
  ]) {
    assert.equal(
      forbiddenField in result,
      false
    );
  }
});
