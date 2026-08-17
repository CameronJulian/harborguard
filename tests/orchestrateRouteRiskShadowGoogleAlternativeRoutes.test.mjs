import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  orchestrateRouteRiskShadowGoogleAlternativeRoutes,
  ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION_VERSION,
} from "../lib/fleet/orchestrateRouteRiskShadowGoogleAlternativeRoutes.ts";

const input = {
  origin: { latitude: 40.6, longitude: -73.9 },
  destination: { latitude: 40.7, longitude: -73.8 },
  apiKey: "fake-test-key",
  timeoutMs: 100,
  scopeSource: "provider_geometry",
  predictionCreatedAt: "2026-08-16T12:00:00.000Z",
};

const firstPolyline = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
const secondPolyline = "_ibE_seK_seK_seK";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function fetchReturning(body) {
  return async (_input, _init) => response(body);
}

test("composes B12, B13, and B11 into normalized candidates", async () => {
  const result = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    fetcher: fetchReturning({
      routes: [
        { polyline: { encodedPolyline: firstPolyline } },
        { polyline: { encodedPolyline: secondPolyline } },
      ],
    }),
  });

  assert.equal(result.orchestrationState, "SUCCEEDED");
  assert.equal(result.failure, null);
  assert.equal(result.orchestrationVersion, ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION_VERSION);
  assert.equal(result.request.body.computeAlternativeRoutes, true);
  assert.equal(result.execution.executionState, "SUCCEEDED");
  assert.equal(result.adapter.adapterState, "AVAILABLE");
  assert.equal(result.adapter.candidates.length, 2);
  assert.match(result.adapter.candidates[0].candidateRouteIdentity.routeFingerprint, /^[0-9a-f]{64}$/);
});

test("is deterministic for deterministic injected fixtures and does not mutate inputs", async () => {
  const original = structuredClone(input);
  const options = {
    ...input,
    fetcher: fetchReturning({ routes: [{ polyline: { encodedPolyline: firstPolyline } }] }),
  };
  const first = await orchestrateRouteRiskShadowGoogleAlternativeRoutes(options);
  const second = await orchestrateRouteRiskShadowGoogleAlternativeRoutes(options);

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
});

test("does not execute when B12 request construction is unavailable", async () => {
  let calls = 0;
  const result = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    origin: { latitude: Number.NaN, longitude: 0 },
    fetcher: async () => { calls += 1; return response({ routes: [] }); },
  });

  assert.equal(result.orchestrationState, "UNAVAILABLE");
  assert.equal(result.failure, "request_unavailable");
  assert.equal(result.execution, null);
  assert.equal(calls, 0);
});

test("preserves B13 execution failures including timeout and abort", async () => {
  for (const failure of ["network_error", "authentication_failure", "quota_exhausted", "http_server_error", "malformed_json"]) {
    const fetcher = failure === "network_error"
      ? async () => { throw new TypeError("network unavailable"); }
      : failure === "malformed_json"
        ? async () => ({ ok: true, status: 200, async json() { throw new SyntaxError("bad json"); } })
        : async () => response({}, failure === "authentication_failure" ? 401 : failure === "quota_exhausted" ? 429 : 503);
    const result = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({ ...input, fetcher });
    assert.equal(result.orchestrationState, "UNAVAILABLE");
    assert.equal(result.failure, "provider_execution_failed");
    assert.equal(result.execution.failure, failure);
  }

  const hangingFetcher = async (_input, init) => await new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
  const timedOut = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    timeoutMs: 5,
    fetcher: hangingFetcher,
  });
  assert.equal(timedOut.execution.failure, "timeout");

  const caller = new AbortController();
  const abortedPromise = orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    signal: caller.signal,
    fetcher: hangingFetcher,
  });
  caller.abort();
  assert.equal((await abortedPromise).execution.failure, "aborted");
});

test("preserves B11 unavailable and partial route semantics", async () => {
  const empty = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    fetcher: fetchReturning({ routes: [] }),
  });
  assert.equal(empty.orchestrationState, "UNAVAILABLE");
  assert.equal(empty.failure, "provider_routes_unavailable");
  assert.equal(empty.adapter.adapterState, "UNAVAILABLE");

  const partial = await orchestrateRouteRiskShadowGoogleAlternativeRoutes({
    ...input,
    fetcher: fetchReturning({
      routes: [
        { polyline: { encodedPolyline: firstPolyline } },
        { malformed: true },
      ],
    }),
  });
  assert.equal(partial.orchestrationState, "PARTIAL");
  assert.equal(partial.adapter.adapterState, "PARTIAL");
  assert.equal(partial.adapter.candidates.length, 1);
});

test("does not return credentials or introduce forbidden operations", () => {
  const source = fs.readFileSync(
    "lib/fleet/orchestrateRouteRiskShadowGoogleAlternativeRoutes.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /process\.env|console\.|supabase|persistRouteRisk|scoreRouteRisk|rank|recommend|selectedRoute|reroute|escalat|retry|quota|concurr|forecast|calibrat|confidence|uncertainty|new Date|Date\.now/);
  assert.doesNotMatch(JSON.stringify(input), /real|AIza|secret/i);
  const routeSource = fs.readFileSync("app/api/route-safety/predict/route.ts", "utf8");
  assert.doesNotMatch(routeSource, /orchestrateRouteRiskShadowGoogleAlternativeRoutes/);
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
});
