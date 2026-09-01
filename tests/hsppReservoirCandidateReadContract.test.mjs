import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/readHsppReservoirCandidates.ts",
    "utf8",
  );


test(
  "B06B preserves semantic policy v1 while delegating bounded scheduling",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );

    assert.match(
      source,
      /hspp-reservoir-discovery-v1/,
    );

    assert.match(
      source,
      /HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT\s*=\s*100/,
    );

    assert.match(
      source,
      /HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION/,
    );

    const pageCalls =
      source.match(
        /\breadHsppReservoirDiscoveryPage\s*\(/g,
      ) ?? [];

    assert.equal(
      pageCalls.length,
      1,
    );

    assert.match(
      source,
      /organizationId:\s*normalizedOrganizationId/,
    );

    assert.match(
      source,
      /limit:\s*normalizedLimit/,
    );
  },
);

test(
  "B06B semantic reader no longer owns the fixed first evidence page",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*"hspp_evidence"\s*\)/,
    );

    assert.doesNotMatch(
      source,
      /\.order\(\s*"observed_at"/,
    );

    assert.doesNotMatch(
      source,
      /\.order\(\s*"id"/,
    );

    assert.match(
      source,
      /discoveryPage\.items\.map/,
    );

    assert.match(
      source,
      /rawEvidenceCount:\s*discoveryPage\.items\.length/,
    );

    assert.match(
      source,
      /expectedCursor:\s*discoveryPage\.expectedCursor/,
    );

    assert.match(
      source,
      /proposedCursor:\s*discoveryPage\.proposedCursor/,
    );
  },
);

test(
  "B06B reuses operational verification and B06A policy unchanged",
  () => {
    assert.match(
      source,
      /readHsppEvidenceBatchForOperationalUse/,
    );

    assert.match(
      source,
      /evaluateHsppReservoirEligibility/,
    );
  },
);


test(
  "B06B performs exactly one Q14ag8 membership classification read",
  () => {
    const classificationCalls =
      source.match(
        /\.rpc\(\s*"read_hspp_evidence_assembly_membership_classifications"/g,
      ) ?? [];

    assert.equal(
      classificationCalls.length,
      1,
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*"read_hspp_current_effective_assembly_memberships"/,
    );

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
  },
);


test(
  "B06B preserves Q14ag8 lifecycle classification on eligible candidates",
  () => {
    assert.match(
      source,
      /export\s+type\s+HsppEvidenceAssemblyMembershipClassification\s*=[\s\S]*"NEVER_ASSEMBLED"[\s\S]*"HISTORICAL_NOT_CURRENT"[\s\S]*"CURRENT_EFFECTIVE"/,
    );

    assert.match(
      source,
      /membershipClassification:\s*HsppEvidenceAssemblyMembershipClassification/,
    );

    assert.match(
      source,
      /has_historical_membership:\s*unknown/,
    );

    assert.match(
      source,
      /has_current_effective_membership:\s*unknown/,
    );

    assert.match(
      source,
      /membership_classification:\s*unknown/,
    );

    assert.match(
      source,
      /membershipClassification:\s*membershipState\.membershipClassification/,
    );
  },
);


test(
  "B06B derives hasAssemblyMembership only from Q14ag8 current-effective state",
  () => {
    assert.match(
      source,
      /const\s+hasAssemblyMembership\s*=\s*membershipState\.hasCurrentEffectiveMembership/,
    );

    assert.match(
      source,
      /evaluateHsppReservoirEligibility\(\{[\s\S]*hasAssemblyMembership/,
    );

    assert.doesNotMatch(
      source,
      /\bcurrentEffectiveAssemblyEvidenceIds\b/,
    );

    assert.doesNotMatch(
      source,
      /\bassembledEvidenceIds\b/,
    );
  },
);


test(
  "B06B lifecycle classification does not bypass B06A eligibility",
  () => {
    assert.match(
      source,
      /const\s+reservoirDecision\s*=\s*evaluateHsppReservoirEligibility\(/,
    );

    assert.match(
      source,
      /if\s*\(\s*!reservoirDecision\.eligible\s*\)\s*\{\s*continue;\s*\}[\s\S]*candidates\.push\(/,
    );

    assert.doesNotMatch(
      source,
      /membershipClassification\s*===\s*"HISTORICAL_NOT_CURRENT"[\s\S]*eligible\s*:\s*true/,
    );
  },
);


test(
  "B06B validates classification rows fail closed",
  () => {
    assert.match(
      source,
      /membership classification lookup returned an invalid HSPP evidence id/i,
    );

    assert.match(
      source,
      /impossible current-without-history state/i,
    );

    assert.match(
      source,
      /invalid lifecycle classification/i,
    );

    assert.match(
      source,
      /inconsistent lifecycle state/i,
    );

    assert.match(
      source,
      /membership classification missing for evidence/i,
    );
  },
);


test(
  "B06B documents the service-role authority requirement",
  () => {
    assert.match(
      source,
      /service-role-authorized Supabase client/i,
    );
  },
);


test(
  "B06B remains read-only and grants no downstream authority",
  () => {
    assert.doesNotMatch(
      source,
      /\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.match(
      source,
      /does NOT/i,
    );

    assert.match(
      source,
      /create or mutate an evidence assembly/,
    );

    assert.match(
      source,
      /Route Safety authority/,
    );

    assert.match(
      source,
      /Crowd Intelligence eligibility/,
    );

    assert.match(
      source,
      /ML training or validation eligibility/,
    );

    assert.match(
      source,
      /schedule retry or background processing/,
    );
  },
);
