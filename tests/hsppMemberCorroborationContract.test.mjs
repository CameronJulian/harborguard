import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppMemberCorroboration.ts",
    "utf8"
  );

test(
  "B11F4 defines an explicitly versioned member corroboration policy",
  () => {
    assert.match(
      source,
      /hspp-member-corroboration-v1/
    );

    assert.match(
      source,
      /evaluateHsppMemberCorroboration/
    );
  }
);

test(
  "B11F4 consumes B11F3 corroboration support",
  () => {
    assert.match(
      source,
      /HsppAssemblyCorroborationSupportResult/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION/
    );

    assert.match(
      source,
      /CORROBORATION_SUPPORTED/
    );
  }
);

test(
  "B11F4 distinguishes eligibility from denial",
  () => {
    assert.match(
      source,
      /MEMBER_CORROBORATION_ELIGIBLE/
    );

    assert.match(
      source,
      /MEMBER_CORROBORATION_DENIED/
    );
  }
);

test(
  "B11F4 binds exact immutable target identity",
  () => {
    assert.match(
      source,
      /targetEvidenceId/
    );

    assert.match(
      source,
      /targetIntegrityFingerprint/
    );

    assert.match(
      source,
      /TARGET_IDENTITY_MISMATCH/
    );
  }
);

test(
  "B11F4 requires current integrity MATCH",
  () => {
    assert.match(
      source,
      /target\.integrityStatus !==[\s\S]*"MATCH"/
    );

    assert.match(
      source,
      /TARGET_INTEGRITY_NOT_MATCH/
    );

    assert.match(
      source,
      /other\.integrityStatus !==[\s\S]*"MATCH"/
    );
  }
);

test(
  "B11F4 requires validated target and supporter",
  () => {
    assert.match(
      source,
      /target\.validationState !==[\s\S]*"VALIDATED"/
    );

    assert.match(
      source,
      /other\.validationState !==[\s\S]*"VALIDATED"/
    );
  }
);

test(
  "B11F4 requires prior membership compatibility",
  () => {
    assert.match(
      source,
      /relation\.membershipEligible/
    );

    assert.match(
      source,
      /relation\.membershipPolicyVersion/
    );
  }
);

test(
  "B11F4 requires canonical agreement",
  () => {
    assert.match(
      source,
      /canonicalRelation !==[\s\S]*"AGREE"/
    );
  }
);

test(
  "B11F4 fails closed on target canonical conflict",
  () => {
    assert.match(
      source,
      /canonicalRelation ===[\s\S]*"CONFLICT"/
    );

    assert.match(
      source,
      /TARGET_CONFLICT_PRESENT/
    );
  }
);

test(
  "B11F4 rejects same-provider-only corroboration",
  () => {
    assert.match(
      source,
      /other\.sourceProvider ===[\s\S]*target\.sourceProvider/
    );

    assert.match(
      source,
      /SAME_PROVIDER_ONLY/
    );
  }
);

test(
  "member eligibility still grants no authority",
  () => {
    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );

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
  "B11F4 does not construct an HsppAssessmentDecision",
  () => {
    /*
     * Documentation is allowed to name HsppAssessmentDecision.
     *
     * Strip comments before checking executable source so explanatory
     * safety text cannot masquerade as an import or implementation.
     */

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
      /import\s+(?:type\s+)?(?:\{[\s\S]*?\bHsppAssessmentDecision\b[\s\S]*?\}|HsppAssessmentDecision)\s+from/
    );

    assert.doesNotMatch(
      executableSource,
      /\bHsppAssessmentDecision\s*[<={:]/
    );

    assert.doesNotMatch(
      executableSource,
      /trustState\s*:/
    );

    assert.doesNotMatch(
      executableSource,
      /operationalEligible\s*:/
    );

    assert.doesNotMatch(
      executableSource,
      /crowdEligible\s*:/
    );

    assert.doesNotMatch(
      executableSource,
      /trainingEligible\s*:/
    );

    assert.doesNotMatch(
      executableSource,
      /validationEligible\s*:/
    );
  }
);

test(
  "B11F4 does not invoke assessment mutation",
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
  "B11F4 performs no database reads or writes",
  () => {
    /*
     * Array.from() is ordinary in-memory JavaScript and must not be
     * confused with a Supabase-style table .from("table") operation.
     */

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
      /\.\s*from\s*\(\s*["'`]/
    );

    assert.doesNotMatch(
      executableSource,
      /\.select\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.insert\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.delete\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\bsupabase\b/i
    );

    assert.doesNotMatch(
      executableSource,
      /createClient\s*\(/
    );
  }
);