import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION,
  HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,
  type RunHsppSealedEvidenceAssemblyMemberCorroborationResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyMemberCorroboration";

import { prepareHsppSealedEvidenceAssemblyCorroboratedAssessment } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessment";

const targetFingerprint = "a".repeat(64);

function eligibleDecision(): HsppMemberCorroborationDecision {
  return {
    policyVersion: HSPP_MEMBER_CORROBORATION_VERSION,

    state: "MEMBER_CORROBORATION_ELIGIBLE",

    reason: "INDEPENDENT_SUPPORT_PRESENT",

    organizationId: "org-1",

    assemblyId: "assembly-1",

    assemblyDecisionId: "decision-1",

    targetEvidenceId: "evidence-a",

    targetIntegrityFingerprint: targetFingerprint,

    supportingEvidenceIds: ["evidence-b"],

    independentSupportCount: 1,

    authority: "NONE",
  };
}

function deniedDecision(): HsppMemberCorroborationDecision {
  return {
    ...eligibleDecision(),

    state: "MEMBER_CORROBORATION_DENIED",

    reason: "NO_INDEPENDENT_SUPPORT",

    supportingEvidenceIds: [],

    independentSupportCount: 0,
  };
}

function buildMemberCorroborationRun(
  decision: HsppMemberCorroborationDecision = eligibleDecision(),
): RunHsppSealedEvidenceAssemblyMemberCorroborationResult {
  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_RUNNER_VERSION,

    corroborationSupportRunnerVersion:
      "hspp-sealed-assembly-corroboration-support-runner-v1",

    canonicalPairRelationReductionVersion:
      "hspp-canonical-pair-relation-reduction-v1",

    memberCorroborationPolicyVersion: decision.policyVersion,

    organizationId: decision.organizationId,

    assemblyId: decision.assemblyId,

    targetMemberOrdinal:
      HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,

    supportRun: {
      retained: true,
    },

    pairRelationReduction: {
      policyVersion: "hspp-canonical-pair-relation-reduction-v1",

      firstEvidenceId: "evidence-a",

      secondEvidenceId: "evidence-b",

      comparisonCount: 1,

      conflictCount: 0,

      agreementCount: 1,

      unknownCount: 0,

      canonicalRelation: "AGREE",

      authority: "NONE",
    },

    memberCorroborationDecision: decision,
  } as unknown as RunHsppSealedEvidenceAssemblyMemberCorroborationResult;
}

test("B07P constructs CORROBORATED through the exact existing B11F5 policy", () => {
  const run = buildMemberCorroborationRun();

  const result = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(run);

  assert.strictEqual(result.memberCorroborationRun, run);

  assert.strictEqual(
    result.memberCorroborationDecision,
    run.memberCorroborationDecision,
  );

  assert.equal(
    result.corroboratedAssessment.policyVersion,
    HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  );

  assert.equal(result.corroboratedAssessment.trustState, "CORROBORATED");

  assert.equal(
    result.corroboratedAssessment.reason,
    "INDEPENDENT_CORROBORATION_ACCEPTED",
  );

  assert.equal(result.corroboratedAssessment.operationalEligible, false);

  assert.equal(result.corroboratedAssessment.crowdEligible, false);

  assert.equal(result.corroboratedAssessment.trainingEligible, false);

  assert.equal(result.corroboratedAssessment.validationEligible, false);
});

test("B07P sends denied B11F4 decisions through B11F5 and preserves UNASSESSED", () => {
  const run = buildMemberCorroborationRun(deniedDecision());

  const result = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(run);

  assert.equal(result.corroboratedAssessment.trustState, "UNASSESSED");

  assert.equal(
    result.corroboratedAssessment.reason,
    "INDEPENDENT_CORROBORATION_DENIED",
  );

  assert.equal(result.corroboratedAssessment.operationalEligible, false);

  assert.equal(result.corroboratedAssessment.crowdEligible, false);

  assert.equal(result.corroboratedAssessment.trainingEligible, false);

  assert.equal(result.corroboratedAssessment.validationEligible, false);
});

test("B07P allows B11F5 to reject an unsupported B11F4 version", () => {
  const decision = {
    ...eligibleDecision(),

    policyVersion:
      "unsupported-b11f4-version" as typeof HSPP_MEMBER_CORROBORATION_VERSION,
  };

  const result = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(
    buildMemberCorroborationRun(decision),
  );

  assert.equal(result.corroboratedAssessment.trustState, "UNASSESSED");

  assert.equal(
    result.corroboratedAssessment.reason,
    "INDEPENDENT_CORROBORATION_DENIED",
  );
});

test("B07P allows B11F5 to reject non-NONE B11F4 authority", () => {
  const decision = {
    ...eligibleDecision(),

    authority: "UNEXPECTED_AUTHORITY" as "NONE",
  };

  const result = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(
    buildMemberCorroborationRun(decision),
  );

  assert.equal(result.corroboratedAssessment.trustState, "UNASSESSED");

  assert.equal(
    result.corroboratedAssessment.reason,
    "INDEPENDENT_CORROBORATION_DENIED",
  );
});

test("B07P retains the full B07K provenance object without reconstruction", () => {
  const run = buildMemberCorroborationRun();

  const result = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(run);

  assert.strictEqual(result.memberCorroborationRun, run);

  assert.strictEqual(
    result.memberCorroborationDecision,
    run.memberCorroborationDecision,
  );
});

test("B07P is deterministic and does not mutate B07K or B11F4 provenance", () => {
  const run = buildMemberCorroborationRun();

  const before = structuredClone(run);

  const first = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(run);

  const second = prepareHsppSealedEvidenceAssemblyCorroboratedAssessment(run);

  assert.deepEqual(first.corroboratedAssessment, second.corroboratedAssessment);

  assert.deepEqual(run, before);
});
