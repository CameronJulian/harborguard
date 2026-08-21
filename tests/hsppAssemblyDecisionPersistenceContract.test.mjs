import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/persistHsppAssemblyDecision.ts",
    "utf8"
  );

test(
  "B11E2 defines a versioned assembly-decision persistence boundary",
  () => {
    assert.match(
      source,
      /hspp-assembly-decision-persistence-v1/
    );

    assert.match(
      source,
      /persistHsppAssemblyDecision/
    );
  }
);

test(
  "B11E2 writes only to the dedicated assembly-decision ledger",
  () => {
    assert.match(
      source,
      /\.from\([\s\S]*"hspp_assembly_decisions"[\s\S]*\)/
    );

    assert.match(
      source,
      /\.insert\([\s\S]*payload[\s\S]*\)/
    );

    assert.doesNotMatch(
      source,
      /\.from\([\s\S]*"hspp_evidence"[\s\S]*\)/
    );

    assert.doesNotMatch(
      source,
      /\.from\([\s\S]*"hspp_evidence_assemblies"[\s\S]*\)/
    );
  }
);

test(
  "B11E2 persists exact tenant and assembly identity",
  () => {
    assert.match(
      source,
      /organization_id:[\s\S]*organizationId/
    );

    assert.match(
      source,
      /assembly_id:[\s\S]*assemblyId/
    );

    /*
     * Identity validation is centralized through requireIdentity().
     * The concrete error text is generated from the supplied label,
     * so the contract verifies executable coupling rather than
     * requiring duplicated literal error strings.
     */

    assert.match(
      source,
      /requireIdentity\([\s\S]*input\.organizationId,[\s\S]*"organizationId"[\s\S]*\)/
    );

    assert.match(
      source,
      /requireIdentity\([\s\S]*input\.assemblyId,[\s\S]*"assemblyId"[\s\S]*\)/
    );

    assert.match(
      source,
      /\$\{label\} is required for HSPP assembly-decision persistence/
    );

    assert.match(
      source,
      /if \(!normalized\)/
    );
  }
);

test(
  "B11E2 persists B11C and B11D versions",
  () => {
    assert.match(
      source,
      /assembly_scan_version:[\s\S]*input\.scan\.scanVersion/
    );

    assert.match(
      source,
      /assembly_decision_policy_version:[\s\S]*input\.decision\.policyVersion/
    );
  }
);

test(
  "B11E2 persists complete scan aggregate provenance",
  () => {
    for (const field of [
      "member_count",
      "pair_count",
      "canonical_conflict_count",
      "canonical_agreement_count",
      "canonical_unknown_count",
      "has_canonical_conflict",
    ]) {
      assert.match(
        source,
        new RegExp(field)
      );
    }
  }
);

test(
  "B11E2 stores exact scan and decision snapshots",
  () => {
    assert.match(
      source,
      /scan_summary:[\s\S]*input\.scan/
    );

    assert.match(
      source,
      /decision_summary:[\s\S]*input\.decision/
    );
  }
);

test(
  "B11E2 validates supplied B11D decision against B11C",
  () => {
    assert.match(
      source,
      /evaluateHsppAssemblyDecision/
    );

    assert.match(
      source,
      /does not match the supplied B11C scan/
    );
  }
);

test(
  "B11E2 requires canonical B11C and B11D versions",
  () => {
    assert.match(
      source,
      /HSPP_ASSEMBLY_SCAN_VERSION/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_DECISION_VERSION/
    );

    assert.match(
      source,
      /Unsupported HSPP assembly scan version/
    );

    assert.match(
      source,
      /Unsupported HSPP assembly decision policy version/
    );
  }
);

test(
  "B11E2 forces authority NONE",
  () => {
    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );

    assert.match(
      source,
      /requires authority NONE/
    );
  }
);

test(
  "B11E2 does not update or delete protocol records",
  () => {
    assert.doesNotMatch(
      source,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\s*\(/
    );
  }
);

test(
  "B11E2 does not mutate trust or eligibility",
  () => {
    assert.match(
      source,
      /does not:[\s\S]*promote trustState/
    );

    assert.match(
      source,
      /grant operational eligibility/
    );

    assert.match(
      source,
      /grant Crowd eligibility/
    );

    assert.match(
      source,
      /grant ML training eligibility/
    );

    assert.match(
      source,
      /grant validation eligibility/
    );

    assert.doesNotMatch(
      source,
      /operationalEligible\s*:/
    );

    assert.doesNotMatch(
      source,
      /crowdEligible\s*:/
    );

    assert.doesNotMatch(
      source,
      /trainingEligible\s*:/
    );

    assert.doesNotMatch(
      source,
      /validationEligible\s*:/
    );
  }
);

test(
  "B11E2 does not mutate assemblies or evidence",
  () => {
    assert.match(
      source,
      /does not:[\s\S]*mutate the evidence assembly/
    );

    assert.match(
      source,
      /mutate HSPP evidence/
    );
  }
);