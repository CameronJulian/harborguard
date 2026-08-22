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
  type HsppCorroboratedOperationalAssessment,
} from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
  persistHsppCorroboratedOperationalAssessment,
} from "../lib/hspp/persistHsppCorroboratedOperationalAssessment";

const canonicalAssessedAt = "2026-08-22T10:00:00.000Z";

function authorityDecision(
  overrides: Partial<HsppCorroboratedOperationalAuthorityDecision> = {},
): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state: "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId: "org-q6",

    assemblyId: "assembly-q6",

    assemblyDecisionId: "assembly-decision-q6",

    evidenceId: "target-evidence-q6",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds: ["support-evidence-q6-a", "support-evidence-q6-b"],

    independentSupportCount: 2,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",

    ...overrides,
  };
}

type MockOptions = {
  dataOverride?: Record<string, unknown>;

  noData?: boolean;

  error?: Error;
};

function createPersistenceMock(options: MockOptions = {}) {
  const calls = {
    table: "",

    updates: [] as Array<Record<string, unknown>>,

    equals: [] as Array<[string, unknown]>,

    select: "",
  };

  const defaultData = {
    id: "target-evidence-q6",

    trust_state: "CORROBORATED",

    operational_eligible: true,

    assessment_policy_version: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    assessment_reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",

    assessed_at: canonicalAssessedAt,
  };

  const data = options.noData
    ? null
    : {
        ...defaultData,

        ...(options.dataOverride ?? {}),
      };

  const chain: any = {
    eq(column: string, value: unknown) {
      calls.equals.push([column, value]);

      return chain;
    },

    select(columns: string) {
      calls.select = columns;

      return chain;
    },

    async maybeSingle() {
      return {
        data,

        error: options.error ?? null,
      };
    },
  };

  const supabase = {
    from(table: string) {
      calls.table = table;

      return {
        update(payload: Record<string, unknown>) {
          calls.updates.push(payload);

          return chain;
        },
      };
    },
  };

  return {
    supabase,

    calls,
  };
}

test("B7490-07Q6 persists the exact successful Q4 operational assessment", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock();

  const result = await persistHsppCorroboratedOperationalAssessment({
    supabase: mock.supabase,

    authorityDecision: decision,

    assessment,

    assessedAt: canonicalAssessedAt,
  });

  assert.equal(
    result.persistenceVersion,
    HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
  );

  assert.equal(result.state, "CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTED");

  assert.equal(result.organizationId, "org-q6");

  assert.equal(result.assemblyId, "assembly-q6");

  assert.equal(result.assemblyDecisionId, "assembly-decision-q6");

  assert.equal(result.evidenceId, "target-evidence-q6");

  assert.equal(result.integrityFingerprint, "a".repeat(64));

  assert.deepEqual(result.supportingEvidenceIds, [
    "support-evidence-q6-a",
    "support-evidence-q6-b",
  ]);

  assert.equal(result.independentSupportCount, 2);

  assert.equal(result.trustState, "CORROBORATED");

  assert.equal(result.operationalEligible, true);

  assert.equal(result.crowdEligible, false);

  assert.equal(result.trainingEligible, false);

  assert.equal(result.validationEligible, false);

  assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED");

  assert.equal(result.assessedAt, canonicalAssessedAt);

  assert.equal(mock.calls.table, "hspp_evidence");

  assert.deepEqual(mock.calls.equals, [
    ["organization_id", "org-q6"],
    ["id", "target-evidence-q6"],
    ["integrity_fingerprint", "a".repeat(64)],
  ]);

  assert.equal(mock.calls.updates.length, 1);

  assert.deepEqual(mock.calls.updates[0], {
    trust_state: "CORROBORATED",

    operational_eligible: true,

    crowd_eligible: false,

    training_eligible: false,

    validation_eligible: false,

    assessment_policy_version: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    assessment_reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",

    assessed_at: canonicalAssessedAt,
  });
});

test("B7490-07Q6 rejects a modified Q4 assessment before persistence", async () => {
  const decision = authorityDecision();

  const canonical = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const modified = {
    ...canonical,

    operationalEligible: false,
  } as HsppCorroboratedOperationalAssessment;

  const mock = createPersistenceMock();

  await assert.rejects(
    persistHsppCorroboratedOperationalAssessment({
      supabase: mock.supabase,

      authorityDecision: decision,

      assessment: modified,

      assessedAt: canonicalAssessedAt,
    }),
    /does not match the canonical Q4 operational assessment/,
  );

  assert.equal(mock.calls.updates.length, 0);
});

test("B7490-07Q6 never persists a denied Q4 operational assessment", async () => {
  const decision = authorityDecision({
    state: "OPERATIONAL_AUTHORITY_DENIED",

    reason: "TRUST_NOT_CORROBORATED",
  });

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock();

  await assert.rejects(
    persistHsppCorroboratedOperationalAssessment({
      supabase: mock.supabase,

      authorityDecision: decision,

      assessment,

      assessedAt: canonicalAssessedAt,
    }),
    /persists only the exact successful Q4 operational assessment/,
  );

  assert.equal(mock.calls.updates.length, 0);
});

test("B7490-07Q6 requires caller-controlled assessedAt before database use", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock();

  await assert.rejects(
    persistHsppCorroboratedOperationalAssessment({
      supabase: mock.supabase,

      authorityDecision: decision,

      assessment,

      assessedAt: "   ",
    }),
    /assessedAt is required for deterministic retry identity/,
  );

  assert.equal(mock.calls.updates.length, 0);
});

test("B7490-07Q6 canonicalizes equivalent assessedAt representations", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock();

  const result = await persistHsppCorroboratedOperationalAssessment({
    supabase: mock.supabase,

    authorityDecision: decision,

    assessment,

    assessedAt: "2026-08-22T12:00:00+02:00",
  });

  assert.equal(result.assessedAt, canonicalAssessedAt);

  assert.equal(result.applied.assessedAt, canonicalAssessedAt);

  assert.equal(mock.calls.updates[0]?.assessed_at, canonicalAssessedAt);
});

test("B7490-07Q6 identical retries with the same assessedAt are deterministic", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock();

  const first = await persistHsppCorroboratedOperationalAssessment({
    supabase: mock.supabase,

    authorityDecision: decision,

    assessment,

    assessedAt: canonicalAssessedAt,
  });

  const second = await persistHsppCorroboratedOperationalAssessment({
    supabase: mock.supabase,

    authorityDecision: decision,

    assessment,

    assessedAt: canonicalAssessedAt,
  });

  assert.deepEqual(first, second);

  assert.equal(mock.calls.updates.length, 2);

  assert.deepEqual(mock.calls.updates[0], mock.calls.updates[1]);
});

test("B7490-07Q6 rejects a persisted result that differs from the controlled Q4 decision", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock({
    dataOverride: {
      operational_eligible: false,
    },
  });

  await assert.rejects(
    persistHsppCorroboratedOperationalAssessment({
      supabase: mock.supabase,

      authorityDecision: decision,

      assessment,

      assessedAt: canonicalAssessedAt,
    }),
    /persisted result does not match the controlled Q4 operational assessment/,
  );
});

test("B7490-07Q6 fails closed when the immutable evidence target is stale or missing", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const mock = createPersistenceMock({
    noData: true,
  });

  await assert.rejects(
    persistHsppCorroboratedOperationalAssessment({
      supabase: mock.supabase,

      authorityDecision: decision,

      assessment,

      assessedAt: canonicalAssessedAt,
    }),
    /target was not found or no longer matched its integrity identity/,
  );
});

test("B7490-07Q6 does not mutate the authority decision or Q4 assessment", async () => {
  const decision = authorityDecision();

  const assessment = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: decision,
  });

  const beforeDecision = structuredClone(decision);

  const beforeAssessment = structuredClone(assessment);

  const mock = createPersistenceMock();

  await persistHsppCorroboratedOperationalAssessment({
    supabase: mock.supabase,

    authorityDecision: decision,

    assessment,

    assessedAt: canonicalAssessedAt,
  });

  assert.deepEqual(decision, beforeDecision);

  assert.deepEqual(assessment, beforeAssessment);
});
