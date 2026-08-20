import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const builder = fs.readFileSync(
  "lib/hspp/buildHsppEvidence.ts",
  "utf8"
);

const fingerprint = fs.readFileSync(
  "lib/hspp/createHsppIntegrityFingerprint.ts",
  "utf8"
);

const verifier = fs.readFileSync(
  "lib/hspp/verifyHsppEvidenceIntegrity.ts",
  "utf8"
);

test("HSPP builder and verifier share one fingerprint primitive", () => {
  assert.match(
    builder,
    /createHsppIntegrityFingerprint\(\{/
  );

  assert.match(
    verifier,
    /createHsppIntegrityFingerprint\(\{/
  );

  assert.doesNotMatch(
    builder,
    /createHash\(/
  );
});

test("shared HSPP fingerprint preserves the v0.1 canonical contract", () => {
  assert.match(fingerprint, /protocol_version:/);
  assert.match(fingerprint, /canonicalization_version:/);
  assert.match(fingerprint, /source_class:/);
  assert.match(fingerprint, /source_provider:/);
  assert.match(fingerprint, /source_stream:/);
  assert.match(fingerprint, /source_message_id:/);
  assert.match(fingerprint, /observed_at:/);
  assert.match(fingerprint, /payload_schema_version:/);
  assert.match(fingerprint, /normalized_payload:/);
});

test("receipt time remains outside the integrity fingerprint", () => {
  assert.doesNotMatch(
    fingerprint,
    /received_at\s*:/
  );

  assert.doesNotMatch(
    fingerprint,
    /receivedAt\s*:/
  );

  assert.match(
    fingerprint,
    /observed_at\s*:/
  );

  assert.match(
    fingerprint,
    /normalized_payload\s*:/
  );
});

test("HSPP verification returns explicit integrity outcomes", () => {
  assert.match(verifier, /status: "MATCH"/);
  assert.match(verifier, /status: "MISMATCH"/);
  assert.match(
    verifier,
    /"UNSUPPORTED_PROTOCOL_VERSION"/
  );
  assert.match(
    verifier,
    /"UNSUPPORTED_CANONICALIZATION_VERSION"/
  );
  assert.match(
    verifier,
    /"UNSUPPORTED_INTEGRITY_ALGORITHM"/
  );
});

test("HSPP verification validates protocol version before hashing", () => {
  const protocolCheck = verifier.indexOf(
    "UNSUPPORTED_PROTOCOL_VERSION"
  );

  const hashCall = verifier.indexOf(
    "createHsppIntegrityFingerprint({"
  );

  assert.ok(protocolCheck >= 0);
  assert.ok(hashCall > protocolCheck);
});

test("HSPP verification validates canonicalization version before hashing", () => {
  const versionCheck = verifier.indexOf(
    "UNSUPPORTED_CANONICALIZATION_VERSION"
  );

  const hashCall = verifier.indexOf(
    "createHsppIntegrityFingerprint({"
  );

  assert.ok(versionCheck >= 0);
  assert.ok(hashCall > versionCheck);
});

test("HSPP verification validates integrity algorithm before hashing", () => {
  const algorithmCheck = verifier.indexOf(
    "UNSUPPORTED_INTEGRITY_ALGORITHM"
  );

  const hashCall = verifier.indexOf(
    "createHsppIntegrityFingerprint({"
  );

  assert.ok(algorithmCheck >= 0);
  assert.ok(hashCall > algorithmCheck);
});

test("HSPP verifier compares stored and recomputed fingerprints", () => {
  assert.match(
    verifier,
    /expectedFingerprint\s*=\s*[\s\S]*input\.integrityFingerprint/
  );

  assert.match(
    verifier,
    /actualFingerprint\s*=\s*[\s\S]*actual\.integrityFingerprint/
  );

  assert.match(
    verifier,
    /timingSafeEqual/
  );
});

test("HSPP verifier does not mutate trust state", () => {
  assert.doesNotMatch(
    verifier,
    /trustState\s*=/
  );

  assert.doesNotMatch(
    verifier,
    /trustState:\s*"VERIFIED"/
  );
});

test("HSPP verifier does not change downstream eligibility", () => {
  assert.doesNotMatch(verifier, /crowdEligible\s*:/);
  assert.doesNotMatch(verifier, /trainingEligible\s*:/);
  assert.doesNotMatch(verifier, /validationEligible\s*:/);
});

test("HSPP verifier performs no database writes", () => {
  assert.doesNotMatch(verifier, /\.insert\(/);
  assert.doesNotMatch(verifier, /\.update\(/);
  assert.doesNotMatch(verifier, /\.upsert\(/);
  assert.doesNotMatch(verifier, /\.from\(\s*["']hspp_evidence["']/);
  assert.doesNotMatch(verifier, /supabase/);
});

test("HSPP canonical hashing remains SHA-256", () => {
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
    /\.update\(\s*canonicalEvidence,\s*"utf8"\s*\)/
  );

  assert.match(
    fingerprint,
    /\.digest\("hex"\)/
  );
});

test("HSPP verifier does not alter Route Safety or Crowd systems", () => {
  assert.doesNotMatch(verifier, /route_risk_segments/);
  assert.doesNotMatch(verifier, /road_risk_segments/);
  assert.doesNotMatch(verifier, /crowd_segment/);
});
