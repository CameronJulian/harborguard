import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppCorroboratedOperationalAuthority.ts",
    "utf8"
  );

test(
  "B11G2 defines an explicitly versioned operational-authority policy",
  () => {
    assert.match(
      source,
      /hspp-corroborated-operational-authority-v1/
    );

    assert.match(
      source,
      /evaluateHsppCorroboratedOperationalAuthority/
    );
  }
);

test(
  "B11G2 consumes the persisted B11F6 corroborated result",
  () => {
    assert.match(
      source,
      /HsppPersistedCorroboratedMemberAssessment/
    );

    assert.match(
      source,
      /HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION/
    );

    assert.match(
      source,
      /CORROBORATED_ASSESSMENT_PERSISTED/
    );
  }
);

test(
  "B11G2 distinguishes denial from candidacy",
  () => {
    assert.match(
      source,
      /OPERATIONAL_AUTHORITY_DENIED/
    );

    assert.match(
      source,
      /OPERATIONAL_AUTHORITY_CANDIDATE/
    );
  }
);

test(
  "B11G2 does not implement authority grant",
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
      /OPERATIONAL_AUTHORITY_GRANTED/
    );

    assert.doesNotMatch(
      executableSource,
      /authority\s*:\s*"GRANTED"/
    );

    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );
  }
);

test(
  "B11G2 requires persisted CORROBORATED trust",
  () => {
    assert.match(
      source,
      /HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION/
    );

    assert.match(
      source,
      /input\.trustState !==[\s\S]*"CORROBORATED"/
    );
  }
);

test(
  "B11G2 requires upstream operational eligibility to remain false",
  () => {
    assert.match(
      source,
      /input\.operationalEligible !==[\s\S]*false/
    );

    assert.match(
      source,
      /UPSTREAM_OPERATIONAL_AUTHORITY_PRESENT/
    );
  }
);

test(
  "B11G2 preserves immutable provenance identity",
  () => {
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
      /evidenceId/
    );

    assert.match(
      source,
      /integrityFingerprint/
    );

    assert.match(
      source,
      /supportingEvidenceIds/
    );
  }
);

test(
  "B11G2 verifies lowercase SHA-256 fingerprint",
  () => {
    assert.match(
      source,
      /\^\[a-f0-9\]\{64\}\$/
    );
  }
);

test(
  "B11G2 requires coherent independent support",
  () => {
    assert.match(
      source,
      /independentSupportCount < 1/
    );

    assert.match(
      source,
      /supportingEvidenceIds\.length !==/
    );

    assert.match(
      source,
      /new Set/
    );
  }
);

test(
  "B11G2 grants no Crowd ML validation or operational mutation",
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
      /operationalEligible\s*:\s*true/
    );

    assert.doesNotMatch(
      executableSource,
      /crowdEligible\s*:\s*true/
    );

    assert.doesNotMatch(
      executableSource,
      /trainingEligible\s*:\s*true/
    );

    assert.doesNotMatch(
      executableSource,
      /validationEligible\s*:\s*true/
    );
  }
);

test(
  "B11G2 is pure and performs no persistence",
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
      /\bpersistHsppCorroboratedMemberAssessment\s*\(/
    );

    assert.doesNotMatch(
      executableSource,
      /\.\s*from\s*\(/
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

test(
  "operational candidacy is explicitly not operational permission",
  () => {
    assert.match(
      source,
      /OPERATIONAL_AUTHORITY_CANDIDATE means/
    );

    assert.match(
      source,
      /operationalEligible has become true/
    );

    assert.match(
      source,
      /operational use is currently allowed/
    );
  }
);