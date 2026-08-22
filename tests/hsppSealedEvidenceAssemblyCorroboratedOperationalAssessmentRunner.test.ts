import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedMember";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority";

import { HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

import { prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment";

function authorityDecision(
  overrides: Partial<HsppCorroboratedOperationalAuthorityDecision> = {},
): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state: "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId: "org-q5",

    assemblyId: "assembly-q5",

    assemblyDecisionId: "assembly-decision-q5",

    evidenceId: "target-evidence-q5",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds: ["support-evidence-q5"],

    independentSupportCount: 1,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",

    ...overrides,
  };
}

function q3Run(
  decision = authorityDecision(),
): RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult {
  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_AUTHORITY_RUNNER_VERSION,

    authorityPolicyVersion: decision.policyVersion,

    organizationId: "org-q5",

    assemblyId: "assembly-q5",

    targetMemberOrdinal: 1,

    authorityDecision: decision,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult;
}

test("B7490-07Q5 preserves the exact Q3 run and exact B11G2 authority-decision references", () => {
  const decision = authorityDecision();

  const upstream = q3Run(decision);

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
      upstream,
    );

  assert.strictEqual(prepared.corroboratedOperationalAuthorityRun, upstream);

  assert.strictEqual(prepared.authorityDecision, decision);

  assert.strictEqual(prepared.authorityDecision, upstream.authorityDecision);
});

test("B7490-07Q5 projects a valid Q3 candidacy through the exact Q4 assessment", () => {
  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(q3Run());

  assert.deepEqual(prepared.operationalAssessment, {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    operationalEligible: true,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
  });
});

test("B7490-07Q5 preserves Q4 fail-closed behavior for a denied Q3 authority decision", () => {
  const denied = authorityDecision({
    state: "OPERATIONAL_AUTHORITY_DENIED",

    reason: "TRUST_NOT_CORROBORATED",
  });

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
      q3Run(denied),
    );

  assert.equal(prepared.operationalAssessment.operationalEligible, false);

  assert.equal(
    prepared.operationalAssessment.reason,
    "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
  );

  assert.equal(prepared.operationalAssessment.crowdEligible, false);

  assert.equal(prepared.operationalAssessment.trainingEligible, false);

  assert.equal(prepared.operationalAssessment.validationEligible, false);
});

test("B7490-07Q5 preparation is deterministic and does not mutate Q3 provenance", () => {
  const upstream = q3Run();

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
      upstream,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
      upstream,
    );

  assert.deepEqual(first.operationalAssessment, second.operationalAssessment);

  assert.strictEqual(first.corroboratedOperationalAuthorityRun, upstream);

  assert.strictEqual(second.corroboratedOperationalAuthorityRun, upstream);

  assert.strictEqual(first.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(second.authorityDecision, upstream.authorityDecision);

  assert.deepEqual(upstream, before);
});

test("B7490-07Q5 requires one completed Q3 run", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult,
      ),
    /requires one completed B7490-07Q3 operational-authority run/,
  );
});

test("B7490-07Q5 requires the exact B11G2 authority decision from Q3", () => {
  const upstream = {
    ...q3Run(),

    authorityDecision: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthorityResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment(
        upstream,
      ),
    /requires the exact B11G2 authority decision returned by Q3/,
  );
});
