import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowTravelCostProvenance,
  ROUTE_RISK_SHADOW_TRAVEL_COST_PROVENANCE_VERSION,
} from "../lib/fleet/buildRouteRiskShadowTravelCostProvenance.ts";

const routeEstimate = {
  distanceMeters: 12450,
  duration: "901.25s",
  staticDuration: "840s",
};

const predictionCreatedAt =
  "2026-08-16T12:00:00+02:00";

test("builds deterministic explicitly versioned descriptive travel-cost provenance", () => {
  const input = {
    routeEstimate,
    predictionCreatedAt,
  };

  const first =
    buildRouteRiskShadowTravelCostProvenance(input);
  const second =
    buildRouteRiskShadowTravelCostProvenance(input);

  assert.deepEqual(first, second);
  assert.equal(
    first.provenanceVersion,
    ROUTE_RISK_SHADOW_TRAVEL_COST_PROVENANCE_VERSION
  );
  assert.equal(
    first.semantics,
    "DESCRIPTIVE_PROVIDER_TRAVEL_COST"
  );
  assert.equal(
    first.authority,
    "NON_AUTHORITATIVE"
  );
});

test("preserves exact provider context, cost values, and prediction timestamp", () => {
  const result =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate,
      predictionCreatedAt,
    });

  assert.equal(
    result.predictionCreatedAt,
    "2026-08-16T10:00:00.000Z"
  );
  assert.deepEqual(result.source, {
    provider: "GOOGLE_ROUTES_V2",
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    alternativeRoutesRequested: false,
  });
  assert.equal(
    result.availability,
    "AVAILABLE"
  );
  assert.deepEqual(
    result.availabilityIssues,
    []
  );
  assert.deepEqual(
    result.providerTravelCost,
    {
      distanceMeters: 12450,
      trafficAwareDurationSeconds: 901.25,
      staticDurationSeconds: 840,
    }
  );
});

test("normalizes valid Google nanosecond durations deterministically", () => {
  const result =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate: {
        distanceMeters: 0,
        duration: "1.000000001s",
        staticDuration: "0s",
      },
      predictionCreatedAt,
    });

  assert.deepEqual(
    result.providerTravelCost,
    {
      distanceMeters: 0,
      trafficAwareDurationSeconds:
        1.000000001,
      staticDurationSeconds: 0,
    }
  );
});

test("represents partial provider evidence without estimating missing values", () => {
  const result =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate: {
        distanceMeters: 12450,
        duration: "901s",
      },
      predictionCreatedAt,
    });

  assert.equal(
    result.availability,
    "PARTIAL"
  );
  assert.deepEqual(
    result.availabilityIssues,
    ["invalid_static_duration"]
  );
  assert.deepEqual(
    result.providerTravelCost,
    {
      distanceMeters: 12450,
      trafficAwareDurationSeconds: 901,
      staticDurationSeconds: null,
    }
  );
});

test("degrades missing or invalid evidence to unavailable provenance", () => {
  const missing =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate: null,
      predictionCreatedAt,
    });

  assert.equal(
    missing.availability,
    "UNAVAILABLE"
  );
  assert.deepEqual(
    missing.availabilityIssues,
    ["route_estimate_unavailable"]
  );
  assert.deepEqual(
    missing.providerTravelCost,
    {
      distanceMeters: null,
      trafficAwareDurationSeconds: null,
      staticDurationSeconds: null,
    }
  );

  const invalid =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate: {
        distanceMeters: -1,
        duration: "not-a-duration",
        staticDuration: "1.0000000000s",
      },
      predictionCreatedAt: "invalid",
    });

  assert.equal(
    invalid.availability,
    "UNAVAILABLE"
  );
  assert.equal(
    invalid.predictionCreatedAt,
    null
  );
  assert.deepEqual(
    invalid.availabilityIssues,
    [
      "invalid_prediction_timestamp",
      "invalid_distance_meters",
      "invalid_traffic_aware_duration",
      "invalid_static_duration",
    ]
  );
});

test("does not mutate provider input or use current time", () => {
  const input = {
    routeEstimate:
      structuredClone(routeEstimate),
    predictionCreatedAt,
  };
  const before = structuredClone(input);

  const result =
    buildRouteRiskShadowTravelCostProvenance(input);

  assert.deepEqual(input, before);
  assert.equal(
    result.predictionCreatedAt,
    "2026-08-16T10:00:00.000Z"
  );
});

test("remains pure, unpersisted, and incapable of production route decisions", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowTravelCostProvenance.ts",
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
    "NextResponse",
    "rankRoutes",
    "calculateHereRoutes",
    "persistRouteRiskShadowPrediction",
    "scoreRouteRiskLogisticModel",
    "new Date()",
  ]) {
    assert.equal(
      helper.includes(forbidden),
      false
    );
  }

  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowTravelCostProvenance"
    ),
    false
  );

  const result =
    buildRouteRiskShadowTravelCostProvenance({
      routeEstimate,
      predictionCreatedAt,
    });

  for (const forbiddenField of [
    "operationalRiskScore",
    "calibratedRisk",
    "uncertaintyPenalty",
    "rank",
    "selectedRoute",
    "recommendedRoute",
  ]) {
    assert.equal(
      forbiddenField in result,
      false
    );
  }
});
