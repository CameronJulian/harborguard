import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "lib/hspp/recordHsppAssemblyAssessmentCompletionUnderExecutionLease.ts",
    "utf8"
  );

test(
  "Q13e5b exposes a dedicated recovery-only writer version and RPC",
  () => {
    assert.match(
      source,
      /hspp-assembly-assessment-completion-under-execution-lease-writer-v1/
    );

    assert.match(
      source,
      /record_hspp_assembly_assessment_completion_under_execution_lease/
    );
  }
);

test(
  "Q13e5b requires explicit caller-owned lease token",
  () => {
    assert.match(
      source,
      /leaseToken:\s*string/
    );

    assert.doesNotMatch(
      source,
      /leaseToken\?:\s*string/
    );
  }
);

test(
  "Q13e5b requires the already-returned terminal Q12 result",
  () => {
    assert.match(
      source,
      /terminalResult:/
    );

    assert.match(
      source,
      /MEMBER_CORROBORATION_DENIED/
    );

    assert.match(
      source,
      /MEMBER_CORROBORATION_ELIGIBLE/
    );

    assert.match(
      source,
      /HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION/
    );
  }
);

test(
  "Q13e5b performs exactly one RPC and no direct table access",
  () => {
    assert.equal(
      (
        source.match(
          /\.rpc\s*\(/g
        ) ?? []
      ).length,
      1
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
      /\.delete\s*\(/
    );
  }
);

test(
  "Q13e5b sends only organization assembly and lease ownership identity to SQL",
  () => {
    assert.match(
      source,
      /p_organization_id/
    );

    assert.match(
      source,
      /p_assembly_id/
    );

    assert.match(
      source,
      /p_lease_token/
    );

    assert.doesNotMatch(
      source,
      /p_assessed_at/
    );

    assert.doesNotMatch(
      source,
      /p_completion_state/
    );
  }
);

test(
  "Q13e5b never calls Q12 or existing Q13d5 writer",
  () => {
    assert.doesNotMatch(
      source,
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(/
    );

    assert.doesNotMatch(
      source,
      /recordHsppAssemblyAssessmentCompletion\s*\(/
    );
  }
);

test(
  "Q13e5b never acquires renews or releases execution ownership",
  () => {
    assert.doesNotMatch(
      source,
      /acquireHsppAssemblyAssessmentExecutionLease\s*\(/
    );

    assert.doesNotMatch(
      source,
      /renewHsppAssemblyAssessmentExecutionLease\s*\(/
    );

    assert.doesNotMatch(
      source,
      /releaseHsppAssemblyAssessmentExecutionLease\s*\(/
    );
  }
);

test(
  "Q13e5b does not generate time or token identity",
  () => {
    assert.doesNotMatch(
      source,
      /\bDate\.now\s*\(/
    );

    assert.doesNotMatch(
      source,
      /new\s+Date\s*\(\s*\)/
    );

    assert.doesNotMatch(
      source,
      /randomUUID\s*\(/
    );
  }
);

test(
  "Q13e5b preserves Q13d4 completion version and createdAt provenance",
  () => {
    assert.match(
      source,
      /HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION/
    );

    assert.match(
      source,
      /created_at/
    );

    assert.match(
      source,
      /createdAt/
    );

    assert.doesNotMatch(
      source,
      /assessedAt:\s*createdAt/
    );
  }
);
