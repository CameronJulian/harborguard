import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessment";

import { prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence";

function completedB07P(): RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult {
  const memberCorroborationDecision = {
    marker: "exact-b11f4-decision",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationDecision"];

  const corroboratedAssessment = {
    marker: "exact-b11f5-assessment",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["corroboratedAssessment"];

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,

    memberCorroborationDecision,

    corroboratedAssessment,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;
}

test("B7490-07Q2 projects the exact B07P B11F4 and B11F5 objects into B11F6 input", () => {
  const run = completedB07P();

  const assessedAt = "2026-08-22T09:30:00.000Z";

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
      run,
      assessedAt,
    );

  assert.strictEqual(
    preparation.corroborationDecision,
    run.memberCorroborationDecision,
  );

  assert.strictEqual(preparation.assessment, run.corroboratedAssessment);

  assert.equal(preparation.assessedAt, assessedAt);
});

test("B7490-07Q2 preserves caller-owned assessedAt without normalization", () => {
  const run = completedB07P();

  const assessedAt = "  2026-08-22T11:30:00+02:00  ";

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
      run,
      assessedAt,
    );

  assert.equal(preparation.assessedAt, assessedAt);
});

test("B7490-07Q2 preparation is deterministic and does not mutate B07P provenance", () => {
  const run = completedB07P();

  const before = structuredClone(run);

  const assessedAt = "2026-08-22T09:30:00.000Z";

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
      run,
      assessedAt,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
      run,
      assessedAt,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(run, before);
});

test("B7490-07Q2 requires one completed B07P result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
        "2026-08-22T09:30:00.000Z",
      ),
    /requires one completed B07P corroborated-assessment run/,
  );
});

test("B7490-07Q2 requires the exact B11F5 assessment from B07P", () => {
  const run = {
    ...completedB07P(),

    corroboratedAssessment: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(
        run,
        "2026-08-22T09:30:00.000Z",
      ),
    /requires the exact B11F5 assessment produced by B07P/,
  );
});
