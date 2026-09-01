import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260901093000_create_hspp_reservoir_pair_fair_scan.sql",
);

const source = fs.readFileSync(
  migrationPath,
  "utf8",
);


test("Reservoir pair scheduling has a dedicated non-authoritative state version", () => {
  assert.match(
    source,
    /hspp-reservoir-pair-scheduling-v1/,
  );

  assert.match(
    source,
    /create\s+table\s+public\.hspp_reservoir_pair_scan_states/i,
  );

  assert.match(
    source,
    /cursor_first_evidence_id\s+uuid/i,
  );

  assert.match(
    source,
    /cursor_second_evidence_id\s+uuid/i,
  );

  assert.match(
    source,
    /previous_cursor_first_evidence_id\s+uuid/i,
  );

  assert.match(
    source,
    /previous_cursor_second_evidence_id\s+uuid/i,
  );
});


test("Reservoir pair identity is canonical UUID ordering only", () => {
  assert.match(
    source,
    /cursor_first_evidence_id\s*<\s*cursor_second_evidence_id/i,
  );

  assert.match(
    source,
    /second_evidence\.id\s*>\s*first_evidence\.id/i,
  );
});


test("Reservoir pair page is bounded to one hundred raw pair opportunities", () => {
  assert.match(
    source,
    /create\s+or\s+replace\s+function\s+public\.read_hspp_reservoir_pair_page/i,
  );

  assert.match(
    source,
    /p_limit\s*>\s*100/i,
  );

  assert.match(
    source,
    /limit\s+p_limit/i,
  );

  assert.match(
    source,
    /pair_ordinal/i,
  );
});


test("Reservoir pair page performs deterministic circular traversal", () => {
  assert.match(
    source,
    /with\s+after_cursor\s+as/i,
  );

  assert.match(
    source,
    /wrapped\s+as/i,
  );

  assert.match(
    source,
    /\(\s*first_evidence\.id\s*,\s*second_evidence\.id\s*\)\s*>\s*\(/i,
  );

  assert.match(
    source,
    /\(\s*first_evidence\.id\s*,\s*second_evidence\.id\s*\)\s*<=\s*\(/i,
  );

  assert.match(
    source,
    /order\s+by\s+first_evidence\.id\s+asc\s*,\s*second_evidence\.id\s+asc/i,
  );

  assert.match(
    source,
    /proposed_cursor\s+as/i,
  );

  assert.match(
    source,
    /pair_ordinal\s+desc[\s\S]*limit\s+1/i,
  );
});


test("Reservoir pair page traverses raw HSPP evidence rather than pre-authorized Reservoir rows", () => {
  assert.match(
    source,
    /public\.hspp_evidence/i,
  );

  assert.doesNotMatch(
    source,
    /evaluateHsppReservoirEligibility/,
  );

  assert.doesNotMatch(
    source,
    /evaluateHsppAssemblyMembership/,
  );

  assert.doesNotMatch(
    source,
    /hspp_evidence_assembly_members[\s\S]*as\s+historical_member/i,
  );
});


test("Reservoir pair scan state is not directly accessible", () => {
  assert.match(
    source,
    /alter\s+table\s+public\.hspp_reservoir_pair_scan_states\s+enable\s+row\s+level\s+security/i,
  );

  for (const role of [
    "public",
    "anon",
    "authenticated",
    "service_role",
  ]) {
    assert.match(
      source,
      new RegExp(
        `revoke\\s+all\\s+on\\s+table\\s+public\\.hspp_reservoir_pair_scan_states\\s+from\\s+${role}`,
        "i",
      ),
    );
  }
});


test("Reservoir pair reader is service-role-only and read-only", () => {
  assert.match(
    source,
    /read_hspp_reservoir_pair_page[\s\S]*security\s+definer/i,
  );

  assert.match(
    source,
    /grant\s+execute\s+on\s+function\s+public\.read_hspp_reservoir_pair_page\s*\(\s*uuid\s*,\s*integer\s*\)\s+to\s+service_role/i,
  );

  assert.doesNotMatch(
    source.match(
      /create\s+or\s+replace\s+function\s+public\.read_hspp_reservoir_pair_page[\s\S]*?comment\s+on\s+function/i,
    )?.[0] ?? "",
    /\b(insert|update|delete)\s+(into\s+)?public\.hspp_/i,
  );
});


test("Reservoir pair CAS validates exact raw pair identities", () => {
  assert.match(
    source,
    /compare_and_swap_hspp_reservoir_pair_scan_state/i,
  );

  assert.match(
    source,
    /p_expected_first_evidence_id\s*<\s*p_expected_second_evidence_id/i,
  );

  assert.match(
    source,
    /p_proposed_first_evidence_id\s*<\s*p_proposed_second_evidence_id/i,
  );

  assert.match(
    source,
    /expected cursor does not identify an exact organization-scoped raw HSPP evidence pair/i,
  );

  assert.match(
    source,
    /proposed cursor does not identify an exact organization-scoped raw HSPP evidence pair/i,
  );
});


test("Reservoir pair CAS preserves optimistic concurrency states and circular wrap", () => {
  for (const state of [
    "CREATED",
    "STALE",
    "NO_CHANGE",
    "ADVANCED",
  ]) {
    assert.match(
      source,
      new RegExp(
        `'${state}'::text`,
      ),
    );
  }

  assert.match(
    source,
    /is\s+distinct\s+from/i,
  );

  assert.doesNotMatch(
    source,
    /proposed.*>\s*expected/i,
  );
});


test("Reservoir pair scheduling grants no semantic authority", () => {
  assert.match(
    source,
    /scheduling only/i,
  );

  assert.match(
    source,
    /grants no Reservoir, assembly, reconstruction, trust or downstream authority/i,
  );

  assert.doesNotMatch(
    source,
    /\binsert\s+into\s+public\.hspp_evidence_assemblies\b/i,
  );

  assert.doesNotMatch(
    source,
    /\binsert\s+into\s+public\.hspp_evidence_assembly_members\b/i,
  );

  assert.doesNotMatch(
    source,
    /\bupdate\s+public\.hspp_evidence\b/i,
  );
});
