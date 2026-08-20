import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260820113000_add_hspp_derivation_lineage.sql",
  "utf8"
);

const fingerprint = fs.readFileSync(
  "lib/hspp/createHsppIntegrityFingerprint.ts",
  "utf8"
);

const builder = fs.readFileSync(
  "lib/hspp/buildHsppEvidence.ts",
  "utf8"
);

const verifier = fs.readFileSync(
  "lib/hspp/verifyHsppEvidenceIntegrity.ts",
  "utf8"
);

test("HSPP lineage schema stores parent identity and versioned derivation", () => {
  assert.match(migration, /parent_evidence_id/);
  assert.match(migration, /parent_integrity_fingerprint/);
  assert.match(migration, /derivation_type/);
  assert.match(migration, /derivation_version/);
});

test("HSPP lineage parent relationship binds tenant id and fingerprint", () => {
  assert.match(
    migration,
    /unique\s*\(\s*organization_id,\s*id,\s*integrity_fingerprint\s*\)/
  );

  assert.match(
    migration,
    /foreign key\s*\(\s*organization_id,\s*parent_evidence_id,\s*parent_integrity_fingerprint\s*\)/
  );

  assert.match(
    migration,
    /references public\.hspp_evidence\s*\(\s*organization_id,\s*id,\s*integrity_fingerprint\s*\)/
  );
});

test("HSPP lineage does not use an unscoped parent foreign key", () => {
  assert.doesNotMatch(
    migration,
    /parent_evidence_id uuid null\s+references public\.hspp_evidence\(id\)/
  );
});
test("HSPP lineage requires the complete lineage tuple", () => {
  assert.match(
    migration,
    /num_nonnulls\([\s\S]*parent_evidence_id[\s\S]*parent_integrity_fingerprint[\s\S]*derivation_type[\s\S]*derivation_version[\s\S]*\)\s+in\s+\(0,\s*4\)/
  );
});

test("HSPP lineage parent fingerprint must be lowercase SHA-256", () => {
  assert.match(
    migration,
    /parent_integrity_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/
  );
});

test("HSPP preserves canonical v1 and introduces lineage v2", () => {
  assert.match(
    fingerprint,
    /hspp-canonical-json-v1/
  );

  assert.match(
    fingerprint,
    /hspp-canonical-json-lineage-v2/
  );
});

test("lineage v2 binds parent fingerprint and derivation identity into canonical evidence", () => {
  assert.match(
    fingerprint,
    /derivation_lineage/
  );

  assert.match(
    fingerprint,
    /parent_integrity_fingerprint/
  );

  assert.match(
    fingerprint,
    /derivation_type/
  );

  assert.match(
    fingerprint,
    /derivation_version/
  );
});

test("root builder evidence remains canonical v1", () => {
  assert.match(
    builder,
    /derivationLineage[\s\S]*\? HSPP_CANONICALIZATION_VERSION_V2[\s\S]*: HSPP_CANONICALIZATION_VERSION_V1/
  );
});

test("verifier supports both canonicalization generations", () => {
  assert.match(
    verifier,
    /HSPP_CANONICALIZATION_VERSION_V1/
  );

  assert.match(
    verifier,
    /HSPP_CANONICALIZATION_VERSION_V2/
  );
});

test("HSPP-005A does not alter trust or downstream eligibility", () => {
  assert.doesNotMatch(
    verifier,
    /trustState:\s*"VERIFIED"/
  );

  assert.doesNotMatch(
    verifier,
    /crowdEligible\s*:/
  );

  assert.doesNotMatch(
    verifier,
    /trainingEligible\s*:/
  );
});
