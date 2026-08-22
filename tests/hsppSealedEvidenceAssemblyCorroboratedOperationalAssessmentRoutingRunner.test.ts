import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedMember";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

import { HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting";

import { prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting";

function authorityDecision(
  state: "OPERATIONAL_AUTHORITY_CANDIDATE" | "OPERATIONAL_AUTHORITY_DENIED",
): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state,

    reason:
      state === "OPERATIONAL_AUTHORITY_CANDIDATE"
        ? "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"
        : "INVALID_SUPPORT_CARDINALITY",

    organizationId: "org-q11",

    assemblyId: "assembly-q11",

    assemblyDecisionId: "assembly-decision-q11",

    evidenceId: "evidence-q11",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds:
      state === "OPERATIONAL_AUTHORITY_CANDIDATE" ? ["support-q11"] : [],

    independentSupportCount:
      state === "OPERATIONAL_AUTHORITY_CANDIDATE" ? 1 : 0,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",
  };
}

function eligibleQ10(
  decision: HsppCorroboratedOperationalAuthorityDecision,
): HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult {
  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,

    persistenceRoutingRunnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    organizationId: "org-q11",

    assemblyId: "assembly-q11",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    persistenceRoutingRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult["persistenceRoutingRun"],

    authorityPolicyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    authorityDecision: decision,
  };
}

function deniedQ10(): HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult {
  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,

    persistenceRoutingRunnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    organizationId: "org-q11",

    assemblyId: "assembly-q11",

    targetMemberOrdinal: 1,

    branch: "MEMBER_CORROBORATION_DENIED",

    persistenceRoutingRun:
      {} as HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult["persistenceRoutingRun"],

    authorityDecision: null,
  };
}

test("Q11 passes the exact Q10 B11G2 candidacy decision into Q4", () => {
  const decision = authorityDecision("OPERATIONAL_AUTHORITY_CANDIDATE");

  const upstream = eligibleQ10(decision);

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_ELIGIBLE");

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q11 eligible preparation.");
  }

  assert.strictEqual(prepared.authorityRoutingRun, upstream);

  assert.strictEqual(prepared.authorityDecision, decision);

  assert.equal(prepared.operationalAssessment.trustState, "CORROBORATED");

  assert.equal(prepared.operationalAssessment.operationalEligible, true);

  assert.equal(
    prepared.operationalAssessment.reason,
    "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
  );
});

test("Q11 passes a B11G2 denial into Q4 without pre-filtering it", () => {
  const decision = authorityDecision("OPERATIONAL_AUTHORITY_DENIED");

  const upstream = eligibleQ10(decision);

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  if (prepared.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected Q11 eligible preparation.");
  }

  assert.strictEqual(prepared.authorityDecision, decision);

  assert.equal(prepared.operationalAssessment.trustState, "CORROBORATED");

  assert.equal(prepared.operationalAssessment.operationalEligible, false);

  assert.equal(
    prepared.operationalAssessment.reason,
    "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED",
  );
});

test("Q11 keeps the denied Q10 branch terminal without creating a Q4 assessment", () => {
  const upstream = deniedQ10();

  const prepared =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  assert.equal(prepared.branch, "MEMBER_CORROBORATION_DENIED");

  assert.strictEqual(prepared.authorityRoutingRun, upstream);

  assert.equal("authorityDecision" in prepared, false);

  assert.equal("operationalAssessment" in prepared, false);
});

test("Q11 eligible preparation is deterministic and does not mutate Q10 provenance", () => {
  const upstream = eligibleQ10(
    authorityDecision("OPERATIONAL_AUTHORITY_CANDIDATE"),
  );

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);

  assert.strictEqual(first.authorityRoutingRun, upstream);

  if (first.branch !== "MEMBER_CORROBORATION_ELIGIBLE") {
    assert.fail("Expected deterministic Q11 eligible preparation.");
  }

  assert.strictEqual(first.authorityDecision, upstream.authorityDecision);
});

test("Q11 denied preparation is deterministic and does not mutate terminal Q10 provenance", () => {
  const upstream = deniedQ10();

  const before = structuredClone(upstream);

  const first =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  const second =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      upstream,
    );

  assert.deepEqual(first, second);

  assert.deepEqual(upstream, before);

  assert.strictEqual(first.authorityRoutingRun, upstream);
});

test("Q11 requires one completed Q10 authority-routing result", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
        null as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult,
      ),
    /requires one completed B7490-07Q10 authority-routing run/,
  );
});

test("Q11 requires the exact eligible Q10 B11G2 authority decision", () => {
  const malformed = {
    ...eligibleQ10(authorityDecision("OPERATIONAL_AUTHORITY_CANDIDATE")),

    authorityDecision: null,
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
        malformed,
      ),
    /requires the exact B11G2 authority decision returned by Q10/,
  );
});

test("Q11 requires the exact terminal denied Q10 shape", () => {
  const malformed = {
    ...deniedQ10(),

    authorityDecision: authorityDecision("OPERATIONAL_AUTHORITY_DENIED"),
  } as unknown as HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
        malformed,
      ),
    /requires the exact terminal denied Q10 result/,
  );
});

test("Q11 rejects an unknown Q10 branch", () => {
  const malformed = {
    ...eligibleQ10(authorityDecision("OPERATIONAL_AUTHORITY_CANDIDATE")),

    branch: "UNKNOWN",
  } as unknown as RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult;

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
        malformed,
      ),
    /requires one canonical Q10 authority-routing branch/,
  );
});
