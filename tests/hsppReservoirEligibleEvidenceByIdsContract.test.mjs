import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/readHsppReservoirEligibleEvidenceByIds.ts",
    "utf8",
  );


test(
  "shared Reservoir revalidation preserves the authoritative bounded fanout",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX\s*=\s*100/,
    );

    assert.match(
      source,
      /HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS\s*=\s*200/,
    );

    assert.match(
      source,
      /normalizedEvidenceIds\.slice\([\s\S]*HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX/,
    );
  },
);


test(
  "shared Reservoir revalidation reuses existing operational verification",
  () => {
    const calls =
      source.match(
        /await\s+readHsppEvidenceBatchForOperationalUse\s*\(/g,
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
      /evidenceIds:\s*normalizedEvidenceIds/,
    );
  },
);


test(
  "shared Reservoir revalidation owns Q14ag8 classification chunking without bypassing the RPC",
  () => {
    assert.match(
      source,
      /\.rpc\(\s*"read_hspp_evidence_assembly_membership_classifications"/s,
    );

    assert.match(
      source,
      /p_organization_id:\s*normalizedOrganizationId/,
    );

    assert.match(
      source,
      /p_evidence_ids:\s*evidenceIdChunk/,
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*"read_hspp_current_effective_assembly_memberships"/,
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"hspp_evidence_assembly_members"\s*\)/s,
    );
  },
);


test(
  "shared Reservoir revalidation preserves Q14ag8 fail-closed lifecycle validation",
  () => {
    for (
      const pattern of
      [
        /membership classification lookup returned an invalid HSPP evidence id/i,
        /invalid membership flags/i,
        /impossible current-without-history state/i,
        /invalid lifecycle classification/i,
        /unexpected evidence/i,
        /duplicate evidence/i,
        /inconsistent lifecycle state/i,
        /membership classification missing for evidence/i,
      ]
    ) {
      assert.match(
        source,
        pattern,
      );
    }

    assert.match(
      source,
      /"NEVER_ASSEMBLED"/,
    );

    assert.match(
      source,
      /"HISTORICAL_NOT_CURRENT"/,
    );

    assert.match(
      source,
      /"CURRENT_EFFECTIVE"/,
    );
  },
);


test(
  "shared Reservoir revalidation derives assembly exclusion only from current-effective membership and preserves B06A",
  () => {
    assert.match(
      source,
      /const\s+hasAssemblyMembership\s*=\s*membershipState[\s\S]*\.hasCurrentEffectiveMembership/,
    );

    assert.match(
      source,
      /evaluateHsppReservoirEligibility\(\{[\s\S]*operationalUseDecision:[\s\S]*operationalRead\.decision[\s\S]*hasAssemblyMembership/,
    );

    assert.match(
      source,
      /if\s*\(\s*!reservoirDecision\.eligible\s*\)\s*\{\s*continue;/s,
    );

    assert.match(
      source,
      /membershipClassification:[\s\S]*membershipState[\s\S]*\.membershipClassification/,
    );
  },
);


test(
  "shared Reservoir revalidation is read-only scheduling-neutral metadata and grants no downstream authority",
  () => {
    for (
      const forbidden of
      [
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
        /compareAndSwapHsppReservoir/,
        /evaluateHsppAssemblyMembership\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }

    assert.match(
      source,
      /service-role-authorized Supabase\s*\*?\s*client/i,
    );

    assert.match(
      source,
      /does NOT/i,
    );

    assert.match(
      source,
      /schedule pair work/i,
    );

    assert.match(
      source,
      /advance a scheduling cursor/i,
    );

    assert.match(
      source,
      /Route Safety authority/i,
    );

    assert.match(
      source,
      /Crowd Intelligence eligibility/i,
    );

    assert.match(
      source,
      /ML training or validation eligibility/i,
    );
  },
);
