import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/assessHsppCorroboratedMember.ts",
    "utf8"
  );

test(
  "B11F5 defines an explicitly versioned corroborated assessment policy",
  () => {
    assert.match(
      source,
      /hspp-member-corroborated-assessment-v1/
    );

    assert.match(
      source,
      /assessHsppCorroboratedMember/
    );
  }
);

test(
  "B11F5 consumes B11F4 member corroboration eligibility",
  () => {
    assert.match(
      source,
      /HsppMemberCorroborationDecision/
    );

    assert.match(
      source,
      /HSPP_MEMBER_CORROBORATION_VERSION/
    );

    assert.match(
      source,
      /MEMBER_CORROBORATION_ELIGIBLE/
    );

    assert.match(
      source,
      /INDEPENDENT_SUPPORT_PRESENT/
    );
  }
);

test(
  "B11F5 returns the generic HSPP assessment contract",
  () => {
    assert.match(
      source,
      /HsppAssessmentDecision/
    );

    assert.match(
      source,
      /HsppCorroboratedMemberAssessment/
    );
  }
);

test(
  "eligible member may become CORROBORATED",
  () => {
    assert.match(
      source,
      /trustState:[\s\S]*"CORROBORATED"/
    );

    assert.match(
      source,
      /INDEPENDENT_CORROBORATION_ACCEPTED/
    );
  }
);

test(
  "failed corroboration remains UNASSESSED",
  () => {
    assert.match(
      source,
      /trustState:[\s\S]*"UNASSESSED"/
    );

    assert.match(
      source,
      /INDEPENDENT_CORROBORATION_DENIED/
    );
  }
);

test(
  "B11F5 never grants operational authority",
  () => {
    assert.match(
      source,
      /operationalEligible:[\s\S]*false/
    );

    assert.doesNotMatch(
      source,
      /operationalEligible:[\s\S]*true/
    );
  }
);

test(
  "B11F5 never grants Crowd ML or validation eligibility",
  () => {
    assert.match(
      source,
      /crowdEligible:[\s\S]*false/
    );

    assert.match(
      source,
      /trainingEligible:[\s\S]*false/
    );

    assert.match(
      source,
      /validationEligible:[\s\S]*false/
    );

    assert.doesNotMatch(
      source,
      /crowdEligible:[\s\S]*true/
    );

    assert.doesNotMatch(
      source,
      /trainingEligible:[\s\S]*true/
    );

    assert.doesNotMatch(
      source,
      /validationEligible:[\s\S]*true/
    );
  }
);

test(
  "B11F5 does not create VERIFIED trust",
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
      /trustState\s*:\s*"VERIFIED"/
    );
  }
);

test(
  "B11F5 requires exact immutable target identity",
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
      /\^\[a-f0-9\]\{64\}\$/
    );
  }
);

test(
  "B11F5 requires at least one independent supporter",
  () => {
    assert.match(
      source,
      /independentSupportCount < 1/
    );

    assert.match(
      source,
      /supportingEvidenceIds\.length !==/
    );
  }
);

test(
  "B11F5 rejects self support and duplicate supporter identities",
  () => {
    assert.match(
      source,
      /evidenceId ===[\s\S]*decision\.targetEvidenceId/
    );

    assert.match(
      source,
      /new Set[\s\S]*supporterIds/
    );
  }
);

test(
  "B11F5 remains pure and does not apply its own assessment",
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

    assert.doesNotMatch(
      executableSource,
      /\.\s*from\s*\(\s*["'`]/
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
  }
);