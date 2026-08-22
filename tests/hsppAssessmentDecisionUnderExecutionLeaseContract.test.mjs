import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "lib/hspp/applyHsppAssessmentDecisionUnderExecutionLease.ts",
    "utf8"
  );

test(
  "Q13e5a runtime exposes the dedicated recovery-only version and RPC",
  () => {
    assert.match(
      source,
      /hspp-assessment-decision-under-execution-lease-v1/
    );

    assert.match(
      source,
      /apply_hspp_assessment_decision_under_execution_lease/
    );
  }
);

test(
  "Q13e5a requires assembly and lease ownership identity",
  () => {
    assert.match(
      source,
      /assemblyId:\s*string/
    );

    assert.match(
      source,
      /leaseToken:\s*string/
    );
  }
);

test(
  "Q13e5a requires caller-owned assessedAt",
  () => {
    assert.match(
      source,
      /assessedAt:\s*string/
    );

    assert.doesNotMatch(
      source,
      /assessedAt\?:\s*string/
    );
  }
);

test(
  "Q13e5a performs exactly one RPC and no direct table mutation",
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
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\s*\(/
    );
  }
);

test(
  "Q13e5a sends exact organization assembly token evidence and fingerprint RPC arguments",
  () => {
    for (
      const argument of [
        "p_organization_id",
        "p_assembly_id",
        "p_lease_token",
        "p_evidence_id",
        "p_integrity_fingerprint",
      ]
    ) {
      assert.match(
        source,
        new RegExp(argument)
      );
    }
  }
);

test(
  "Q13e5a sends every existing HSPP assessment decision field",
  () => {
    for (
      const argument of [
        "p_trust_state",
        "p_operational_eligible",
        "p_crowd_eligible",
        "p_training_eligible",
        "p_validation_eligible",
        "p_assessment_policy_version",
        "p_assessment_reason",
        "p_assessed_at",
      ]
    ) {
      assert.match(
        source,
        new RegExp(argument)
      );
    }
  }
);

test(
  "Q13e5a never generates a wall-clock assessedAt",
  () => {
    assert.doesNotMatch(
      source,
      /\bDate\.now\s*\(/
    );

    assert.doesNotMatch(
      source,
      /new\s+Date\s*\(\s*\)/
    );
  }
);

test(
  "Q13e5a does not invoke recovery orchestration or completion",
  () => {
    assert.doesNotMatch(
      source,
      /runHsppSealedAssemblyRecoveryAssessment/
    );

    assert.doesNotMatch(
      source,
      /recordHsppAssemblyAssessmentCompletion/
    );

    assert.doesNotMatch(
      source,
      /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting/
    );
  }
);

test(
  "Q13e5a validates the returned full assessment before returning",
  () => {
    for (
      const field of [
        "operational_eligible",
        "crowd_eligible",
        "training_eligible",
        "validation_eligible",
        "assessment_policy_version",
        "assessment_reason",
        "assessed_at",
      ]
    ) {
      assert.match(
        source,
        new RegExp(field)
      );
    }

    assert.match(
      source,
      /does not match the requested assessment decision/
    );
  }
);
