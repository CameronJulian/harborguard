import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260821210500_persist_hspp_assembly_membership_relation.sql",
    import.meta.url,
  ),
  "utf8",
);

const persistence = fs.readFileSync(
  new URL("../lib/hspp/persistHsppEvidenceAssembly.ts", import.meta.url),
  "utf8",
);

const handoff = fs.readFileSync(
  new URL(
    "../lib/hspp/persistHsppReservoirAssemblyCandidate.ts",
    import.meta.url,
  ),
  "utf8",
);

test("K5 creates dedicated immutable B11A2 relation provenance", () => {
  assert.match(
    migration,
    /create table public\.hspp_evidence_assembly_membership_relations/i,
  );

  for (const column of [
    "organization_id",
    "assembly_id",
    "first_evidence_id",
    "second_evidence_id",
    "membership_eligible",
    "membership_policy_version",
    "membership_reason",
    "distance_meters",
    "time_delta_ms",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, "i"));
  }

  assert.match(migration, /first_evidence_id\s*<>\s*second_evidence_id/i);

  assert.match(migration, /unique\s*\(\s*organization_id,\s*assembly_id\s*\)/i);

  assert.match(
    migration,
    /prevent_hspp_evidence_assembly_membership_relation_update/i,
  );

  assert.match(
    migration,
    /prevent_hspp_evidence_assembly_membership_relation_delete/i,
  );
});

test("K5 keeps relation persistence inside the atomic assembly RPC", () => {
  assert.match(
    migration,
    /persist_hspp_evidence_assembly\s*\([\s\S]*p_membership_relation\s+jsonb\s+default\s+null/i,
  );

  const assemblyInsert = migration.indexOf(
    "insert into public.hspp_evidence_assemblies",
  );

  const memberInsert = migration.indexOf(
    "insert into public.hspp_evidence_assembly_members (",
    assemblyInsert,
  );

  const relationInsert = migration.indexOf(
    "public.hspp_evidence_assembly_membership_relations",
    memberInsert,
  );

  assert.notEqual(assemblyInsert, -1);
  assert.notEqual(memberInsert, -1);
  assert.notEqual(relationInsert, -1);

  assert.ok(assemblyInsert < memberInsert && memberInsert < relationInsert);
});

test("K5 validates provenance but never reruns B11A2", () => {
  assert.doesNotMatch(persistence, /\bevaluateHsppAssemblyMembership\s*\(/);

  assert.doesNotMatch(handoff, /\bevaluateHsppAssemblyMembership\s*\(/);

  assert.doesNotMatch(migration, /evaluateHsppAssemblyMembership/i);
});

test("B07C2 passes every authoritative B11A2 decision field", () => {
  assert.match(handoff, /firstEvidenceId:\s*selected\.firstEvidenceId/);

  assert.match(handoff, /secondEvidenceId:\s*selected\.secondEvidenceId/);

  assert.match(
    handoff,
    /membershipEligible:\s*selected\.membershipDecision\.eligible/,
  );

  assert.match(
    handoff,
    /membershipPolicyVersion:\s*selected\.membershipDecision\.policyVersion/,
  );

  assert.match(
    handoff,
    /membershipReason:\s*selected\.membershipDecision\.reason/,
  );

  assert.match(
    handoff,
    /distanceMeters:\s*selected\.membershipDecision\.distanceMeters/,
  );

  assert.match(
    handoff,
    /timeDeltaMs:\s*selected\.membershipDecision\.timeDeltaMs/,
  );
});

test("K5 grants no downstream trust or authority", () => {
  const implementation = persistence + "\n" + handoff + "\n" + migration;

  assert.doesNotMatch(implementation, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(implementation, /\bevaluateHsppMemberCorroboration\s*\(/);

  assert.doesNotMatch(
    implementation,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );
});
