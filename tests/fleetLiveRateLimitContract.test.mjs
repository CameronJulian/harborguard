import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "app/api/fleet/live/route.ts",
  "utf8"
);

const limiter = fs.readFileSync(
  "lib/ratelimit.ts",
  "utf8"
);

test("Fleet Live owns a dedicated rate limiter", () => {
  assert.match(
    limiter,
    /export\s+const\s+fleetLiveRatelimit\s*=\s*new\s+Ratelimit/
  );

  assert.match(
    limiter,
    /fleetLiveRatelimit[\s\S]*Ratelimit\.slidingWindow\(\s*120\s*,\s*"10 s"\s*\)/
  );
});

test("Fleet Live imports its dedicated limiter", () => {
  assert.match(
    route,
    /import\s+\{[\s\S]*?\bfleetLiveRatelimit\b[\s\S]*?\}\s+from\s+"@\/lib\/ratelimit"/
  );
});

test("Fleet Live receives the request boundary", () => {
  assert.match(
    route,
    /export\s+async\s+function\s+GET\s*\(\s*request:\s*NextRequest\s*\)/
  );
});

test("Fleet Live authenticates before limiting", () => {
  const authIndex =
    route.indexOf("await requireOrganization()");

  const limiterIndex =
    route.indexOf("await fleetLiveRatelimit.limit");

  assert.notEqual(authIndex, -1);
  assert.notEqual(limiterIndex, -1);

  assert.ok(authIndex < limiterIndex);
});

test("Fleet Live limits before database fan-out", () => {
  const limiterIndex =
    route.indexOf("await fleetLiveRatelimit.limit");

  const vehicleReadIndex =
    route.indexOf('.from("vehicles")');

  assert.notEqual(limiterIndex, -1);
  assert.notEqual(vehicleReadIndex, -1);

  assert.ok(limiterIndex < vehicleReadIndex);
});

test("Fleet Live limiter key includes organization and IP", () => {
  assert.match(
    route,
    /`fleet-live:\$\{organizationId\}:\$\{ip\}`/
  );

  assert.match(route, /x-forwarded-for/);
  assert.match(route, /x-real-ip/);
});

test("Fleet Live returns 429 when limited", () => {
  assert.match(
    route,
    /if\s*\(\s*!rate\.success\s*\)/
  );

  assert.match(
    route,
    /\{\s*status:\s*429\s*\}/
  );
});

test("Fleet Live response shape remains unchanged", () => {
  assert.match(
    route,
    /return\s+NextResponse\.json\(\{\s*fleet\s*\}\)/
  );
});
