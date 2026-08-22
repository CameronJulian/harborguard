import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/persistHsppCorroboratedMemberAssessment.ts",
    "utf8"
  );

test(
  "B11F6 defines an explicitly versioned corroborated persistence boundary",
  () => {
    assert.match(
      source,
      /hspp-member-corroborated-persistence-v1/
    );

    assert.match(
      source,
      /persistHsppCorroboratedMemberAssessment/
    );

    assert.match(
      source,
      /CORROBORATED_ASSESSMENT_PERSISTED/
    );
  }
);

test(
  "B11F6 consumes exact B11F4 provenance",
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
      /organizationId/
    );

    assert.match(
      source,
      /assemblyId/
    );

    assert.match(
      source,
      /assemblyDecisionId/
    );

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
      /supportingEvidenceIds/
    );
  }
);

test(
  "B11F6 accepts only eligible independent B11F4 support",
  () => {
    assert.match(
      source,
      /MEMBER_CORROBORATION_ELIGIBLE/
    );

    assert.match(
      source,
      /INDEPENDENT_SUPPORT_PRESENT/
    );

    assert.match(
      source,
      /authority !==[\s\S]*"NONE"/
    );
  }
);

test(
  "B11F6 reconstructs canonical B11F5 assessment before writing",
  () => {
    assert.match(
      source,
      /assessHsppCorroboratedMember/
    );

    assert.match(
      source,
      /expectedAssessment/
    );

    assert.match(
      source,
      /assessment does not match the canonical B11F5 decision/
    );
  }
);

test(
  "B11F6 persists only accepted CORROBORATED assessment",
  () => {
    assert.match(
      source,
      /HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION/
    );

    assert.match(
      source,
      /assessment\.trustState !==[\s\S]*"CORROBORATED"/
    );

    assert.match(
      source,
      /INDEPENDENT_CORROBORATION_ACCEPTED/
    );
  }
);

test(
  "B11F6 refuses all downstream eligibility",
  () => {
    assert.match(
      source,
      /assessment\.operationalEligible !==[\s\S]*false/
    );

    assert.match(
      source,
      /assessment\.crowdEligible !==[\s\S]*false/
    );

    assert.match(
      source,
      /assessment\.trainingEligible !==[\s\S]*false/
    );

    assert.match(
      source,
      /assessment\.validationEligible !==[\s\S]*false/
    );

    assert.doesNotMatch(
      source,
      /operationalEligible:\s*true/
    );

    assert.doesNotMatch(
      source,
      /crowdEligible:\s*true/
    );

    assert.doesNotMatch(
      source,
      /trainingEligible:\s*true/
    );

    assert.doesNotMatch(
      source,
      /validationEligible:\s*true/
    );
  }
);

test(
  "B11F6 delegates database mutation to existing assessment boundary",
  () => {
    assert.match(
      source,
      /applyHsppAssessmentDecision/
    );

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
      /\.\s*from\s*\(\s*["'`]hspp_evidence/
    );

    assert.doesNotMatch(
      executableSource,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.insert\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.delete\s*\(/
    );
  }
);

test(
  "B11F6 passes exact tenant evidence and fingerprint to generic persistence",
  () => {
    assert.match(
      source,
      /organizationId,/
    );

    assert.match(
      source,
      /evidenceId,/
    );

    assert.match(
      source,
      /integrityFingerprint,/
    );

    assert.match(
      source,
      /assessment,/
    );
  }
);

test(
  "B11F6 verifies persisted result remains controlled",
  () => {
    assert.match(
      source,
      /applied\.evidenceId !==/
    );

    assert.match(
      source,
      /applied\.trustState !==[\s\S]*"CORROBORATED"/
    );

    assert.match(
      source,
      /applied\.operationalEligible !==[\s\S]*false/
    );

    assert.match(
      source,
      /applied\.policyVersion !==/
    );
  }
);

test(
  "B11F6 does not invent VERIFIED or physical truth authority",
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

    assert.doesNotMatch(
      executableSource,
      /operationalEligible\s*:\s*true/
    );
  }
);

test(
  "B11F6 requires a caller-controlled deterministic assessedAt",
  () => {
    assert.match(
      source,
      /\bassessedAt\s*:\s*string\s*;/
    );

    assert.doesNotMatch(
      source,
      /assessedAt\?\s*:/
    );

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
      /assessedAt\s*=\s*new Date\s*\(\s*\)\s*\.toISOString/
    );
  }
);

test(
  "B11F6 normalizes retry identity once before persistence",
  () => {
    assert.match(
      source,
      /function\s+normalizeAssessedAt/
    );

    assert.match(
      source,
      /const\s+assessedAt\s*=\s*[\r\n\s]*normalizeAssessedAt\s*\([\r\n\s]*input\.assessedAt/
    );

    assert.match(
      source,
      /assessedAt,\s*[\r\n\s]*\}\);/
    );
  }
);

test(
  "B11F6 verifies and returns the exact persisted retry timestamp",
  () => {
    assert.match(
      source,
      /applied\.assessedAt\s*!==[\r\n\s]*assessedAt/
    );

    assert.match(
      source,
      /operationalEligible:[\r\n\s]*false,[\r\n\s]*assessedAt,[\r\n\s]*applied/
    );
  }
);
