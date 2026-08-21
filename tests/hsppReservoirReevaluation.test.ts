import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppReservoirReevaluation,
  HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,
  HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
} from "../lib/hspp/evaluateHsppReservoirReevaluation";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

function candidate(
  id: string,
  provider: string,
  overrides: Record<string, unknown> = {},
) {
  const normalizedPayload = {
    latitude: -33.946,
    longitude: 18.587,
    eventType: "accident",
    ...overrides,
  };

  const evidence = buildHsppEvidence({
    sourceClass: "external_intelligence",

    sourceProvider: provider,

    sourceStream: "lifeguard-test",

    sourceMessageId: `message-${id}`,

    observedAt: "2026-08-21T10:00:00.000Z",

    receivedAt: "2026-08-21T10:00:01.000Z",

    payloadSchemaVersion: "1",

    normalizedPayload,
  });

  return {
    evidenceId: id,

    operationalRead: {
      readResult: {
        found: true as const,

        evidence: {
          id,

          organizationId: "org-1",

          protocolVersion: evidence.protocolVersion,

          canonicalizationVersion: evidence.canonicalizationVersion,

          sourceClass: evidence.sourceClass,

          sourceProvider: evidence.sourceProvider,

          sourceStream: evidence.sourceStream,

          sourceMessageId: evidence.sourceMessageId,

          observedAt: evidence.observedAt,

          receivedAt: evidence.receivedAt,

          payloadSchemaVersion: evidence.payloadSchemaVersion,

          normalizedPayload: evidence.normalizedPayload,

          integrityAlgorithm: evidence.integrityAlgorithm,

          integrityFingerprint: evidence.integrityFingerprint,

          integrityState: evidence.integrityState,

          validationState: "VALIDATED",

          trustState: "VERIFIED",

          operationalEligible: true,

          assessmentPolicyVersion: "hspp-test-assessment-v1",

          assessmentReason: "test",

          assessedAt: "2026-08-21T10:00:02.000Z",

          derivationLineage: evidence.derivationLineage,
        },

        verification: {
          verified: true,
          reason: "fingerprint_match",
        },
      },

      decision: {
        policyVersion: "hspp-operational-use-v1",

        allowed: true,

        reason: "operational_use_allowed",
      },

      evidence: {
        id,

        organizationId: "org-1",

        protocolVersion: evidence.protocolVersion,

        canonicalizationVersion: evidence.canonicalizationVersion,

        sourceClass: evidence.sourceClass,

        sourceProvider: evidence.sourceProvider,

        sourceStream: evidence.sourceStream,

        sourceMessageId: evidence.sourceMessageId,

        observedAt: evidence.observedAt,

        receivedAt: evidence.receivedAt,

        payloadSchemaVersion: evidence.payloadSchemaVersion,

        normalizedPayload: evidence.normalizedPayload,

        integrityAlgorithm: evidence.integrityAlgorithm,

        integrityFingerprint: evidence.integrityFingerprint,

        integrityState: evidence.integrityState,

        validationState: "VALIDATED",

        trustState: "VERIFIED",

        operationalEligible: true,

        assessmentPolicyVersion: "hspp-test-assessment-v1",

        assessmentReason: "test",

        assessedAt: "2026-08-21T10:00:02.000Z",

        derivationLineage: evidence.derivationLineage,
      },
    },

    hasAssemblyMembership: false,

    reservoirDecision: {
      policyVersion: "hspp-reservoir-eligibility-v1",

      eligible: true,

      reason: "RESERVOIR_ELIGIBLE",
    },
  };
}

test("B07A returns NO_COUNTERPART for fewer than two Reservoir candidates", () => {
  const result = evaluateHsppReservoirReevaluation([
    candidate("evidence-a", "here"),
  ] as any);

  assert.equal(
    result.policyVersion,
    HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
  );

  assert.equal(result.state, "NO_COUNTERPART");

  assert.equal(result.comparisonCount, 0);
});

test("B07A discovers an eligible cross-provider assembly candidate", () => {
  const result = evaluateHsppReservoirReevaluation([
    candidate("evidence-b", "tomtom"),

    candidate("evidence-a", "here"),
  ] as any);

  assert.equal(result.state, "ASSEMBLY_CANDIDATE");

  assert.equal(result.comparisonCount, 1);

  assert.equal(result.assemblyCandidates.length, 1);

  assert.equal(result.assemblyCandidates[0].firstEvidenceId, "evidence-a");

  assert.equal(result.assemblyCandidates[0].secondEvidenceId, "evidence-b");

  assert.equal(
    result.assemblyCandidates[0].membershipDecision.reason,
    "ELIGIBLE",
  );
});

test("B07A keeps same-provider evidence out of assembly candidacy", () => {
  const result = evaluateHsppReservoirReevaluation([
    candidate("evidence-a", "here"),

    candidate("evidence-b", "here"),
  ] as any);

  assert.equal(result.state, "MEMBERSHIP_DENIED");

  assert.equal(result.assemblyCandidates.length, 0);

  assert.equal(
    result.evaluations[0].membershipDecision.reason,
    "SAME_PROVIDER",
  );
});

test("B07A pair ordering is deterministic", () => {
  const first = evaluateHsppReservoirReevaluation([
    candidate("evidence-c", "provider-c"),
    candidate("evidence-a", "provider-a"),
    candidate("evidence-b", "provider-b"),
  ] as any);

  const second = evaluateHsppReservoirReevaluation([
    candidate("evidence-b", "provider-b"),
    candidate("evidence-c", "provider-c"),
    candidate("evidence-a", "provider-a"),
  ] as any);

  assert.deepEqual(
    first.evaluations.map((item) => [
      item.firstEvidenceId,
      item.secondEvidenceId,
    ]),

    second.evaluations.map((item) => [
      item.firstEvidenceId,
      item.secondEvidenceId,
    ]),
  );
});

test("B07A bounds pairwise work", () => {
  const candidates = Array.from({ length: 20 }, (_, index) =>
    candidate(
      `evidence-${String(index).padStart(2, "0")}`,

      `provider-${index}`,
    ),
  );

  const result = evaluateHsppReservoirReevaluation(candidates as any);

  assert.equal(
    result.comparisonCount,
    HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,
  );
});
