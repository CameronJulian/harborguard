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
const fingerprint = fs.readFileSync(
  "lib/hspp/createHsppIntegrityFingerprint.ts",
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
    fingerprint,
    /HSPP_INTEGRITY_ALGORITHM\s*=\s*[\s\S]*?"sha256"/
  );

  assert.match(
    fingerprint,
    /createHash\(\s*HSPP_INTEGRITY_ALGORITHM\s*\)/
  );

  assert.match(
    fingerprint,
    /\.digest\("hex"\)/
  );

  assert.match(
    migration,
    /\^\[0-9a-f\]\{64\}\$/
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

test("HSPP fingerprint excludes root evidence id and receipt time", () => {
  assert.doesNotMatch(
    fingerprint,
    /^\s*evidence_id\s*:/m
  );

  assert.doesNotMatch(
    fingerprint,
    /received_at\s*:/
  );

  assert.match(
    fingerprint,
    /parent_evidence_id\s*:/
  );

  assert.match(
    fingerprint,
    /protocol_version\s*:/
  );

  assert.match(
    fingerprint,
    /canonicalization_version\s*:/
  );

  assert.match(
    fingerprint,
    /source_message_id\s*:/
  );

  assert.match(
    fingerprint,
    /normalized_payload\s*:/
  );
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
