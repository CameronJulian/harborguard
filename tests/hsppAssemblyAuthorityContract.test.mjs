import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppAssemblyAuthority.ts",
    "utf8"
  );

test(
  "B11F1 defines an explicitly versioned authority-candidacy policy",
  () => {
    assert.match(
      source,
      /hspp-assembly-authority-v1/
    );

    assert.match(
      source,
      /evaluateHsppAssemblyAuthority/
    );
  }
);

test(
  "B11F1 consumes persisted B11E provenance",
  () => {
    assert.match(
      source,
      /HsppPersistedAssemblyDecision/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION/
    );

    assert.doesNotMatch(
      source,
      /HsppAssemblyScanResult/
    );

    assert.doesNotMatch(
      source,
      /scanHsppEvidenceAssembly/
    );
  }
);

test(
  "B11F1 requires the canonical B11D decision policy version",
  () => {
    assert.match(
      source,
      /HSPP_ASSEMBLY_DECISION_VERSION/
    );

    assert.match(
      source,
      /UNSUPPORTED_DECISION_POLICY_VERSION/
    );
  }
);

test(
  "B11F1 defines denied and assessment-candidate states only",
  () => {
    assert.match(
      source,
      /"DENIED"/
    );

    assert.match(
      source,
      /"ASSESSMENT_CANDIDATE"/
    );
  }
);

test(
  "NOT_READY assemblies cannot become assessment candidates",
  () => {
    assert.match(
      source,
      /input\.decisionState ===[\s\S]*"NOT_READY"/
    );

    assert.match(
      source,
      /"ASSEMBLY_NOT_READY"/
    );
  }
);

test(
  "CONFLICTED assemblies cannot become assessment candidates",
  () => {
    assert.match(
      source,
      /input\.decisionState ===[\s\S]*"CONFLICTED"/
    );

    assert.match(
      source,
      /"ASSEMBLY_CONFLICTED"/
    );
  }
);

test(
  "UNRESOLVED assemblies cannot become assessment candidates",
  () => {
    assert.match(
      source,
      /input\.decisionState ===[\s\S]*"UNRESOLVED"/
    );

    assert.match(
      source,
      /"ASSEMBLY_UNRESOLVED"/
    );
  }
);

test(
  "only CONSISTENT assembly state becomes assessment candidate",
  () => {
    assert.match(
      source,
      /input\.decisionState ===[\s\S]*"CONSISTENT"/
    );

    assert.match(
      source,
      /"ASSESSMENT_CANDIDATE"[\s\S]*"CONSISTENT_ASSEMBLY_CANDIDATE"/
    );
  }
);

test(
  "B11F1 validates persisted state and reason coherence",
  () => {
    assert.match(
      source,
      /decisionProvenanceIsCoherent/
    );

    assert.match(
      source,
      /INVALID_ASSEMBLY_DECISION_PROVENANCE/
    );

    assert.match(
      source,
      /CANONICAL_AGREEMENT_WITHOUT_CONFLICT/
    );

    assert.match(
      source,
      /CANONICAL_CONFLICT_PRESENT/
    );
  }
);

test(
  "B11F1 requires authority NONE",
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
  "assessment candidacy does not establish trust or eligibility",
  () => {
    assert.match(
      source,
      /does NOT mean:[\s\S]*CORROBORATED trust/
    );

    assert.match(
      source,
      /VERIFIED trust/
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

    assert.match(
      source,
      /physical-world truth/
    );
  }
);

test(
  "B11F1 does not import or invoke the existing assessment mutation boundary",
  () => {
    /*
     * Documentation may name applyHsppAssessmentDecision().
     *
     * The contract prohibits executable coupling rather than
     * prohibiting the name from appearing in explanatory comments.
     */

    assert.doesNotMatch(
      source,
      /import\s*\{[\s\S]*applyHsppAssessmentDecision[\s\S]*\}\s*from/
    );

    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*applyHsppAssessmentDecision[^"']*["']/
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
      /\bapplyHsppAssessmentDecision\s*\(/
    );
  }
);

test(
  "B11F1 performs no database persistence or mutation",
  () => {
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
      /\.delete\s*\(/
    );

    assert.doesNotMatch(
      source,
      /supabase/i
    );
  }
);