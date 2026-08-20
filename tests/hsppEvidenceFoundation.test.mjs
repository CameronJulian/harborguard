import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260820090000_create_hspp_evidence.sql",
  "utf8"
);

const canonicalizer = fs.readFileSync(
  "lib/hspp/canonicalizeHsppEvidence.ts",
  "utf8"
);

const builder = fs.readFileSync(
  "lib/hspp/buildHsppEvidence.ts",
  "utf8"
);

const persistence = fs.readFileSync(
  "lib/hspp/persistHsppEvidence.ts",
  "utf8"
);

test("HSPP evidence foundation creates a private evidence table", () => {
  assert.match(
    migration,
    /create table if not exists public\.hspp_evidence/i
  );

  assert.match(
    migration,
    /alter table public\.hspp_evidence enable row level security/i
  );
});

test("HSPP evidence keeps integrity trust and eligibility separate", () => {
  assert.match(migration, /integrity_state text not null/i);
  assert.match(migration, /trust_state text not null/i);
  assert.match(migration, /crowd_eligible boolean not null default false/i);
  assert.match(migration, /training_eligible boolean not null default false/i);
  assert.match(migration, /validation_eligible boolean not null default false/i);
});

test("HSPP v0.1 requires lowercase SHA-256 fingerprints", () => {
  assert.match(
    migration,
    /integrity_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/i
  );

  assert.match(
    builder,
    /createHash\(HSPP_INTEGRITY_ALGORITHM\)/
  );

  assert.match(
    builder,
    /\.digest\("hex"\)/
  );
});

test("HSPP canonicalization sorts object keys deterministically", () => {
  assert.match(
    canonicalizer,
    /Object\.keys\(value\)\.sort\(\)/
  );

  assert.match(
    canonicalizer,
    /JSON\.stringify/
  );
});

test("HSPP fingerprint excludes evidence id and receipt time", () => {
  const canonicalInputMatch = builder.match(
    /const canonicalInput = \{([\s\S]*?)\n  \};/
  );

  assert.ok(canonicalInputMatch);

  const canonicalInput = canonicalInputMatch[1];

  assert.doesNotMatch(canonicalInput, /evidenceId|evidence_id/);
  assert.doesNotMatch(canonicalInput, /receivedAt|received_at/);

  assert.match(canonicalInput, /source_message_id/);
  assert.match(canonicalInput, /observed_at/);
  assert.match(canonicalInput, /normalized_payload/);
});

test("HSPP persistence is isolated from vehicle_locations", () => {
  assert.match(
    persistence,
    /\.from\("hspp_evidence"\)/
  );

  assert.doesNotMatch(
    persistence,
    /\.from\("vehicle_locations"\)/
  );
});

test("HSPP migration does not modify production scoring tables", () => {
  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.road_risk_segments\b/i
  );

  assert.doesNotMatch(
    migration,
    /\balter\s+table\s+public\.road_risk_segments\b/i
  );

  assert.doesNotMatch(
    migration,
    /\bupdate\s+public\.route_intelligence\b/i
  );
});
