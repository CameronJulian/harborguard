import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const implementation = fs.readFileSync(
  "lib/hspp/persistHsppEvidenceAssembly.ts",
  "utf8",
);

const migration = fs.readFileSync(
  "supabase/migrations/20260821174500_create_hspp_evidence_assembly_persistence_rpc.sql",
  "utf8",
);

test("B07C1 is explicitly versioned", () => {
  assert.match(implementation, /hspp-evidence-assembly-persistence-v1/);
});

test("B07C1 application code performs exactly one RPC persistence call", () => {
  assert.match(implementation, /\.rpc\s*\(/);

  const rpcCalls = implementation.match(/\.rpc\s*\(/g) ?? [];

  assert.equal(rpcCalls.length, 1);

  assert.doesNotMatch(implementation, /\.from\s*\(/);

  assert.doesNotMatch(implementation, /\.insert\s*\(/);
});

test("B07C1 RPC atomically inserts assembly then members in one database function", () => {
  assert.match(
    migration,
    /create or replace function public\.persist_hspp_evidence_assembly/,
  );

  assert.match(migration, /insert into public\.hspp_evidence_assemblies/);

  assert.match(migration, /insert into public\.hspp_evidence_assembly_members/);

  assert.match(migration, /language plpgsql/);

  assert.match(migration, /security invoker/);
});

test("B07C1 RPC is service-role only", () => {
  assert.match(
    migration,
    /revoke all[\s\S]*from public,\s*anon,\s*authenticated/s,
  );

  assert.match(migration, /grant execute[\s\S]*to service_role/s);
});

test("B07C1 binds exact evidence fingerprints and deterministic ordinals", () => {
  assert.match(migration, /evidence_integrity_fingerprint/);

  assert.match(migration, /member_ordinal/);

  assert.match(migration, /v_ordinal := v_ordinal \+ 1/);
});

test("B07C1 creates OPEN assemblies only", () => {
  assert.match(migration, /'OPEN'/);

  assert.doesNotMatch(implementation, /\.update\s*\(/);

  assert.doesNotMatch(migration, /assembly_state\s*=\s*'SEALED'/);
});

test("B07C1 grants no downstream authority", () => {
  assert.match(migration, /does NOT/i);

  assert.match(migration, /Route Safety authority/);

  assert.match(migration, /Crowd Intelligence eligibility/);

  assert.match(migration, /ML training or validation eligibility/);

  assert.doesNotMatch(implementation, /\bpersistHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(implementation, /\bapplyHsppAssessmentDecision\s*\(/);
});
