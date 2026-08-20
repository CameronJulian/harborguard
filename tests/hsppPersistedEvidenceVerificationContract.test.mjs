import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/readAndVerifyHsppEvidence.ts",
  "utf8"
);

test("persisted HSPP read is explicitly organization scoped", () => {
  assert.match(source, /\.from\("hspp_evidence"\)/);
  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
  );
  assert.match(
    source,
    /\.eq\(\s*"id",\s*normalizedEvidenceId\s*\)/
  );
  assert.match(source, /\.maybeSingle\(\)/);
});

test("persisted HSPP read selects canonical verification fields", () => {
  assert.match(source, /protocol_version/);
  assert.match(source, /canonicalization_version/);
  assert.match(source, /source_class/);
  assert.match(source, /source_provider/);
  assert.match(source, /source_stream/);
  assert.match(source, /source_message_id/);
  assert.match(source, /observed_at/);
  assert.match(source, /payload_schema_version/);
  assert.match(source, /normalized_payload/);
  assert.match(source, /integrity_algorithm/);
  assert.match(source, /integrity_fingerprint/);
});

test("persisted HSPP evidence is fed into the pure verifier", () => {
  assert.match(
    source,
    /verifyHsppEvidenceIntegrity\(\{/
  );
});

test("HSPP-004 performs no database mutation", () => {
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.upsert\(/);
  assert.doesNotMatch(source, /\.delete\(/);
});

test("HSPP-004 does not promote trust or downstream eligibility", () => {
  assert.doesNotMatch(
    source,
    /trustState:\s*"VERIFIED"/
  );
  assert.doesNotMatch(source, /crowdEligible\s*:/);
  assert.doesNotMatch(source, /trainingEligible\s*:/);
});
