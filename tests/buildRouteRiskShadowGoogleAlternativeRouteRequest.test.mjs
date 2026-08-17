import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowGoogleAlternativeRouteRequest,
  ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK,
  ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION,
} from "../lib/fleet/buildRouteRiskShadowGoogleAlternativeRouteRequest.ts";

const input = {
  origin: { latitude: 40.6, longitude: -73.9 },
  destination: { latitude: 40.7, longitude: -73.8 },
};

test("builds a deterministic shadow alternative-route request description", () => {
  const first = buildRouteRiskShadowGoogleAlternativeRouteRequest(input);
  const second = buildRouteRiskShadowGoogleAlternativeRouteRequest(input);

  assert.deepEqual(first, second);
  assert.equal(first.requestState, "AVAILABLE");
  assert.equal(first.requestVersion, ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION);
  assert.equal(first.provider, "GOOGLE_ROUTES_V2");
  assert.equal(first.method, "POST");
  assert.equal(first.fieldMask, ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK);
  assert.equal(first.body.computeAlternativeRoutes, true);
  assert.equal(first.body.travelMode, "DRIVE");
  assert.equal(first.body.routingPreference, "TRAFFIC_AWARE");
  assert.deepEqual(first.body.origin.location.latLng, input.origin);
  assert.deepEqual(first.body.destination.location.latLng, input.destination);
});

test("rejects malformed coordinates deterministically", () => {
  const invalidOrigin = buildRouteRiskShadowGoogleAlternativeRouteRequest({
    origin: { latitude: Number.NaN, longitude: 0 },
    destination: input.destination,
  });
  const invalidDestination = buildRouteRiskShadowGoogleAlternativeRouteRequest({
    origin: input.origin,
    destination: { latitude: 91, longitude: 0 },
  });

  assert.equal(invalidOrigin.requestState, "UNAVAILABLE");
  assert.equal(invalidOrigin.unavailableReason, "invalid_origin_coordinates");
  assert.equal(invalidOrigin.body, null);
  assert.equal(invalidDestination.requestState, "UNAVAILABLE");
  assert.equal(invalidDestination.unavailableReason, "invalid_destination_coordinates");
  assert.equal(invalidDestination.body, null);
});

test("does not mutate inputs or contain credentials", () => {
  const original = structuredClone(input);
  const result = buildRouteRiskShadowGoogleAlternativeRouteRequest(input);

  assert.deepEqual(input, original);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /API[_-]?KEY|authorization|secret|token/i);
});

test("is a description-only helper with no execution or production integration", () => {
  const source = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowGoogleAlternativeRouteRequest.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /fetch\s*\(|process\.env|\.rpc\s*\(|\.from\s*\(/);
  assert.doesNotMatch(source, /Date\.now|new Date|AbortController|setTimeout/);
  assert.doesNotMatch(source, /score|persist|ranking|recommend|selectedRoute|forecastEvent|forecastSet|confidence|uncertainty|probability/i);

  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
  assert.doesNotMatch(routeSource, /buildRouteRiskShadowGoogleAlternativeRouteRequest/);
});
