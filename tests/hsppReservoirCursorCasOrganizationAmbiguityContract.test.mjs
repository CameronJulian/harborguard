import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260909190000_fix_hspp_reservoir_cursor_cas_organization_ambiguity.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");

function extractFunction(functionName) {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = sql.match(
    new RegExp(
      String.raw`create\s+or\s+replace\s+function\s+public\.${escaped}\s*\([\s\S]*?\$\$\s*;`,
      "i",
    ),
  );

  assert.ok(match, `missing ${functionName}`);

  return match[0];
}

test("pair cursor CAS targets its organization primary-key constraint", () => {
  const body = extractFunction(
    "compare_and_swap_hspp_reservoir_pair_scan_state",
  );

  assert.match(
    body,
    /returns\s+table\s*\([\s\S]*?\borganization_id\b/i,
  );

  assert.doesNotMatch(
    body,
    /on\s+conflict\s*\(\s*organization_id\s*\)/i,
  );

  assert.match(
    body,
    /on\s+conflict\s+on\s+constraint\s+hspp_reservoir_pair_scan_states_pkey/i,
  );
});

test("discovery cursor CAS targets its organization primary-key constraint", () => {
  const body = extractFunction(
    "compare_and_swap_hspp_reservoir_discovery_scan_state",
  );

  assert.match(
    body,
    /returns\s+table\s*\([\s\S]*?\borganization_id\b/i,
  );

  assert.doesNotMatch(
    body,
    /on\s+conflict\s*\(\s*organization_id\s*\)/i,
  );

  assert.match(
    body,
    /on\s+conflict\s+on\s+constraint\s+hspp_reservoir_discovery_scan_states_pkey/i,
  );
});

test("corrective migration changes only the two Reservoir cursor CAS functions", () => {
  const definitions = [
    ...sql.matchAll(
      /create\s+or\s+replace\s+function\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi,
    ),
  ].map((match) => match[1]);

  assert.deepEqual(definitions, [
    "compare_and_swap_hspp_reservoir_pair_scan_state",
    "compare_and_swap_hspp_reservoir_discovery_scan_state",
  ]);
});