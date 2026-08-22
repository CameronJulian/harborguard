import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import { HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppDeniedCorroboratedMemberAssessment";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting";

import { prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting";

function positiveQ9(): HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult {
  const persistenceResult = {
    marker: "exact-positive-b11f6-result",
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult["persistenceResult"];

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    corroboratedAssessmentRunnerVersion:
      "hspp-sealed-assembly-corroborated-assessment-runner-v1",

    memberCorroborationRunnerVersion:
      "hspp-sealed-assembly-member-corroboration-runner-v1",

    memberCorroborationPolicyVersion: "hspp-member-corroboration-v1",

    corroboratedAssessmentPolicyVersion:
      "hspp-member-corroborated-assessment-v1",

    organizationId: "org-q10",

    assemblyId: "assembly-q10",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    persistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    corroboratedAssessmentRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult["corroboratedAssessmentRun"],

    persistenceResult,
  };
}

function deniedQ9(): HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult {
  const persistenceResult = {
    marker: "exact-denied-q8-result",
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult["persistenceResult"];

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    corroboratedAssessmentRunnerVersion:
      "hspp-sealed-assembly-corroborated-assessment-runner-v1",

    memberCorroborationRunnerVersion:
      "hspp-sealed-assembly-member-corroboration-runner-v1",

    memberCorroborationPolicyVersion: "hspp-member-corroboration-v1",

    corroboratedAssessmentPolicyVersion:
      "hspp-member-corroborated-assessment-v1",

    organizationId: "org-q10",

    assemblyId: "assembly-q10",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_DENIED",

    persistenceVersion: HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION,

    corroboratedAssessmentRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult["corroboratedAssessmentRun"],

    persistenceResult,
  };
}

test("Q10 positive preparation exposes the exact Q9 B11F6 persistence result", () => {
  const upstream = positiveQ9();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_ELIGIBLE");

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q10 eligible preparation.");
  }

  assert.strictEqual(prepared.persistenceRoutingRun, upstream);

  assert.strictEqual(prepared.persistedAssessment, upstream.persistenceResult);
});

test("Q10 denied preparation terminates without projecting a B11G2 input", () => {
  const upstream = deniedQ9();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_DENIED");

  assert.strictEqual(prepared.persistenceRoutingRun, upstream);

  assert.equal("persistedAssessment" in prepared, false);
});

test("Q10 preparation is deterministic and does not mutate positive Q9 provenance", () => {
  const upstream = positiveQ9();

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);

  assert.strictEqual(first.persistenceRoutingRun, upstream);

  if (first.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected deterministic Q10 eligible preparation.");
  }

  assert.strictEqual(first.persistedAssessment, upstream.persistenceResult);
});

test("Q10 preparation is deterministic and does not mutate denied Q9 provenance", () => {
  const upstream = deniedQ9();

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      upstream,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);

  assert.strictEqual(first.persistenceRoutingRun, upstream);
});

test("Q10 does not pre-filter or reinterpret a positive Q9 persistence result", () => {
  const upstream = positiveQ9();

  const malformedPersistedAssessment = {
    marker: "B11G2-must-remain-the-validator",
  };

  const malformed = {
    ...upstream,

    persistenceResult: malformedPersistedAssessment,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult;

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      malformed,
    );

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q10 eligible preparation.");
  }

  assert.strictEqual(
    prepared.persistedAssessment,
    malformedPersistedAssessment,
  );
});

test("Q10 requires one completed Q9 persistence-routing result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult,
      ),
    /requires one completed B7490-07Q9 persistence-routing run/,
  );
});

test("Q10 requires the positive Q9 B11F6 persistence result", () => {
  const malformed = {
    ...positiveQ9(),

    persistenceResult: null,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
        malformed,
      ),
    /requires the exact positive B11F6 persistence result returned by Q9/,
  );
});

test("Q10 requires the denied Q9 Q8 persistence result", () => {
  const malformed = {
    ...deniedQ9(),

    persistenceResult: null,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
        malformed,
      ),
    /requires the exact denied Q8 persistence result returned by Q9/,
  );
});

test("Q10 rejects an unknown Q9 branch", () => {
  const malformed = {
    ...positiveQ9(),

    branch: "UNKNOWN",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
        malformed,
      ),
    /requires one canonical Q9 persistence-routing branch/,
  );
});
