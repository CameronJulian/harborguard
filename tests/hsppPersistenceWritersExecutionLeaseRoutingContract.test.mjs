import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contextSource =
  fs.readFileSync(
    "lib/hspp/hsppAssessmentExecutionLeaseContext.ts",
    "utf8",
  );

const legacyFencedWriterPaths = [
  "lib/hspp/persistHsppDeniedCorroboratedMemberAssessment.ts",
  "lib/hspp/persistHsppCorroboratedMemberAssessment.ts",
];

const q6Path =
  "lib/hspp/persistHsppCorroboratedOperationalAssessment.ts";

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

for (const path of legacyFencedWriterPaths) {
  test(
    `${path} preserves generic persistence and one general fenced alternative`,
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

      const positiveCheckpointCalls =
        code.match(
          /\bpersistHsppPositiveAssessmentCheckpointUnderExecutionLease\s*\(/g,
        ) ?? [];

      assert.equal(
        genericCalls.length,
        1,
      );

      assert.equal(
        fencedCalls.length,
        1,
      );

      assert.equal(
        positiveCheckpointCalls.length,
        0,
      );

      assert.match(
        code,
        /executionLeaseAssemblyId\.toLowerCase\(\)\s*!==\s*assemblyId\.toLowerCase\(\)/,
      );
    },
  );
}

test(
  "Q6 preserves generic persistence and uses the atomic positive-checkpoint lease alternative",
  () => {
    const source =
      fs.readFileSync(
        q6Path,
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

    const oldFencedCalls =
      code.match(
        /\bapplyHsppAssessmentDecisionUnderExecutionLease\s*\(/g,
      ) ?? [];

    const positiveCheckpointCalls =
      code.match(
        /\bpersistHsppPositiveAssessmentCheckpointUnderExecutionLease\s*\(/g,
      ) ?? [];

    assert.equal(
      genericCalls.length,
      1,
    );

    assert.equal(
      oldFencedCalls.length,
      0,
    );

    assert.equal(
      positiveCheckpointCalls.length,
      1,
    );

    assert.match(
      code,
      /executionLeaseAssemblyId\.toLowerCase\(\)\s*!==\s*assemblyId\.toLowerCase\(\)/,
    );

    assert.match(
      code,
      /persistHsppPositiveAssessmentCheckpointUnderExecutionLease\s*\(\{[\s\S]*?organizationId,[\s\S]*?assemblyId,[\s\S]*?assemblyDecisionId,[\s\S]*?leaseToken:\s*executionLease\.leaseToken,[\s\S]*?evidenceId,[\s\S]*?integrityFingerprint,[\s\S]*?assessedAt,/,
    );
  },
);