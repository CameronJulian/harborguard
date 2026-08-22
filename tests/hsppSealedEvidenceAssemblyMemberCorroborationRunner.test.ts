import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION } from "../lib/hspp/evaluateHsppAssemblyCorroborationSupport";

import { evaluateHsppMemberCorroboration } from "../lib/hspp/evaluateHsppMemberCorroboration";

import type { HsppCanonicalClaimOutcome } from "../lib/hspp/evaluateHsppCanonicalContradiction";

import type { RunHsppSealedEvidenceAssemblyCorroborationSupportResult } from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroborationSupport";

import {
  HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,
  prepareHsppSealedEvidenceAssemblyMemberCorroboration,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyMemberCorroboration";

const fingerprintA = "a".repeat(64);

const fingerprintB = "b".repeat(64);

type SupportRun = RunHsppSealedEvidenceAssemblyCorroborationSupportResult;

type MembershipRelation =
  SupportRun["assessmentContextRun"]["membershipRelation"];

type BuildOptions = {
  outcomes?: HsppCanonicalClaimOutcome[];

  membershipRelation?: MembershipRelation;

  memberOrdinals?: [number, number];

  providers?: [string, string];

  pairScans?: unknown[];
};

function comparison(outcome: HsppCanonicalClaimOutcome, index: number) {
  return {
    claim: [
      "roadBlocked",
      "trafficFlowImpacted",
      "laneRestriction",
      "roadworksPresent",
    ][index % 4],

    firstValue: outcome === "UNKNOWN" ? "UNKNOWN" : "TRUE",

    secondValue:
      outcome === "CONFLICT"
        ? "FALSE"
        : outcome === "UNKNOWN"
          ? "UNKNOWN"
          : "TRUE",

    outcome,

    comparable: outcome !== "UNKNOWN",
  };
}

function pairScan(
  outcomes: HsppCanonicalClaimOutcome[],
  firstEvidenceId = "evidence-a",
  secondEvidenceId = "evidence-b",
) {
  return {
    firstEvidenceId,

    secondEvidenceId,

    contradictory: outcomes.includes("CONFLICT"),

    comparisons: outcomes.map(comparison),
  };
}

function buildSupportRun(options: BuildOptions = {}): SupportRun {
  const outcomes = options.outcomes ?? ["AGREE"];

  const memberOrdinals = options.memberOrdinals ?? [1, 2];

  const providers = options.providers ?? ["provider-a", "provider-b"];

  const defaultMembershipRelation: Exclude<MembershipRelation, null> = {
    firstEvidenceId: "evidence-a",

    secondEvidenceId: "evidence-b",

    membershipEligible: true,

    membershipPolicyVersion: "hspp-assembly-membership-v1",

    membershipReason: "ELIGIBLE",

    distanceMeters: 25,

    timeDeltaMs: 5000,
  };

  const membershipRelation =
    options.membershipRelation === undefined
      ? defaultMembershipRelation
      : options.membershipRelation;

  const verifiedMembers = [
    {
      evidenceId: "evidence-a",

      integrityFingerprint: fingerprintA,

      memberOrdinal: memberOrdinals[0],

      sourceProvider: providers[0],

      sourceClass: "telematics",

      observedAt: "2026-08-22T08:00:00.000Z",

      integrityStatus: "MATCH",

      validationState: "VALIDATED",
    },

    {
      evidenceId: "evidence-b",

      integrityFingerprint: fingerprintB,

      memberOrdinal: memberOrdinals[1],

      sourceProvider: providers[1],

      sourceClass: "road-intelligence",

      observedAt: "2026-08-22T08:00:05.000Z",

      integrityStatus: "MATCH",

      validationState: "VALIDATED",
    },
  ];

  const pairScans = options.pairScans ?? [pairScan(outcomes)];

  return {
    runnerVersion: "hspp-sealed-assembly-corroboration-support-runner-v1",

    assessmentContextRunnerVersion:
      "hspp-sealed-assembly-assessment-context-runner-v1",

    corroborationSupportPolicyVersion:
      HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,

    organizationId: "org-1",

    assemblyId: "assembly-1",

    assessmentContextRun: {
      membershipRelation,

      authority: {
        decisionPersistence: {
          decisionRun: {
            scanRun: {
              read: {
                verifiedMembers,
              },

              scan: {
                pairScans,
              },
            },
          },
        },
      },
    },

    corroborationSupport: {
      policyVersion: HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,

      state: "CORROBORATION_SUPPORTED",

      reason: "SUPPORTED_ASSESSMENT_CONTEXT",

      organizationId: "org-1",

      assemblyId: "assembly-1",

      assemblyDecisionId: "decision-1",

      assessmentContextVersion: "hspp-assembly-assessment-input-v1",

      evidenceCount: 2,

      evidenceIds: ["evidence-a", "evidence-b"],

      authority: "NONE",
    },
  } as unknown as SupportRun;
}

test("B07K maps exact B07J provenance into existing B11F4", () => {
  const supportRun = buildSupportRun();

  const before = structuredClone(supportRun);

  const preparation =
    prepareHsppSealedEvidenceAssemblyMemberCorroboration(supportRun);

  assert.equal(
    preparation.targetMemberOrdinal,
    HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL,
  );

  assert.equal(preparation.input.targetEvidenceId, "evidence-a");

  assert.equal(preparation.input.targetIntegrityFingerprint, fingerprintA);

  assert.deepEqual(preparation.input.members, [
    {
      evidenceId: "evidence-a",

      integrityFingerprint: fingerprintA,

      sourceProvider: "provider-a",

      sourceClass: "telematics",

      observedAt: "2026-08-22T08:00:00.000Z",

      integrityStatus: "MATCH",

      validationState: "VALIDATED",
    },

    {
      evidenceId: "evidence-b",

      integrityFingerprint: fingerprintB,

      sourceProvider: "provider-b",

      sourceClass: "road-intelligence",

      observedAt: "2026-08-22T08:00:05.000Z",

      integrityStatus: "MATCH",

      validationState: "VALIDATED",
    },
  ]);

  assert.deepEqual(preparation.input.relations, [
    {
      leftEvidenceId: "evidence-a",

      rightEvidenceId: "evidence-b",

      membershipEligible: true,

      membershipPolicyVersion: "hspp-assembly-membership-v1",

      canonicalRelation: "AGREE",
    },
  ]);

  const decision = evaluateHsppMemberCorroboration(preparation.input);

  assert.equal(decision.state, "MEMBER_CORROBORATION_ELIGIBLE");

  assert.equal(decision.reason, "INDEPENDENT_SUPPORT_PRESENT");

  assert.deepEqual(decision.supportingEvidenceIds, ["evidence-b"]);

  assert.equal(decision.authority, "NONE");

  assert.deepEqual(supportRun, before);
});

test("B07K preserves canonical conflict precedence through N3", () => {
  const preparation = prepareHsppSealedEvidenceAssemblyMemberCorroboration(
    buildSupportRun({
      outcomes: ["AGREE", "CONFLICT"],
    }),
  );

  assert.equal(preparation.pairRelationReduction.canonicalRelation, "CONFLICT");

  const decision = evaluateHsppMemberCorroboration(preparation.input);

  assert.equal(decision.state, "MEMBER_CORROBORATION_DENIED");

  assert.equal(decision.reason, "TARGET_CONFLICT_PRESENT");
});

test("B07K does not promote UNKNOWN into corroboration", () => {
  const preparation = prepareHsppSealedEvidenceAssemblyMemberCorroboration(
    buildSupportRun({
      outcomes: ["UNKNOWN"],
    }),
  );

  assert.equal(preparation.pairRelationReduction.canonicalRelation, "UNKNOWN");

  const decision = evaluateHsppMemberCorroboration(preparation.input);

  assert.equal(decision.state, "MEMBER_CORROBORATION_DENIED");

  assert.equal(decision.reason, "NO_INDEPENDENT_SUPPORT");
});

test("B07K fails closed when historical B11A2 relation provenance is absent", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyMemberCorroboration(
        buildSupportRun({
          membershipRelation: null,
        }),
      ),

    /requires persisted B11A2 membership relation provenance/,
  );
});

test("B07K requires exactly one deterministic ordinal-one target", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyMemberCorroboration(
        buildSupportRun({
          memberOrdinals: [2, 3],
        }),
      ),

    /exactly one verified member at ordinal 1/,
  );

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyMemberCorroboration(
        buildSupportRun({
          memberOrdinals: [1, 1],
        }),
      ),

    /exactly one verified member at ordinal 1/,
  );
});

test("B07K requires exactly one B11C pair scan for the persisted membership relation", () => {
  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyMemberCorroboration(
        buildSupportRun({
          pairScans: [pairScan(["AGREE"], "other-a", "other-b")],
        }),
      ),

    /exactly one B11C pair scan/,
  );

  const duplicate = pairScan(["AGREE"]);

  assert.throws(
    () =>
      prepareHsppSealedEvidenceAssemblyMemberCorroboration(
        buildSupportRun({
          pairScans: [duplicate, structuredClone(duplicate)],
        }),
      ),

    /exactly one B11C pair scan/,
  );
});
