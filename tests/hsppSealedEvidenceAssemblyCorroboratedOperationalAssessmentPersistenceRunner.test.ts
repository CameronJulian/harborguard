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
  assessHsppCorroboratedOperationalAuthority,
} from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment";

import { prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence";

function authorityDecision(): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state: "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId: "org-q7",

    assemblyId: "assembly-q7",

    assemblyDecisionId: "assembly-decision-q7",

    evidenceId: "target-evidence-q7",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds: ["support-evidence-q7"],

    independentSupportCount: 1,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",
  };
}

function q5Run(): RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION,

    corroboratedOperationalAuthorityRunnerVersion:
      "hspp-sealed-assembly-corroborated-operational-authority-runner-v1",

    authorityPolicyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    operationalAssessmentPolicyVersion:
      HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    organizationId: "org-q7",

    assemblyId: "assembly-q7",

    targetMemberOrdinal: 1,

    corroboratedOperationalAuthorityRun:
      {} as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult["corroboratedOperationalAuthorityRun"],

    authorityDecision: decision,

    operationalAssessment: assessment,
  };
}

test("B7490-07Q7 preserves the exact Q5 authority decision and operational assessment references", () => {
  const upstream = q5Run();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
      upstream,
      "2026-08-22T10:00:00.000Z",
    );

  assert.strictEqual(prepared.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(prepared.assessment, upstream.operationalAssessment);
});

test("B7490-07Q7 preserves caller-owned assessedAt without normalization", () => {
  const supplied = "2026-08-22T12:00:00+02:00";

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
      q5Run(),
      supplied,
    );

  assert.strictEqual(prepared.assessedAt, supplied);
});

test("B7490-07Q7 preparation is deterministic and does not mutate Q5 provenance", () => {
  const upstream = q5Run();

  const before = structuredClone(upstream);

  const assessedAt = "2026-08-22T10:00:00.000Z";

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
      upstream,
      assessedAt,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
      upstream,
      assessedAt,
    );

  assert.strictEqual(first.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(first.assessment, upstream.operationalAssessment);

  assert.strictEqual(second.authorityDecision, upstream.authorityDecision);

  assert.strictEqual(second.assessment, upstream.operationalAssessment);

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);
});

test("B7490-07Q7 requires one completed Q5 result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult,
        "2026-08-22T10:00:00.000Z",
      ),
    /requires one completed B7490-07Q5 operational-assessment run/,
  );
});

test("B7490-07Q7 requires the exact authority decision returned by Q5", () => {
  const upstream = {
    ...q5Run(),

    authorityDecision: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
        upstream,
        "2026-08-22T10:00:00.000Z",
      ),
    /requires the exact B11G2 authority decision returned by Q5/,
  );
});

test("B7490-07Q7 requires the exact operational assessment returned by Q5", () => {
  const upstream = {
    ...q5Run(),

    operationalAssessment: null,
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
        upstream,
        "2026-08-22T10:00:00.000Z",
      ),
    /requires the exact Q4 operational assessment returned by Q5/,
  );
});
