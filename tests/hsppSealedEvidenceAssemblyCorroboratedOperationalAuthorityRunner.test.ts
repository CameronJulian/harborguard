import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence";

import { prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority";

function completedQ2(): RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult {
  const persistedAssessment = {
    marker: "exact-b11f6-persisted-assessment",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult["persistedAssessment"];

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_RUNNER_VERSION,

    organizationId: "org-1",

    assemblyId: "assembly-1",

    targetMemberOrdinal: 1,

    persistedAssessment,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult;
}

test("B7490-07Q3 preserves the exact Q2 persisted B11F6 assessment reference", () => {
  const q2 = completedQ2();

  const persistedAssessment =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(q2);

  assert.strictEqual(persistedAssessment, q2.persistedAssessment);
});

test("B7490-07Q3 preparation is deterministic and does not mutate Q2 provenance", () => {
  const q2 = completedQ2();

  const before = structuredClone(q2);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(q2);

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(q2);

  assert.strictEqual(first, second);

  assert.deepEqual(q2, before);
});

test("B7490-07Q3 does not pre-filter or reinterpret the persisted B11F6 result", () => {
  const q2 = completedQ2();

  const unusualPersistedAssessment = {
    marker: "let-b11g2-decide",
    state: "UNEXPECTED_STATE",
    operationalEligible: true,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult["persistedAssessment"];

  const unusualQ2 = {
    ...q2,

    persistedAssessment: unusualPersistedAssessment,
  } as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult;

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(
      unusualQ2,
    );

  assert.strictEqual(prepared, unusualPersistedAssessment);
});

test("B7490-07Q3 requires one completed Q2 persistence run", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult,
      ),
    /requires one completed B7490-07Q2 persistence run/,
  );
});

test("B7490-07Q3 requires the exact persisted B11F6 assessment from Q2", () => {
  const q2 = {
    ...completedQ2(),

    persistedAssessment: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceResult;

  assert.throws(
    () => prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority(q2),
    /requires the exact persisted B11F6 assessment returned by Q2/,
  );
});
