import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {
  loadDashboardFleet,
  readDashboardWithDeadline,
} from "../lib/dashboard/loadDashboardData.ts";

const source = fs.readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let loadAllSource;
function findLoader(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "loadAll") loadAllSource = node.getText(ast);
  ts.forEachChild(node, findLoader);
}
findLoader(ast);
assert.ok(loadAllSource, "Exercise the actual dashboard loader");
const compiled = ts.transpileModule(loadAllSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const never = () => new Promise(() => {});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const fleetBody = (path, marker = "current") =>
  path.endsWith("vehicles") ? { vehicles: [{ id: marker, is_active: true }] } :
  path.endsWith("trips") ? { trips: [{ status: "active" }] } :
  { alerts: [{ id: "open" }, { id: "closed", is_resolved: true }] };
const fleetResponse = (path, marker) => Response.json(fleetBody(path, marker));

function harness({ fetcher = async path => fleetResponse(path), reads = {}, timeoutMs = 35 } = {}) {
  const state = {};
  const mutations = [];
  const redirects = [];
  const calls = [];
  const signals = [];
  const changed = deferred();
  const refs = { fleetRequestId: { current: 0 }, dashboardReadController: { current: null } };
  const dependencies = {
    ...refs,
    fetchWithAuth: async (path, init) => {
      calls.push(path);
      signals.push(init.signal);
      return fetcher(path, init);
    },
    loadDashboardFleet: (fetch, options) => loadDashboardFleet(fetch, { ...options, timeoutMs }),
    readDashboardWithDeadline: (read, options) => readDashboardWithDeadline(read, { ...options, timeoutMs }),
    window: { location: { replace: url => redirects.push(url) } },
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: "signed-in-user" } } } }) },
      from(table) {
        const query = {
          select() { return query; }, eq() { return query; },
          order() { return query; }, single() { return query; },
          abortSignal(signal) { signals.push(signal); return query; },
          then(resolve, reject) {
            const fallback = table === "profiles"
              ? { data: { organization_id: "own-organization" }, error: null }
              : { data: [], error: null };
            return Promise.resolve().then(() => reads[table] ? reads[table]() : fallback).then(resolve, reject);
          },
        };
        return query;
      },
    },
  };
  for (const name of ["FleetDataStatus", "BatchDataStatus", "FleetVehicles", "FleetTrips", "FleetAlerts", "Batches", "Incidents", "RouteSafetyAlerts", "TrialEndsAt"]) {
    dependencies[`set${name}`] = value => {
      state[name] = value;
      mutations.push([name, value]);
      if (name === "FleetDataStatus" && value === "available") changed.resolve();
    };
  }
  const loadAll = new Function(...Object.keys(dependencies), `${compiled}\nreturn loadAll;`)(...Object.values(dependencies));
  return { state, mutations, redirects, calls, signals, refs, loadAll, fleetAvailable: changed.promise };
}

test("fleet becomes available while an unrelated profile read is stalled", async () => {
  const h = harness({ reads: { profiles: never } });
  const finished = h.loadAll();
  await h.fleetAvailable;
  assert.equal(h.state.FleetDataStatus, "available");
  assert.equal(h.state.BatchDataStatus, "loading");
  assert.equal(h.state.FleetVehicles.length, 1);
  assert.deepEqual(h.calls.sort(), ["/api/fleet/alerts", "/api/fleet/trips", "/api/fleet/vehicles"]);
  await finished;
  assert.equal(h.state.BatchDataStatus, "unavailable");
});

test("a stalled route-alert read does not hold fleet or completed batches", async () => {
  const h = harness({ reads: { route_safety_alerts: never, batches: () => ({ data: [{ id: "batch" }], error: null }) } });
  const finished = h.loadAll();
  await h.fleetAvailable;
  await finished;
  assert.equal(h.state.FleetDataStatus, "available");
  assert.equal(h.state.BatchDataStatus, "available");
  assert.equal(h.state.Batches[0].id, "batch");
});

test("a vehicle request that never settles ends as unavailable, not empty or healthy", async () => {
  const h = harness({ fetcher: (path) => path.endsWith("vehicles") ? never() : fleetResponse(path) });
  await h.loadAll();
  assert.equal(h.calls.length, 3, "Trips and alerts start without waiting for vehicles");
  assert.equal(h.state.FleetDataStatus, "unavailable");
  assert.equal(h.state.BatchDataStatus, "empty");
  assert.deepEqual(h.state.FleetVehicles, []);
  assert.ok(h.signals.every(signal => signal.aborted));
});

test("a retry can recover after the previous request timed out", async () => {
  let stalled = true;
  const h = harness({ fetcher: path => stalled ? never() : fleetResponse(path) });
  await h.loadAll();
  assert.equal(h.state.FleetDataStatus, "unavailable");
  stalled = false;
  await h.loadAll();
  assert.equal(h.state.FleetDataStatus, "available");
  assert.equal(h.state.FleetAlerts.length, 1, "Resolved alerts are excluded");
});

test("a superseded read is cancelled and late results cannot replace the new fleet", async () => {
  const late = deferred();
  let old = true;
  const h = harness({ fetcher: path => old ? late.promise.then(() => fleetResponse(path, "old")) : fleetResponse(path, "new") });
  const first = h.loadAll();
  await Promise.resolve();
  const oldController = h.refs.dashboardReadController.current;
  old = false;
  const second = h.loadAll();
  assert.equal(oldController.signal.aborted, true);
  await Promise.all([first, second]);
  const count = h.mutations.length;
  late.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.state.FleetVehicles[0].id, "new");
  assert.equal(h.mutations.length, count);
});

test("unmount cancellation prevents subsequent state updates", async () => {
  const h = harness({ fetcher: never, reads: { profiles: never } });
  const finished = h.loadAll();
  h.refs.fleetRequestId.current += 1;
  h.refs.dashboardReadController.current.abort();
  const count = h.mutations.length;
  await finished;
  assert.equal(h.mutations.length, count);
});

test("a confirmed missing organization still redirects to onboarding", async () => {
  const h = harness({ reads: { profiles: () => ({ data: { organization_id: null }, error: null }) } });
  await h.loadAll();
  assert.deepEqual(h.redirects, ["/onboarding"]);
});

test("a failed profile read is not treated as a confirmed missing organization", async () => {
  const h = harness({ reads: { profiles: () => ({ data: null, error: { message: "permission denied" } }) } });
  await h.loadAll();
  assert.deepEqual(h.redirects, []);
  assert.equal(h.state.BatchDataStatus, "unavailable");
  assert.equal(h.state.FleetDataStatus, "available");
});

test("an empty verified fleet is distinguished from a failed read", async () => {
  const h = harness({ fetcher: async path => Response.json({
    [path.endsWith("vehicles") ? "vehicles" : path.endsWith("trips") ? "trips" : "alerts"]: [],
  }) });
  await h.loadAll();
  assert.equal(h.state.FleetDataStatus, "empty");
});

test("an HTTP failure or malformed response never publishes a healthy fleet", async () => {
  for (const response of [Response.json({ error: "Unavailable" }, { status: 503 }), Response.json({ vehicles: "invalid" })]) {
    const h = harness({ fetcher: async path => path.endsWith("vehicles") ? response : fleetResponse(path) });
    await h.loadAll();
    assert.equal(h.state.FleetDataStatus, "unavailable");
  }
});

test("the deadline also covers session lookup and reading the response body", async () => {
  await assert.rejects(readDashboardWithDeadline(never, { timeoutMs: 5 }), { name: "TimeoutError" });
  await assert.rejects(loadDashboardFleet(async () => ({ ok: true, json: never }), { timeoutMs: 5 }), { name: "TimeoutError" });
});

test("an already cancelled read never starts work", async () => {
  const controller = new AbortController();
  controller.abort();
  let started = false;
  await assert.rejects(readDashboardWithDeadline(async () => { started = true; }, { signal: controller.signal }));
  assert.equal(started, false);
});
