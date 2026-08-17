import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  executeRouteRiskShadowGoogleAlternativeRouteRequest,
  ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION,
} from "../lib/fleet/executeRouteRiskShadowGoogleAlternativeRouteRequest.ts";
import {
  buildRouteRiskShadowGoogleAlternativeRouteRequest,
} from "../lib/fleet/buildRouteRiskShadowGoogleAlternativeRouteRequest.ts";
import {
  buildRouteRiskShadowProviderRouteCandidateAdapter,
} from "../lib/fleet/buildRouteRiskShadowProviderRouteCandidateAdapter.ts";

const request = buildRouteRiskShadowGoogleAlternativeRouteRequest({
  origin: { latitude: 40.6, longitude: -73.9 },
  destination: { latitude: 40.7, longitude: -73.8 },
});

function response({ status = 200, body = { routes: [] }, jsonError = false } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      if (jsonError) throw new SyntaxError("invalid json");
      return body;
    },
  };
}

function fetchReturning(value) {
  return async (input, init) => {
    fetchReturning.last = { input, init };
    return value;
  };
}

test("executes B12 semantics and forwards credentials without returning them", async () => {
  const fetcher = fetchReturning(response({ body: { routes: [] } }));
  const result = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher,
    timeoutMs: 100,
  });

  assert.equal(result.executionState, "SUCCEEDED");
  assert.equal(result.executionVersion, ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION);
  assert.deepEqual(result.providerResponse, { routes: [] });
  assert.equal(fetchReturning.last.input, request.endpoint);
  assert.equal(fetchReturning.last.init.headers["X-Goog-Api-Key"], "fake-test-key");
  assert.equal(fetchReturning.last.init.headers["X-Goog-FieldMask"], request.fieldMask);
  assert.equal(JSON.stringify(result).includes("fake-test-key"), false);
  assert.equal(JSON.parse(fetchReturning.last.init.body).computeAlternativeRoutes, true);
});

test("returns deterministic structured failures for credentials and statuses", async () => {
  const missing = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "",
    fetcher: fetchReturning(response()),
    timeoutMs: 100,
  });
  assert.deepEqual(missing.failure, "missing_credential");

  for (const [status, failure] of [[401, "authentication_failure"], [403, "authentication_failure"], [429, "quota_exhausted"], [400, "http_client_error"], [503, "http_server_error"]]) {
    const result = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
      request,
      apiKey: "fake-test-key",
      fetcher: fetchReturning(response({ status })),
      timeoutMs: 100,
    });
    assert.equal(result.failure, failure);
    assert.equal(result.status, status);
    assert.equal(result.providerResponse, null);
  }
});

test("classifies malformed JSON and network rejection", async () => {
  const malformed = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher: fetchReturning(response({ jsonError: true })),
    timeoutMs: 100,
  });
  assert.equal(malformed.failure, "malformed_json");

  const network = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher: async () => { throw new TypeError("network unavailable"); },
    timeoutMs: 100,
  });
  assert.equal(network.failure, "network_error");
});

test("distinguishes timeout and caller abort without hanging", async () => {
  const hangingFetcher = async (_input, init) => await new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });

  const timedOut = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher: hangingFetcher,
    timeoutMs: 5,
  });
  assert.equal(timedOut.failure, "timeout");

  const caller = new AbortController();
  const abortedPromise = executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher: hangingFetcher,
    timeoutMs: 100,
    signal: caller.signal,
  });
  caller.abort();
  assert.equal((await abortedPromise).failure, "aborted");
});

test("successful raw output is directly handoff-compatible with B11", async () => {
  const providerResponse = {
    routes: [{ polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" } }],
  };
  const result = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey: "fake-test-key",
    fetcher: fetchReturning(response({ body: providerResponse })),
    timeoutMs: 100,
  });
  const adapted = buildRouteRiskShadowProviderRouteCandidateAdapter({
    providerResponse: result.providerResponse,
    scopeSource: "provider_geometry",
    predictionCreatedAt: "2026-08-16T12:00:00.000Z",
  });
  assert.equal(adapted.adapterState, "AVAILABLE");
  assert.equal(adapted.candidates.length, 1);
});

test("has no production integration, persistence, scoring, or secret access", () => {
  const source = fs.readFileSync(
    "lib/fleet/executeRouteRiskShadowGoogleAlternativeRouteRequest.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /process\.env|console\.|supabase|\.rpc\s*\(|\.from\s*\(|persist|score|rank|recommend|selectedRoute|NextResponse/);
  assert.doesNotMatch(source, /GOOGLE_ROUTES_API_KEY|Authorization.*apiKey/);
  const routeSource = fs.readFileSync("app/api/route-safety/predict/route.ts", "utf8");
  assert.doesNotMatch(routeSource, /executeRouteRiskShadowGoogleAlternativeRouteRequest/);
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
});
