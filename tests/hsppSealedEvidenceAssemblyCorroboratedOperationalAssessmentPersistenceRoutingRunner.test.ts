import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedMember";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  type HsppCorroboratedOperationalAssessment,
} from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,
  type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult,
  type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting";

import { prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting";

const assessedAt = "2026-08-22T12:00:00.000Z";

function authorityDecision(): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state: "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId: "org-q12",

    assemblyId: "assembly-q12",

    assemblyDecisionId: "assembly-decision-q12",

    evidenceId: "evidence-q12",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds: ["support-q12"],

    independentSupportCount: 1,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",
  };
}

function operationalAssessment(): HsppCorroboratedOperationalAssessment {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    operationalEligible: true,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
  };
}

function eligibleQ11(): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult {
  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,

    authorityRoutingRunnerVersion:
      "hspp-sealed-assembly-corroborated-assessment-operational-authority-routing-runner-v1",

    organizationId: "org-q12",

    assemblyId: "assembly-q12",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    authorityRoutingRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult["authorityRoutingRun"],

    authorityPolicyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    operationalAssessmentPolicyVersion:
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    authorityDecision: authorityDecision(),

    operationalAssessment: operationalAssessment(),
  };
}

function deniedQ11(): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult {
  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,

    authorityRoutingRunnerVersion:
      "hspp-sealed-assembly-corroborated-assessment-operational-authority-routing-runner-v1",

    organizationId: "org-q12",

    assemblyId: "assembly-q12",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_DENIED",

    authorityRoutingRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult["authorityRoutingRun"],

    authorityDecision: null,

    operationalAssessment: null,
  };
}

test("Q12 eligible preparation preserves exact Q11 authority decision and Q4 assessment references", () => {
  const upstream = eligibleQ11();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      upstream,
      assessedAt,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_ELIGIBLE");

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q12 eligible preparation.");
  }

  assert.strictEqual(prepared.operationalAssessmentRoutingRun, upstream);

  assert.strictEqual(prepared.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(prepared.assessment, upstream.operationalAssessment);

  assert.equal(prepared.assessedAt, assessedAt);
});

test("Q12 denied preparation keeps the terminal Q11 branch out of persistence", () => {
  const upstream = deniedQ11();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      upstream,
      assessedAt,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_DENIED");

  assert.strictEqual(prepared.operationalAssessmentRoutingRun, upstream);

  assert.equal("authorityDecision" in prepared, false);

  assert.equal("assessment" in prepared, false);

  assert.equal("assessedAt" in prepared, false);
});

test("Q12 preserves caller-owned assessedAt without normalization", () => {
  const upstream = eligibleQ11();

  const callerValue = "2026-08-22T14:00:00+02:00";

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      upstream,
      callerValue,
    );

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q12 eligible preparation.");
  }

  assert.equal(prepared.assessedAt, callerValue);
});

test("Q12 preparation is deterministic and does not mutate eligible Q11 provenance", () => {
  const upstream = eligibleQ11();

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      upstream,
      assessedAt,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      upstream,
      assessedAt,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);

  if (first.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected deterministic Q12 eligible preparation.");
  }

  assert.strictEqual(first.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(first.assessment, upstream.operationalAssessment);
});

test("Q12 does not pre-filter or reinterpret an eligible Q11 assessment before Q6", () => {
  const upstream = eligibleQ11();

  const defensiveAssessment = {
    ...upstream.operationalAssessment,

    operationalEligible: false,

    reason: "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
  } as HsppCorroboratedOperationalAssessment;

  const malformed = {
    ...upstream,

    operationalAssessment: defensiveAssessment,
  } as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      malformed,
      assessedAt,
    );

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q12 eligible preparation.");
  }

  assert.strictEqual(prepared.assessment, defensiveAssessment);
});

test("Q12 requires one completed Q11 routing result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult,
        assessedAt,
      ),
    /requires one completed B7490-07Q11 operational-assessment routing run/,
  );
});

test("Q12 requires the exact eligible Q11 authority decision", () => {
  const malformed = {
    ...eligibleQ11(),

    authorityDecision: null,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
        malformed,
        assessedAt,
      ),
    /requires the exact B11G2 authority decision returned by Q11/,
  );
});

test("Q12 requires the exact eligible Q11 operational assessment", () => {
  const malformed = {
    ...eligibleQ11(),

    operationalAssessment: null,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
        malformed,
        assessedAt,
      ),
    /requires the exact Q4 operational assessment returned by Q11/,
  );
});

test("Q12 requires the exact terminal denied Q11 shape", () => {
  const malformed = {
    ...deniedQ11(),

    operationalAssessment: operationalAssessment(),
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
        malformed,
        assessedAt,
      ),
    /requires the exact terminal denied Q11 result/,
  );
});

test("Q12 rejects an unknown Q11 routing branch", () => {
  const malformed = {
    ...eligibleQ11(),

    branch: "UNKNOWN",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
        malformed,
        assessedAt,
      ),
    /requires one canonical Q11 routing branch/,
  );
});
