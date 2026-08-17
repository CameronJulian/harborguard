import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  integrateRouteRiskShadowAlternativeRoutes,
} from "../lib/fleet/integrateRouteRiskShadowAlternativeRoutes.ts";

const policy = {
  enabled: true,
  allowedOrganizationIds: ["org-1"],
  samplingPercentage: 100,
};

const context = {
  organizationId: "org-1",
  samplingIdentity: "snapshot-1",
  providerCredentialAvailable: true,
};

const reservation = {
  reservationKey: "org-1:snapshot-1",
  organizationId: "org-1",
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
  apiKey: "fake-key",
  fetcher: async () => {
    throw new Error("must not perform a real request");
  },
  timeoutMs: 100,
  scopeSource: "provider_geometry",
  predictionCreatedAt: "2026-08-17T00:00:00.000Z",
};

function setup({
  reservationResult = {
    reservationState: "RESERVED",
    reservationKey: "org-1:snapshot-1",
  },
  orchestrate = async () => ({ orchestrationState: "SUCCEEDED" }),
  releaseResult = { releaseState: "RELEASED" },
} = {}) {
  const calls = [];
  let task = null;
  const scheduler = (deferredTask) => {
    calls.push("register");
    task = deferredTask;
  };
  const rpc = async (functionName) => {
    calls.push(functionName);
    if (functionName.includes("reserve")) {
      return {
        data: [
          {
            reservation_state: reservationResult.reservationState,
            reason: reservationResult.reason ?? null,
            returned_reservation_key: reservationResult.reservationKey ?? null,
          },
        ],
        error: null,
      };
    }
    return {
      data: [{ release_state: releaseResult.releaseState }],
      error: null,
    };
  };
  return { calls, scheduler, rpc, getTask: () => task, orchestrate };
}

function input(overrides = {}) {
  return {
    policy,
    context,
    reservation,
    release: { reservationKey: reservation.reservationKey },
    rpc: async () => ({ data: [], error: null }),
    orchestration,
    ...overrides,
  };
}

test("default, missing, and malformed policy fail closed before registration", () => {
  for (const policyOverride of [
    { enabled: false, allowedOrganizationIds: [], samplingPercentage: 0 },
    { enabled: undefined, allowedOrganizationIds: [], samplingPercentage: 0 },
    { enabled: true, allowedOrganizationIds: "org-1", samplingPercentage: 101 },
  ]) {
    const fake = setup();
    const result = integrateRouteRiskShadowAlternativeRoutes(
      input({ policy: policyOverride, scheduler: fake.scheduler, rpc: fake.rpc })
    );
    assert.equal(result.integrationState, "NOT_ELIGIBLE");
    assert.deepEqual(fake.calls, []);
  }
});

test("ineligible B16 context performs no registration, reservation, or orchestration", () => {
  const fake = setup();
  const result = integrateRouteRiskShadowAlternativeRoutes(
    input({
      context: { ...context, organizationId: "other-org" },
      scheduler: fake.scheduler,
      rpc: fake.rpc,
      orchestrate: fake.orchestrate,
    })
  );
  assert.equal(result.integrationState, "NOT_ELIGIBLE");
  assert.deepEqual(fake.calls, []);
});

test("eligible work registers B15 but reservation waits for deferred execution", async () => {
  const fake = setup();
  let orchestrated = 0;
  const result = integrateRouteRiskShadowAlternativeRoutes(
    input({
      scheduler: fake.scheduler,
      rpc: fake.rpc,
      orchestrate: async () => {
        fake.calls.push("orchestrate");
        orchestrated += 1;
        return { orchestrationState: "SUCCEEDED" };
      },
    })
  );
  assert.equal(result.integrationState, "REGISTERED");
  assert.deepEqual(fake.calls, ["register"]);
  assert.equal(orchestrated, 0);

  await fake.getTask()();
  assert.deepEqual(fake.calls, [
    "register",
    "reserve_route_risk_shadow_provider_capacity",
    "orchestrate",
    "release_route_risk_shadow_provider_capacity",
  ]);
  assert.equal(orchestrated, 1);
});

test("denied or unavailable reservation prevents B14", async () => {
  for (const reservationState of ["DENIED", "UNAVAILABLE"]) {
    const fake = setup({ reservationResult: { reservationState } });
    let orchestrated = 0;
    integrateRouteRiskShadowAlternativeRoutes(
      input({
        scheduler: fake.scheduler,
        rpc: fake.rpc,
        orchestrate: async () => {
          orchestrated += 1;
          return { orchestrationState: "SUCCEEDED" };
        },
      })
    );
    await fake.getTask()();
    assert.equal(orchestrated, 0);
    assert.equal(
      fake.calls.filter((call) => call === "release_route_risk_shadow_provider_capacity").length,
      0
    );
  }
});

test("B14 success, structured failure, and throw all attempt release", async () => {
  for (const orchestrate of [
    async () => ({ orchestrationState: "SUCCEEDED" }),
    async () => ({ orchestrationState: "UNAVAILABLE" }),
    async () => {
      throw new Error("shadow failure");
    },
  ]) {
    const fake = setup({ orchestrate });
    integrateRouteRiskShadowAlternativeRoutes(
      input({ scheduler: fake.scheduler, rpc: fake.rpc, orchestrate })
    );
    await fake.getTask()();
    assert.equal(
      fake.calls.includes("release_route_risk_shadow_provider_capacity"),
      true
    );
  }
});

test("registration failure and release failure remain non-authoritative", async () => {
  const registrationFailure = integrateRouteRiskShadowAlternativeRoutes(
    input({ scheduler: () => { throw new Error("registration unavailable"); } })
  );
  assert.equal(registrationFailure.integrationState, "UNAVAILABLE");

  const fake = setup({ releaseResult: { releaseState: "UNAVAILABLE" } });
  const result = integrateRouteRiskShadowAlternativeRoutes(
    input({ scheduler: fake.scheduler, rpc: fake.rpc })
  );
  await fake.getTask()();
  assert.equal(result.integrationState, "REGISTERED");
});

test("uses stable reservation identity and does not alter production route authority", () => {
  const source = fs.readFileSync(
    "lib/fleet/integrateRouteRiskShadowAlternativeRoutes.ts",
    "utf8"
  );
  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  assert.match(source, /reservation/);
  assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\(|fetch\(/);
  assert.doesNotMatch(source, /score|rank|recommend|selectedRoute|rerout|escalat/i);
  assert.match(routeSource, /ENABLE_ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTES/);
  assert.doesNotMatch(routeSource, /computeAlternativeRoutes:\s*true/);
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
});

test("duplicate logical execution remains behind the B17 reservation gate", async () => {
  let reservationAttempts = 0;
  let orchestrated = 0;
  const fake = setup();
  fake.rpc = async (functionName) => {
    fake.calls.push(functionName);
    if (functionName.includes("reserve")) {
      reservationAttempts += 1;
      return {
        data: [
          {
            reservation_state: reservationAttempts === 1 ? "RESERVED" : "DENIED",
            reason: reservationAttempts === 1 ? null : "duplicate_reservation",
            returned_reservation_key:
              reservationAttempts === 1 ? reservation.reservationKey : null,
          },
        ],
        error: null,
      };
    }
    return { data: [{ release_state: "RELEASED" }], error: null };
  };

  const first = integrateRouteRiskShadowAlternativeRoutes(
    input({
      scheduler: fake.scheduler,
      rpc: fake.rpc,
      orchestrate: async () => {
        orchestrated += 1;
        return { orchestrationState: "SUCCEEDED" };
      },
    })
  );
  const firstTask = fake.getTask();
  assert.equal(first.integrationState, "REGISTERED");
  await firstTask();

  const second = integrateRouteRiskShadowAlternativeRoutes(
    input({
      scheduler: fake.scheduler,
      rpc: fake.rpc,
      orchestrate: async () => {
        orchestrated += 1;
        return { orchestrationState: "SUCCEEDED" };
      },
    })
  );
  assert.equal(second.integrationState, "REGISTERED");
  await fake.getTask()();
  assert.equal(orchestrated, 1);
});
