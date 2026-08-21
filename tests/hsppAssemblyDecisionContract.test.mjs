import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppAssemblyDecision.ts",
    "utf8"
  );

test(
  "B11D defines an explicitly versioned master assembly decision",
  () => {
    assert.match(
      source,
      /hspp-assembly-decision-v1/
    );

    assert.match(
      source,
      /evaluateHsppAssemblyDecision/
    );
  }
);

test(
  "B11D defines four protocol interpretation states",
  () => {
    for (const state of [
      "NOT_READY",
      "CONFLICTED",
      "UNRESOLVED",
      "CONSISTENT",
    ]) {
      assert.match(
        source,
        new RegExp(`"${state}"`)
      );
    }
  }
);

test(
  "B11D consumes B11C rather than rescanning evidence",
  () => {
    assert.match(
      source,
      /HsppAssemblyScanResult/
    );

    assert.doesNotMatch(
      source,
      /evaluateHsppCanonicalContradiction/
    );

    assert.doesNotMatch(
      source,
      /buildHsppCanonicalClaims/
    );
  }
);

test(
  "unscannable and insufficient assemblies are not ready",
  () => {
    assert.match(
      source,
      /"INSUFFICIENT_EVIDENCE"/
    );

    assert.match(
      source,
      /"ASSEMBLY_NOT_SCANNED"/
    );

    assert.match(
      source,
      /"NOT_READY"/
    );
  }
);

test(
  "explicit canonical conflict has precedence",
  () => {
    const conflict =
      source.indexOf(
        'scan.hasCanonicalConflict ||'
      );

    const agreement =
      source.indexOf(
        'scan.canonicalAgreementCount ==='
      );

    assert.ok(
      conflict >= 0
    );

    assert.ok(
      agreement > conflict
    );

    assert.match(
      source,
      /"CONFLICTED"/
    );

    assert.match(
      source,
      /"CANONICAL_CONFLICT_PRESENT"/
    );
  }
);

test(
  "zero comparable agreements remain unresolved",
  () => {
    assert.match(
      source,
      /scan\.canonicalAgreementCount ===[\s\S]*0/
    );

    assert.match(
      source,
      /"UNRESOLVED"/
    );

    assert.match(
      source,
      /"NO_COMPARABLE_AGREEMENT"/
    );
  }
);

test(
  "agreement without conflict is only CONSISTENT",
  () => {
    assert.match(
      source,
      /"CONSISTENT"/
    );

    assert.match(
      source,
      /"CANONICAL_AGREEMENT_WITHOUT_CONFLICT"/
    );

    assert.match(
      source,
      /CONSISTENT does not establish physical-world truth/
    );

    assert.match(
      source,
      /CONSISTENT does not mean all claims are resolved/
    );

    assert.match(
      source,
      /does not itself establish CORROBORATED trust/
    );
  }
);

test(
  "B11D validates impossible scan summaries defensively",
  () => {
    assert.match(
      source,
      /INVALID_SCAN_SUMMARY/
    );

    assert.match(
      source,
      /scan\.memberCount < 2/
    );

    assert.match(
      source,
      /scan\.pairCount < 1/
    );
  }
);

test(
  "B11D does not mutate existing trust or eligibility domains",
  () => {
    assert.match(
      source,
      /does not change HSPP trustState or validationState/
    );

    assert.match(
      source,
      /does not grant operational eligibility/
    );

    assert.match(
      source,
      /does not grant Crowd eligibility/
    );

    assert.match(
      source,
      /does not grant ML training eligibility/
    );

    assert.match(
      source,
      /does not grant validation eligibility/
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
  "B11D does not import or apply the existing HSPP assessment decision",
  () => {
    /*
     * Documentation may name the existing assessment boundary.
     *
     * The contract prohibits executable coupling:
     * - no import of HsppAssessmentDecision;
     * - no import of applyHsppAssessmentDecision;
     * - no invocation of applyHsppAssessmentDecision.
     */

    assert.doesNotMatch(
      source,
      /import[\s\S]*HsppAssessmentDecision[\s\S]*from/
    );

    assert.doesNotMatch(
      source,
      /import[\s\S]*applyHsppAssessmentDecision[\s\S]*from/
    );

    assert.doesNotMatch(
      source,
      /applyHsppAssessmentDecision\s*\(/
    );
  }
);

test(
  "B11D is pure and grants no authority",
  () => {
    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/
    );

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
      /supabase/i
    );
  }
);