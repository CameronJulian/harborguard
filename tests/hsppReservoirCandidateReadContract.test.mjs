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

test("B06B discovery remains organization scoped and deterministic", () => {
  assert.match(source, /\.from\("hspp_evidence"\)/);

  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/s,
  );

  assert.match(source, /\.order\(\s*"observed_at",[\s\S]*?ascending:\s*true/s);

  assert.match(source, /\.order\(\s*"id",[\s\S]*?ascending:\s*true/s);
});

test("B06B reuses operational verification and B06A policy unchanged", () => {
  assert.match(source, /readHsppEvidenceBatchForOperationalUse/);

  assert.match(source, /evaluateHsppReservoirEligibility/);
});

test("B06B performs exactly one Q14af current-effective membership read", () => {
  const calls =
    source.match(
      /\.rpc\(\s*"read_hspp_current_effective_assembly_memberships"/g,
    ) ?? [];

  assert.equal(calls.length, 1);

  assert.match(
    source,
    /p_organization_id:\s*normalizedOrganizationId/,
  );

  assert.match(
    source,
    /p_evidence_ids:\s*evidenceIds/,
  );

  assert.doesNotMatch(
    source,
    /\.from\(\s*"hspp_evidence_assembly_members"\s*\)/s,
  );
});

test("B06B derives hasAssemblyMembership only from current-effective membership", () => {
  assert.match(
    source,
    /currentEffectiveAssemblyEvidenceIds/,
  );

  assert.match(
    source,
    /const\s+hasAssemblyMembership\s*=\s*currentEffectiveAssemblyEvidenceIds\.has\(evidenceId\)/,
  );

  assert.doesNotMatch(
    source,
    /\bassembledEvidenceIds\b/,
  );
});

test("B06B documents the service-role authority requirement", () => {
  assert.match(
    source,
    /service-role-authorized Supabase client/i,
  );
});

test("B06B remains read-only and grants no downstream authority", () => {
  assert.doesNotMatch(
    source,
    /\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );

  assert.match(source, /does NOT/i);

  assert.match(source, /create or mutate an evidence assembly/);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);

  assert.match(source, /schedule retry or background processing/);
});
