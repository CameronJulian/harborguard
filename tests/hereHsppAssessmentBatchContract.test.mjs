import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const here =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

test(
  "HERE uses the batch assessment writer instead of the single-row persistence boundary",
  () => {
    assert.match(
      here,
      /applyHsppAssessmentDecisionsBatch/
    );

    assert.doesNotMatch(
      here,
      /applyHsppAssessmentDecision\(\{/
    );

    const batchCalls =
      here.match(
        /applyHsppAssessmentDecisionsBatch\(\{/g
      ) ?? [];

    assert.equal(
      batchCalls.length,
      1
    );
  }
);

test(
  "HERE calculates assessments locally before one batch persistence call",
  () => {
    const calculation =
      here.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    const collect =
      here.indexOf(
        "assessmentDecisions.push({"
      );

    const persist =
      here.indexOf(
        "await applyHsppAssessmentDecisionsBatch({"
      );

    assert.ok(calculation >= 0);
    assert.ok(collect > calculation);
    assert.ok(persist > collect);
  }
);

test(
  "HERE preserves immutable evidence identity and caller-owned assessment time",
  () => {
    assert.match(
      here,
      /evidenceId:\s*[\r\n\s]*context\.persistedEvidence\.id/
    );

    assert.match(
      here,
      /integrityFingerprint:\s*[\r\n\s]*context\.persistedEvidence[\r\n\s]*\.integrityFingerprint/
    );

    assert.match(
      here,
      /assessedAt:\s*[\r\n\s]*new Date\(\)\.toISOString\(\)/
    );
  }
);

test(
  "HERE assessment timing still reports the number of persisted decisions",
  () => {
    assert.match(
      here,
      /const\s+assessmentCount\s*=\s*[\r\n\s]*assessmentDecisions\.length/
    );

    assert.match(
      here,
      /"apply-hspp-assessment"[\s\S]*assessmentCount/
    );
  }
);
