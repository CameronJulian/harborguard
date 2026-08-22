import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  type HsppCorroboratedMemberAssessment,
} from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessment";

import { prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting";

function decision(
  state: "MEMBER_CORROBORATION_ELIGIBLE" | "MEMBER_CORROBORATION_DENIED",
): HsppMemberCorroborationDecision {
  return {
    policyVersion: HSPP_MEMBER_CORROBORATION_VERSION,

    state,

    reason:
      state === "MEMBER_CORROBORATION_ELIGIBLE"
        ? "INDEPENDENT_SUPPORT_PRESENT"
        : "NO_INDEPENDENT_SUPPORT",

    organizationId: "org-q9",

    assemblyId: "assembly-q9",

    assemblyDecisionId: "assembly-decision-q9",

    targetEvidenceId: "target-evidence-q9",

    targetIntegrityFingerprint: "a".repeat(64),

    supportingEvidenceIds:
      state === "MEMBER_CORROBORATION_ELIGIBLE" ? ["support-evidence-q9"] : [],

    independentSupportCount: state === "MEMBER_CORROBORATION_ELIGIBLE" ? 1 : 0,

    authority: "NONE",
  };
}

function assessment(
  state: "MEMBER_CORROBORATION_ELIGIBLE" | "MEMBER_CORROBORATION_DENIED",
): HsppCorroboratedMemberAssessment {
  return {
    policyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState:
      state === "MEMBER_CORROBORATION_ELIGIBLE" ? "CORROBORATED" : "UNASSESSED",

    operationalEligible: false,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason:
      state === "MEMBER_CORROBORATION_ELIGIBLE"
        ? "INDEPENDENT_CORROBORATION_ACCEPTED"
        : "INDEPENDENT_CORROBORATION_DENIED",
  };
}

function completedB07P(
  state: "MEMBER_CORROBORATION_ELIGIBLE" | "MEMBER_CORROBORATION_DENIED",
): RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult {
  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_RUNNER_VERSION,

    memberCorroborationRunnerVersion:
      "hspp-sealed-assembly-member-corroboration-runner-v1",

    memberCorroborationPolicyVersion: HSPP_MEMBER_CORROBORATION_VERSION,

    corroboratedAssessmentPolicyVersion:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    organizationId: "org-q9",

    assemblyId: "assembly-q9",

    targetMemberOrdinal: 1,

    memberCorroborationRun:
      {} as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult["memberCorroborationRun"],

    memberCorroborationDecision: decision(state),

    corroboratedAssessment: assessment(state),
  };
}

test("Q9 routes the exact eligible B07P objects to the positive branch", () => {
  const upstream = completedB07P("MEMBER_CORROBORATION_ELIGIBLE");

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
      upstream,
      "2026-08-22T11:30:00.000Z",
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_ELIGIBLE");

  assert.strictEqual(
    prepared.corroborationDecision,
    upstream.memberCorroborationDecision,
  );

  assert.strictEqual(prepared.assessment, upstream.corroboratedAssessment);
});

test("Q9 routes the exact denied B07P objects to the negative branch", () => {
  const upstream = completedB07P("MEMBER_CORROBORATION_DENIED");

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
      upstream,
      "2026-08-22T11:30:00.000Z",
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_DENIED");

  assert.strictEqual(
    prepared.corroborationDecision,
    upstream.memberCorroborationDecision,
  );

  assert.strictEqual(prepared.assessment, upstream.corroboratedAssessment);
});

test("Q9 preserves caller-owned assessedAt unchanged on either branch", () => {
  const supplied = "2026-08-22T13:30:00+02:00";

  for (const state of [
    "MEMBER_CORROBORATION_ELIGIBLE",
    "MEMBER_CORROBORATION_DENIED",
  ] as const) {
    const prepared =
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        completedB07P(state),
        supplied,
      );

    assert.equal(prepared.assessedAt, supplied);
  }
});

test("Q9 preparation is deterministic and does not mutate B07P provenance", () => {
  for (const state of [
    "MEMBER_CORROBORATION_ELIGIBLE",
    "MEMBER_CORROBORATION_DENIED",
  ] as const) {
    const upstream = completedB07P(state);

    const before = structuredClone(upstream);

    const first =
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        upstream,
        "2026-08-22T11:30:00.000Z",
      );

    const second =
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        upstream,
        "2026-08-22T11:30:00.000Z",
      );

    assert.deepEqual(first, second);

    assert.deepEqual(upstream, before);
  }
});

test("Q9 requires one completed B07P result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult,
        "2026-08-22T11:30:00.000Z",
      ),
    /requires one completed B07P corroborated-assessment run/,
  );
});

test("Q9 requires the exact B11F4 decision from B07P", () => {
  const upstream = {
    ...completedB07P("MEMBER_CORROBORATION_ELIGIBLE"),

    memberCorroborationDecision: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        upstream,
        "2026-08-22T11:30:00.000Z",
      ),
    /requires the exact B11F4 decision returned by B07P/,
  );
});

test("Q9 requires the exact B11F5 assessment from B07P", () => {
  const upstream = {
    ...completedB07P("MEMBER_CORROBORATION_ELIGIBLE"),

    corroboratedAssessment: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        upstream,
        "2026-08-22T11:30:00.000Z",
      ),
    /requires the exact B11F5 assessment returned by B07P/,
  );
});

test("Q9 rejects an unknown B11F4 routing state before persistence", () => {
  const upstream = completedB07P("MEMBER_CORROBORATION_ELIGIBLE");

  const malformed = {
    ...upstream,

    memberCorroborationDecision: {
      ...upstream.memberCorroborationDecision,

      state: "UNKNOWN",
    },
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
        malformed,
        "2026-08-22T11:30:00.000Z",
      ),
    /requires one canonical B11F4 routing state/,
  );
});
