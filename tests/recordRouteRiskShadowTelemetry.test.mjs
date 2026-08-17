import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  recordRouteRiskShadowTelemetry,
} from "../lib/fleet/recordRouteRiskShadowTelemetry.ts";
import {
  integrateRouteRiskShadowAlternativeRoutes,
} from "../lib/fleet/integrateRouteRiskShadowAlternativeRoutes.ts";

const policy = {
  enabled: true,
  allowedOrganizationIds: ["org-secret"],
  samplingPercentage: 100,
};

const context = {
  organizationId: "org-secret",
  samplingIdentity: "snapshot-secret",
  providerCredentialAvailable: true,
};

const reservation = {
  reservationKey: "org-secret:snapshot-secret",
  organizationId: "org-secret",
  configuration: {
    windowSeconds: 60,
    leaseSeconds: 30,
    globalCallLimit: 10,
    organizationCallLimit: 5,
    globalConcurrencyLimit: 3,
    organizationConcurrencyLimit: 2,
  },
};

const orchestration = {
  origin: { latitude: -33.9, longitude: 18.4 },
  destination: { latitude: -33.95, longitude: 18.5 },
  apiKey: "fake-api-key",
  fetcher: async () => {
    throw new Error("network must not be called");
  },
  timeoutMs: 100,
  scopeSource: "provider_geometry",
  predictionCreatedAt: "2026-08-17T00:00:00.000Z",
};

function harness({ reservationState = "RESERVED", reason = null, orchestrate } = {}) {
  const events = [];
  const calls = [];
  let task;
  let now = 1000;
  const scheduler = (nextTask) => {
    calls.push("register");
    task = nextTask;
  };
  const rpc = async (functionName) => {
    calls.push(functionName);
    if (functionName.includes("reserve")) {
      return {
        data: [
          {
            reservation_state: reservationState,
            reason,
            returned_reservation_key:
              reservationState === "RESERVED" ? reservation.reservationKey : null,
          },
        ],
        error: null,
      };
    }
    return { data: [{ release_state: "RELEASED" }], error: null };
  };
  return {
    events,
    calls,
    scheduler,
    rpc,
    getTask: () => task,
    clock: () => (now += 100),
    telemetrySink: (event) => events.push(event),
    orchestrate:
      orchestrate ??
      (async () => {
        calls.push("orchestrate");
        return { orchestrationState: "SUCCEEDED" };
      }),
  };
}

function input(harnessValue, overrides = {}) {
  return {
    policy,
    context,
    reservation,
    release: { reservationKey: reservation.reservationKey },
    rpc: harnessValue.rpc,
    scheduler: harnessValue.scheduler,
    telemetrySink: harnessValue.telemetrySink,
    telemetryEnvironment: "test",
    telemetryClock: harnessValue.clock,
    orchestration,
    orchestrate: harnessValue.orchestrate,
    ...overrides,
  };
}

test("emits a versioned safe event with hashed identifiers and no secrets", () => {
  const events = [];
  recordRouteRiskShadowTelemetry({
    stage: "eligibility",
    outcome: "ELIGIBLE",
    environment: "production",
    organizationId: "org-secret",
    reservationKey: "org-secret:snapshot-secret",
    providerStatus: 200,
    durationMs: 12.8,
    clock: () => 0,
    sink: (event) => events.push(event),
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].eventName, "route_risk_shadow");
  assert.equal(events[0].telemetryVersion, "harborguard-route-risk-shadow-telemetry-v1");
  assert.equal(events[0].authority, "NON_AUTHORITATIVE");
  assert.equal(events[0].organizationToken.length, 16);
  assert.equal(events[0].reservationToken.length, 16);
  assert.equal(events[0].durationMs, 13);
  assert.doesNotMatch(JSON.stringify(events[0]), /fake-api-key|org-secret|snapshot-secret|-33\.9|18\.4/i);
});

test("successful B16-B18 flow emits eligibility, registration, reservation, orchestration, and release", async () => {
  const fake = harness();
  integrateRouteRiskShadowAlternativeRoutes(input(fake));
  await fake.getTask()();

  assert.deepEqual(
    fake.events.map((event) => `${event.stage}:${event.outcome}`),
    [
      "eligibility:ELIGIBLE",
      "registration:REGISTERED",
      "reservation:RESERVED",
      "orchestration:ATTEMPTED",
      "orchestration:SUCCEEDED",
      "release:RELEASED",
    ]
  );
});

test("B16 denial is visible and prevents later stages", () => {
  const fake = harness();
  integrateRouteRiskShadowAlternativeRoutes(
    input(fake, {
      context: { ...context, organizationId: "not-allowed" },
    })
  );
  assert.deepEqual(fake.events.map((event) => `${event.stage}:${event.outcome}`), [
    "eligibility:INELIGIBLE",
  ]);
  assert.deepEqual(fake.calls, []);
});

test("registration failure is visible without reservation or provider work", () => {
  const fake = harness();
  integrateRouteRiskShadowAlternativeRoutes(
    input(fake, { scheduler: () => { throw new Error("registration failure"); } })
  );
  assert.deepEqual(fake.events.map((event) => `${event.stage}:${event.outcome}`), [
    "eligibility:ELIGIBLE",
    "registration:UNAVAILABLE",
  ]);
  assert.deepEqual(fake.calls, []);
});

test("reservation denial categories remain distinguishable", async () => {
  const reasons = [
    "global_capacity_exhausted",
    "organization_capacity_exhausted",
    "global_concurrency_exhausted",
    "organization_concurrency_exhausted",
    "duplicate_reservation",
    "persistence_unavailable",
  ];
  for (const reason of reasons) {
    const fake = harness({ reservationState: reason === "persistence_unavailable" ? "UNAVAILABLE" : "DENIED", reason });
    integrateRouteRiskShadowAlternativeRoutes(input(fake));
    await fake.getTask()();
    const reservationEvent = fake.events.find((event) => event.stage === "reservation");
    assert.equal(reservationEvent.reason, reason);
    assert.equal(fake.events.some((event) => event.stage === "orchestration"), false);
  }
});

test("provider failure and timeout outcomes are visible and release still occurs", async () => {
  for (const failure of ["provider_execution_failed", "timeout"]) {
    const fake = harness({
      orchestrate: async () => ({
        orchestrationState: "UNAVAILABLE",
        failure,
        execution: { status: null },
      }),
    });
    integrateRouteRiskShadowAlternativeRoutes(input(fake));
    await fake.getTask()();
    const outcome = fake.events.find(
      (event) => event.stage === "orchestration" && event.outcome === "UNAVAILABLE"
    );
    assert.equal(outcome.reason, failure);
    assert.equal(fake.events.some((event) => event.stage === "release"), true);
  }
});

test("telemetry failures cannot alter integration behavior", async () => {
  const fake = harness();
  const result = integrateRouteRiskShadowAlternativeRoutes(
    input(fake, { telemetrySink: () => { throw new Error("telemetry failed"); } })
  );
  assert.equal(result.integrationState, "REGISTERED");
  await fake.getTask()();
  assert.deepEqual(fake.calls, [
    "register",
    "reserve_route_risk_shadow_provider_capacity",
    "orchestrate",
    "release_route_risk_shadow_provider_capacity",
  ]);
});

test("telemetry implementation has no provider, persistence, or production authority", () => {
  const source = fs.readFileSync(
    "lib/fleet/recordRouteRiskShadowTelemetry.ts",
    "utf8"
  );
  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /fetch\(|supabase|GOOGLE_ROUTES_API_KEY|authorization|coordinates|polyline/i);
  assert.doesNotMatch(source, /Math\.random/);
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
  assert.doesNotMatch(routeSource, /computeAlternativeRoutes:\s*true/);
});
