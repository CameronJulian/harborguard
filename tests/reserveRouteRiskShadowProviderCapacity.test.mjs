import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  reserveRouteRiskShadowProviderCapacity,
  releaseRouteRiskShadowProviderCapacity,
} from "../lib/fleet/reserveRouteRiskShadowProviderCapacity.ts";

const configuration = {
  windowSeconds: 60,
  leaseSeconds: 30,
  globalCallLimit: 10,
  organizationCallLimit: 5,
  globalConcurrencyLimit: 3,
  organizationConcurrencyLimit: 2,
};

function rpcReturning(data, error = null) {
  const calls = [];
  const rpc = async (functionName, args) => {
    calls.push({ functionName, args });
    return { data, error };
  };
  return { calls, rpc };
}

test("returns RESERVED only for a valid atomic RPC result", async () => {
  const fake = rpcReturning([
    {
      reservation_state: "RESERVED",
      reason: null,
      returned_reservation_key: "snapshot-1",
    },
  ]);
  const result = await reserveRouteRiskShadowProviderCapacity({
    rpc: fake.rpc,
    reservationKey: "snapshot-1",
    organizationId: "org-1",
    configuration,
  });

  assert.equal(result.reservationState, "RESERVED");
  assert.equal(result.reservationKey, "snapshot-1");
  assert.equal(fake.calls.length, 1);
});

test("propagates supported denial reasons without allowing capacity", async () => {
  for (const reason of [
    "global_capacity_exhausted",
    "organization_capacity_exhausted",
    "global_concurrency_exhausted",
    "organization_concurrency_exhausted",
    "duplicate_reservation",
  ]) {
    const fake = rpcReturning([{ reservation_state: "DENIED", reason }]);
    const result = await reserveRouteRiskShadowProviderCapacity({
      rpc: fake.rpc,
      reservationKey: "snapshot-1",
      organizationId: "org-1",
      configuration,
    });
    assert.equal(result.reservationState, "DENIED");
    assert.equal(result.reason, reason);
    assert.equal(result.reservationKey, null);
  }
});

test("fails closed for invalid configuration, persistence errors, and malformed RPC data", async () => {
  const invalid = await reserveRouteRiskShadowProviderCapacity({
    rpc: async () => {
      throw new Error("must not execute");
    },
    reservationKey: "snapshot-1",
    organizationId: "org-1",
    configuration: { ...configuration, globalCallLimit: 0 },
  });
  assert.equal(invalid.reservationState, "DENIED");
  assert.equal(invalid.reason, "invalid_configuration");

  const unavailable = await reserveRouteRiskShadowProviderCapacity({
    rpc: async () => ({ data: null, error: new Error("database unavailable") }),
    reservationKey: "snapshot-1",
    organizationId: "org-1",
    configuration,
  });
  assert.equal(unavailable.reservationState, "UNAVAILABLE");
  assert.equal(unavailable.reason, "persistence_unavailable");

  const malformed = await reserveRouteRiskShadowProviderCapacity({
    rpc: async () => ({ data: [{ reservation_state: "ALLOW" }], error: null }),
    reservationKey: "snapshot-1",
    organizationId: "org-1",
    configuration,
  });
  assert.equal(malformed.reservationState, "UNAVAILABLE");
});

test("releases temporary capacity and fails closed when release is unavailable", async () => {
  const released = await releaseRouteRiskShadowProviderCapacity({
    rpc: async () => ({ data: [{ release_state: "RELEASED" }], error: null }),
    reservationKey: "snapshot-1",
  });
  assert.equal(released.releaseState, "RELEASED");

  const notFound = await releaseRouteRiskShadowProviderCapacity({
    rpc: async () => ({ data: [{ release_state: "NOT_FOUND" }], error: null }),
    reservationKey: "snapshot-1",
  });
  assert.equal(notFound.releaseState, "NOT_FOUND");

  const unavailable = await releaseRouteRiskShadowProviderCapacity({
    rpc: async () => ({ data: null, error: new Error("database unavailable") }),
    reservationKey: "snapshot-1",
  });
  assert.equal(unavailable.releaseState, "UNAVAILABLE");
});

test("defensively parses only the first release row while the RPC contract remains single-row", async () => {
  const released = await releaseRouteRiskShadowProviderCapacity({
    rpc: async () => ({
      data: [
        { release_state: "RELEASED" },
        { release_state: "NOT_FOUND" },
      ],
      error: null,
    }),
    reservationKey: "snapshot-1",
  });

  assert.equal(released.releaseState, "RELEASED");
});

test("preserves organization and reservation identity in RPC inputs", async () => {
  const fake = rpcReturning([
    {
      reservation_state: "RESERVED",
      reason: null,
      returned_reservation_key: "snapshot-2",
    },
  ]);
  await reserveRouteRiskShadowProviderCapacity({
    rpc: fake.rpc,
    reservationKey: "snapshot-2",
    organizationId: "org-2",
    configuration,
  });

  assert.equal(fake.calls[0].args.p_reservation_key, "snapshot-2");
  assert.equal(fake.calls[0].args.p_organization_id, "org-2");
  assert.equal(fake.calls[0].args.p_global_call_limit, 10);
});

test("contains no provider execution or production integration", () => {
  const source = fs.readFileSync(
    "lib/fleet/reserveRouteRiskShadowProviderCapacity.ts",
    "utf8"
  );
  const migration = fs.readFileSync(
    "supabase/migrations/20260817090000_create_route_risk_shadow_provider_capacity.sql",
    "utf8"
  );
  const correctionMigration = fs.readFileSync(
    "supabase/migrations/20260817100000_fix_route_risk_shadow_provider_capacity_release.sql",
    "utf8"
  );
  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /fetch\(|GOOGLE_ROUTES|B14|B15|computeAlternativeRoutes|score|rank|recommend|select(ed)?Route|rerout|escalat/i
  );
  assert.doesNotMatch(source, /process\.env|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /reserve_route_risk_shadow_provider_capacity/);
  assert.match(migration, /release_route_risk_shadow_provider_capacity/);
  assert.match(
    correctionMigration,
    /if found then\s+return query select 'RELEASED'::text;\s+return;\s+end if;/s
  );
  assert.match(correctionMigration, /security definer/i);
  assert.match(correctionMigration, /search_path = public/);
  assert.match(correctionMigration, /pg_advisory_xact_lock/);
  assert.match(
    correctionMigration,
    /revoke all on function public\.release_route_risk_shadow_provider_capacity\(text\)/
  );
  assert.match(
    correctionMigration,
    /grant execute on function public\.release_route_risk_shadow_provider_capacity\(text\)\s+to service_role/s
  );
  assert.doesNotMatch(
    routeSource,
    /reserveRouteRiskShadowProviderCapacity|releaseRouteRiskShadowProviderCapacity/
  );
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
});
