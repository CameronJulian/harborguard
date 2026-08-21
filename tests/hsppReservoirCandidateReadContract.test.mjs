import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/readHsppReservoirCandidates.ts",
  "utf8",
);

test("B06B is explicitly versioned and bounded", () => {
  assert.match(source, /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/);

  assert.match(source, /hspp-reservoir-discovery-v1/);

  assert.match(source, /HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT\s*=\s*100/);

  assert.match(source, /\.limit\(normalizedLimit\)/);
});

test("B06B discovery is organization scoped and deterministic", () => {
  assert.match(source, /\.from\("hspp_evidence"\)/);

  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/s,
  );

  assert.match(source, /\.order\(\s*"observed_at",[\s\S]*?ascending:\s*true/s);

  assert.match(source, /\.order\(\s*"id",[\s\S]*?ascending:\s*true/s);
});

test("B06B reuses operational verification and B06A policy", () => {
  assert.match(source, /readHsppEvidenceBatchForOperationalUse/);

  assert.match(source, /evaluateHsppReservoirEligibility/);
});

test("B06B performs one organization-scoped membership batch lookup", () => {
  assert.match(source, /\.from\(\s*"hspp_evidence_assembly_members"\s*\)/s);

  assert.match(source, /\.select\("evidence_id"\)/);

  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/s,
  );

  assert.match(source, /\.in\(\s*"evidence_id",\s*evidenceIds\s*\)/s);
});

test("B06B remains SELECT-only and grants no downstream authority", () => {
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);

  assert.match(source, /does NOT/i);

  assert.match(source, /create or mutate an evidence assembly/);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);

  assert.match(source, /schedule retry or background processing/);
});
