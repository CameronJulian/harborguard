import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contextSource =
  fs.readFileSync(
    "lib/hspp/hsppAssessmentExecutionLeaseContext.ts",
    "utf8",
  );

const writerPaths = [
  "lib/hspp/persistHsppDeniedCorroboratedMemberAssessment.ts",
  "lib/hspp/persistHsppCorroboratedMemberAssessment.ts",
  "lib/hspp/persistHsppCorroboratedOperationalAssessment.ts",
];

function executable(
  source,
) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /^\s*\/\/.*$/gm,
      "",
    );
}

test(
  "execution lease context carries ownership identity only",
  () => {
    const source =
      executable(
        contextSource,
      );

    assert.match(
      source,
      /assemblyId:\s*string/,
    );

    assert.match(
      source,
      /leaseToken:\s*string/,
    );

    for (const forbidden of [
      /\bassessedAt\b/,
      /\btrustState\b/,
      /\boperationalEligible\b/,
      /\bcrowdEligible\b/,
      /\btrainingEligible\b/,
      /\bvalidationEligible\b/,
      /\bcompletion\b/i,
    ]) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }
  },
);

for (const path of writerPaths) {
  test(
    `${path} preserves generic persistence and adds exactly one fenced alternative`,
    () => {
      const source =
        fs.readFileSync(
          path,
          "utf8",
        );

      const code =
        executable(
          source,
        );

      assert.match(
        source,
        /HsppAssessmentExecutionLeaseContext/,
      );

      assert.match(
        source,
        /executionLease\?\s*:\s*[\r\n\s]*HsppAssessmentExecutionLeaseContext/,
      );

      const genericCalls =
        code.match(
          /\bapplyHsppAssessmentDecision\s*\(/g,
        ) ?? [];

      const fencedCalls =
        code.match(
          /\bapplyHsppAssessmentDecisionUnderExecutionLease\s*\(/g,
        ) ?? [];

      assert.equal(
        genericCalls.length,
        1,
      );

      assert.equal(
        fencedCalls.length,
        1,
      );

      assert.match(
        code,
        /executionLeaseAssemblyId\.toLowerCase\(\)\s*!==\s*assemblyId\.toLowerCase\(\)/,
      );

      assert.match(
        code,
        /applyHsppAssessmentDecisionUnderExecutionLease\s*\(\s*\{[\s\S]*?organizationId,[\s\S]*?assemblyId,[\s\S]*?leaseToken:\s*[\r\n\s]*executionLease\.leaseToken,[\s\S]*?evidenceId,[\s\S]*?integrityFingerprint,[\s\S]*?assessment,[\s\S]*?assessedAt,[\s\S]*?\}\s*\)/,
      );

      assert.doesNotMatch(
        code,
        /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
      );

      for (const forbidden of [
        /\bacquireHsppAssemblyAssessmentExecutionLease\s*\(/,
        /\brenewHsppAssemblyAssessmentExecutionLease\s*\(/,
        /\breleaseHsppAssemblyAssessmentExecutionLease\s*\(/,
        /\brecordHsppAssemblyAssessmentCompletion/,
        /\bDate\.now\s*\(/,
        /\bnew\s+Date\s*\(\s*\)/,
      ]) {
        assert.doesNotMatch(
          code,
          forbidden,
        );
      }
    },
  );
}
