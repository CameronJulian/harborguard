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
  "B06B semantic reader still does not own the raw evidence page",
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
      /rawEvidenceCount:[\s\S]*discoveryPage[\s\S]*\.items\.length/,
    );

    assert.match(
      source,
      /expectedCursor:[\s\S]*discoveryPage[\s\S]*\.expectedCursor/,
    );

    assert.match(
      source,
      /proposedCursor:[\s\S]*discoveryPage[\s\S]*\.proposedCursor/,
    );
  },
);


test(
  "B06B delegates current-state Reservoir eligibility to the shared evidence-id boundary exactly once",
  () => {
    const calls =
      source.match(
        /await\s+readHsppReservoirEligibleEvidenceByIds\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /organizationId:\s*normalizedOrganizationId/,
    );

    assert.match(
      source,
      /\bevidenceIds\s*,/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppEvidenceBatchForOperationalUse\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppReservoirEligibility\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*"read_hspp_evidence_assembly_membership_classifications"/,
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"hspp_evidence_assembly_members"\s*\)/s,
    );
  },
);


test(
  "B06B preserves its public candidate and lifecycle classification shape",
  () => {
    assert.match(
      source,
      /export\s+type\s+HsppEvidenceAssemblyMembershipClassification\s*=[\s\S]*"NEVER_ASSEMBLED"[\s\S]*"HISTORICAL_NOT_CURRENT"[\s\S]*"CURRENT_EFFECTIVE"/,
    );

    assert.match(
      source,
      /export\s+type\s+HsppReservoirCandidate\s*=/,
    );

    assert.match(
      source,
      /operationalRead:[\s\S]*ReadHsppEvidenceForOperationalUseResult/,
    );

    assert.match(
      source,
      /hasAssemblyMembership:\s*boolean/,
    );

    assert.match(
      source,
      /membershipClassification:[\s\S]*HsppEvidenceAssemblyMembershipClassification/,
    );

    assert.match(
      source,
      /reservoirDecision:[\s\S]*HsppReservoirEligibilityDecision/,
    );
  },
);


test(
  "B06B documents shared service-role revalidation without granting lifecycle authority",
  () => {
    assert.match(
      source,
      /service-role-authorized Supabase client/i,
    );

    assert.match(
      source,
      /HISTORICAL_NOT_CURRENT remains eligible only when B06A/i,
    );

    assert.match(
      source,
      /does NOT/i,
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
