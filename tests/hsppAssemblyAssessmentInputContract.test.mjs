import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/buildHsppAssemblyAssessmentInput.ts",
    "utf8"
  );

test(
  "B11F2 defines an explicitly versioned assessment-input adapter",
  () => {
    assert.match(
      source,
      /hspp-assembly-assessment-input-v1/
    );

    assert.match(
      source,
      /buildHsppAssemblyAssessmentInput/
    );
  }
);

test(
  "B11F2 consumes B11F1 authority candidacy",
  () => {
    assert.match(
      source,
      /HsppAssemblyAuthorityDecision/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_AUTHORITY_VERSION/
    );

    assert.match(
      source,
      /ASSESSMENT_CANDIDATE/
    );

    assert.match(
      source,
      /CONSISTENT_ASSEMBLY_CANDIDATE/
    );
  }
);

test(
  "B11F2 fails closed when candidacy is denied",
  () => {
    assert.match(
      source,
      /HSPP assembly is not an assessment candidate/
    );
  }
);

test(
  "B11F2 requires authority NONE",
  () => {
    assert.match(
      source,
      /authority\.authority !==[\s\S]*"NONE"/
    );

    assert.match(
      source,
      /requires authority NONE/
    );
  }
);

test(
  "B11F2 binds organization assembly and decision identity",
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
      /member organization does not match authority provenance/
    );

    assert.match(
      source,
      /member assembly does not match authority provenance/
    );
  }
);

test(
  "B11F2 preserves immutable evidence identity",
  () => {
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
      /lowercase SHA-256 integrity fingerprint/
    );
  }
);

test(
  "B11F2 requires multi-evidence context",
  () => {
    assert.match(
      source,
      /input\.members\.length < 2/
    );

    assert.match(
      source,
      /at least two evidence members/
    );
  }
);

test(
  "B11F2 requires deterministic contiguous membership",
  () => {
    assert.match(
      source,
      /normalizedMembers\.sort/
    );

    assert.match(
      source,
      /expectedOrdinal/
    );

    assert.match(
      source,
      /contiguous deterministic ordinals/
    );
  }
);

test(
  "B11F2 rejects duplicate immutable identities",
  () => {
    assert.match(
      source,
      /duplicate evidence identity/
    );

    assert.match(
      source,
      /duplicate immutable evidence fingerprint/
    );
  }
);

test(
  "B11F2 produces context not HsppAssessmentDecision",
  () => {
    assert.match(
      source,
      /HsppAssemblyAssessmentInput/
    );

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
  "B11F2 explicitly grants no authority",
  () => {
    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );

    assert.match(
      source,
      /does NOT:[\s\S]*CORROBORATED or VERIFIED trust/
    );
  }
);

test(
  "B11F2 does not invoke assessment persistence",
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
  "B11F2 performs no database reads or writes",
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