import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppAssemblyCorroborationSupport.ts",
    "utf8"
  );

test(
  "B11F3 defines an explicitly versioned corroboration-support policy",
  () => {
    assert.match(
      source,
      /hspp-assembly-corroboration-support-v1/
    );

    assert.match(
      source,
      /evaluateHsppAssemblyCorroborationSupport/
    );
  }
);

test(
  "B11F3 consumes the safe B11F2 assessment context",
  () => {
    assert.match(
      source,
      /HsppAssemblyAssessmentInput/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION/
    );
  }
);

test(
  "B11F3 distinguishes support from no support",
  () => {
    assert.match(
      source,
      /CORROBORATION_SUPPORTED/
    );

    assert.match(
      source,
      /CORROBORATION_NOT_SUPPORTED/
    );
  }
);

test(
  "B11F3 requires existing assessment candidacy",
  () => {
    assert.match(
      source,
      /ASSESSMENT_CANDIDATE/
    );

    assert.match(
      source,
      /CONSISTENT_ASSEMBLY_CANDIDATE/
    );

    assert.match(
      source,
      /ASSESSMENT_CONTEXT_NOT_CANDIDATE/
    );
  }
);

test(
  "B11F3 requires authority NONE",
  () => {
    assert.match(
      source,
      /input\.authority !==[\s\S]*"NONE"/
    );

    assert.match(
      source,
      /AUTHORITY_NOT_NONE/
    );

    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );
  }
);

test(
  "B11F3 requires multi-evidence context",
  () => {
    assert.match(
      source,
      /input\.evidenceCount < 2/
    );

    assert.match(
      source,
      /INSUFFICIENT_EVIDENCE/
    );
  }
);

test(
  "B11F3 validates deterministic immutable membership",
  () => {
    assert.match(
      source,
      /member\.memberOrdinal !==/
    );

    assert.match(
      source,
      /integrityFingerprint/
    );

    assert.match(
      source,
      /INVALID_EVIDENCE_MEMBERSHIP/
    );

    assert.match(
      source,
      /DUPLICATE_EVIDENCE_IDENTITY/
    );
  }
);

test(
  "CORROBORATION_SUPPORTED does not mean CORROBORATED trust",
  () => {
    assert.match(
      source,
      /does NOT mean:[\s\S]*trustState CORROBORATED/
    );

    assert.match(
      source,
      /trustState VERIFIED/
    );

    assert.match(
      source,
      /physical-world truth/
    );

    assert.match(
      source,
      /operational eligibility/
    );

    assert.match(
      source,
      /Crowd eligibility/
    );

    assert.match(
      source,
      /ML training eligibility/
    );

    assert.match(
      source,
      /validation eligibility/
    );
  }
);

test(
  "B11F3 does not construct HsppAssessmentDecision",
  () => {
    assert.doesNotMatch(
      source,
      /import[\s\S]*HsppAssessmentDecision[\s\S]*from/
    );

    assert.doesNotMatch(
      source,
      /trustState\s*:/
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
  "B11F3 does not invoke assessment mutation",
  () => {
    const executableSource =
      source
        .replace(
          /\/\*[\s\S]*?\*\//g,
          ""
        )
        .replace(
          /\/\/.*$/gm,
          ""
        );

    assert.doesNotMatch(
      executableSource,
      /\bapplyHsppAssessmentDecision\s*\(/
    );
  }
);

test(
  "B11F3 performs no database reads or writes",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.select\s*\(/
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
      /\.delete\s*\(/
    );

    assert.doesNotMatch(
      source,
      /supabase/i
    );
  }
);