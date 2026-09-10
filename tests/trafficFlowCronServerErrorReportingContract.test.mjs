import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  new URL(
    "../app/api/traffic-flow/cron/route.ts",
    import.meta.url
  ),
  "utf8"
);

test("Traffic Flow imports shared reporter", () => {
  assert.match(
    route,
    /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
  );
});

test("missing CRON_SECRET is reported", () => {
  assert.match(
    route,
    /boundary:\s*["']cron-secret-missing["']/
  );
});

test("missing Supabase config is reported", () => {
  assert.match(
    route,
    /boundary:\s*["']supabase-service-role-config["']/
  );
});

test("missing traffic organization id is reported", () => {
  assert.match(
    route,
    /boundary:\s*["']traffic-organization-id-missing["']/
  );
});

test("unknown traffic organization is reported", () => {
  assert.match(
    route,
    /boundary:\s*["']traffic-organization-not-found["']/
  );
});

test("outer runtime failures are reported", () => {
  assert.match(
    route,
    /boundary:\s*["']outer-request["']/
  );
});

test("unauthorized cron requests remain 401", () => {
  assert.match(
    route,
    /authorization\s*!==\s*`Bearer \$\{cronSecret\}`[\s\S]*?status:\s*401/
  );
});

test("duplicate and processing remain successful skips", () => {
  assert.match(
    route,
    /if\s*\(\s*!claim\.claimed\s*\)[\s\S]*?success:\s*true[\s\S]*?skipped:/
  );

  assert.match(route, /["']duplicate["']/);
  assert.match(route, /["']processing["']/);
});

test("receipt failure still rethrows", () => {
  assert.match(
    route,
    /failTrafficFlowCollection[\s\S]*?throw\s+error\s*;/
  );

  assert.match(
    route,
    /catch\s*\(\s*finalizationError\s*\)[\s\S]*?AggregateError/
  );
});

test("Traffic Flow contains exactly five reporter calls", () => {
  const calls =
    route.match(/reportServerError\s*\(/g) ?? [];

  assert.equal(calls.length, 5);
});

test("secret material is not attached as reporter metadata", () => {
  assert.doesNotMatch(
    route,
    /extra:\s*\{[\s\S]*?cronSecret/
  );

  assert.doesNotMatch(
    route,
    /extra:\s*\{[\s\S]*?serviceRoleKey/
  );

  assert.doesNotMatch(
    route,
    /extra:\s*\{[\s\S]*?authorization/
  );
});