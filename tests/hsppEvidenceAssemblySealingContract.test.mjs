import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const implementation = fs.readFileSync(
  "lib/hspp/sealHsppEvidenceAssembly.ts",
  "utf8",
);

const migration = fs.readFileSync(
  "supabase/migrations/20260821184500_create_hspp_evidence_assembly_sealing_rpc.sql",
  "utf8",
);

test("B07C3 is an explicitly versioned sealing boundary", () => {
  assert.match(implementation, /HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION/);

  assert.match(implementation, /hspp-evidence-assembly-sealing-v1/);

  assert.match(implementation, /seal_hspp_evidence_assembly/);
});

test("B07C3 performs sealing through exactly one RPC", () => {
  const calls =
    implementation.match(/await\s+input\.supabase\.rpc\s*\(/g) ?? [];

  assert.equal(calls.length, 1);

  assert.doesNotMatch(implementation, /\.from\s*\(/);

  assert.doesNotMatch(implementation, /\.update\s*\(/);

  assert.doesNotMatch(implementation, /\.select\s*\(/);
});

test("B07C3 RPC locks the organization-scoped assembly before transition", () => {
  assert.match(
    migration,
    /from public\.hspp_evidence_assemblies[\s\S]*organization_id[\s\S]*p_organization_id[\s\S]*id[\s\S]*p_assembly_id[\s\S]*for update/s,
  );
});

test("B07C3 fails closed when assembly is absent or not OPEN", () => {
  assert.match(migration, /if not found then/);

  assert.match(migration, /was not found for this organization/);

  assert.match(migration, /v_assembly\.assembly_state <> 'OPEN'/);

  assert.match(migration, /is not OPEN and cannot be sealed/);
});

test("B07C3 performs only OPEN to SEALED lifecycle mutation", () => {
  assert.match(migration, /update public\.hspp_evidence_assemblies/);

  assert.match(migration, /assembly_state = 'SEALED'/);

  assert.match(migration, /sealed_at = now\(\)/);

  assert.doesNotMatch(
    migration,
    /insert into public\.hspp_evidence_assembly_members/i,
  );

  assert.doesNotMatch(
    migration,
    /delete from public\.hspp_evidence_assembly_members/i,
  );
});

test("B07C3 preserves service-role-only execution", () => {
  assert.match(migration, /security invoker/);

  assert.match(
    migration,
    /revoke all[\s\S]*from\s+public,\s*anon,\s*authenticated/s,
  );

  assert.match(migration, /grant execute[\s\S]*to service_role/s);
});

test("B07C3 does not absorb scanning or decision authority", () => {
  assert.doesNotMatch(implementation, /\bscanHsppEvidenceAssembly\s*\(/);

  assert.doesNotMatch(implementation, /\bevaluateHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(implementation, /\bpersistHsppAssemblyDecision\s*\(/);

  assert.match(implementation, /does NOT/i);

  assert.match(implementation, /Route Safety authority/);

  assert.match(implementation, /Crowd Intelligence eligibility/);

  assert.match(implementation, /ML training or validation eligibility/);
});

test("B07C3 introduces no API cron retry or scheduling behavior", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(implementation, pattern);
  }
});
