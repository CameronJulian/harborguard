import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
  type HsppCorroboratedMemberAssessment,
} from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION,
  persistHsppDeniedCorroboratedMemberAssessment,
} from "../lib/hspp/persistHsppDeniedCorroboratedMemberAssessment";

const fingerprint = "a".repeat(64);

const stableAssessedAt = "2026-08-22T10:00:00.000Z";

function deniedDecision(
  overrides: Partial<HsppMemberCorroborationDecision> = {},
): HsppMemberCorroborationDecision {
  return {
    policyVersion: HSPP_MEMBER_CORROBORATION_VERSION,

    state: "MEMBER_CORROBORATION_DENIED",

    reason: "NO_INDEPENDENT_SUPPORT",

    organizationId: "org-q8",

    assemblyId: "assembly-q8",

    assemblyDecisionId: "assembly-decision-q8",

    targetEvidenceId: "target-evidence-q8",

    targetIntegrityFingerprint: fingerprint,

    supportingEvidenceIds: [],

    independentSupportCount: 0,

    authority: "NONE",

    ...overrides,
  };
}

function assessmentFor(
  decision: HsppMemberCorroborationDecision,
): HsppCorroboratedMemberAssessment {
  return assessHsppCorroboratedMember({
    corroborationDecision: decision,
  });
}

function persistedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "target-evidence-q8",

    trust_state: "UNASSESSED",

    operational_eligible: false,

    assessment_policy_version: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    assessment_reason: "INDEPENDENT_CORROBORATION_DENIED",

    assessed_at: stableAssessedAt,

    ...overrides,
  };
}

function createSupabaseMock(returnedRow: Record<string, unknown> | null) {
  let fromCalls = 0;

  let tableName: string | null = null;

  let updatePayload: Record<string, unknown> | null = null;

  const filters: Array<[string, unknown]> = [];

  let selected: string | null = null;

  const query: any = {
    update(payload: Record<string, unknown>) {
      updatePayload = payload;

      return query;
    },

    eq(field: string, value: unknown) {
      filters.push([field, value]);

      return query;
    },

    select(columns: string) {
      selected = columns;

      return query;
    },

    async maybeSingle() {
      return {
        data: returnedRow,

        error: null,
      };
    },
  };

  const supabase = {
    from(table: string) {
      fromCalls += 1;

      tableName = table;

      return query;
    },
  };

  return {
    supabase,

    getFromCalls: () => fromCalls,

    getTableName: () => tableName,

    getUpdatePayload: () => updatePayload,

    getFilters: () => filters,

    getSelected: () => selected,
  };
}

test("canonical denied B11F4 and B11F5 persist the fail-closed assessment", async () => {
  const decision = deniedDecision();

  const assessment = assessmentFor(decision);

  const mock = createSupabaseMock(persistedRow());

  const result = await persistHsppDeniedCorroboratedMemberAssessment({
    supabase: mock.supabase,

    corroborationDecision: decision,

    assessment,

    assessedAt: stableAssessedAt,
  });

  assert.equal(
    result.persistenceVersion,
    HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION,
  );

  assert.equal(result.state, "DENIED_CORROBORATED_MEMBER_ASSESSMENT_PERSISTED");

  assert.equal(result.organizationId, "org-q8");

  assert.equal(result.assemblyId, "assembly-q8");

  assert.equal(result.assemblyDecisionId, "assembly-decision-q8");

  assert.equal(result.evidenceId, "target-evidence-q8");

  assert.equal(result.integrityFingerprint, fingerprint);

  assert.equal(result.corroborationReason, "NO_INDEPENDENT_SUPPORT");

  assert.deepEqual(result.supportingEvidenceIds, []);

  assert.equal(result.independentSupportCount, 0);

  assert.equal(result.trustState, "UNASSESSED");

  assert.equal(result.operationalEligible, false);

  assert.equal(result.crowdEligible, false);

  assert.equal(result.trainingEligible, false);

  assert.equal(result.validationEligible, false);

  assert.equal(result.assessmentReason, "INDEPENDENT_CORROBORATION_DENIED");

  assert.equal(result.assessedAt, stableAssessedAt);

  assert.equal(mock.getFromCalls(), 1);

  assert.equal(mock.getTableName(), "hspp_evidence");

  assert.deepEqual(mock.getUpdatePayload(), {
    trust_state: "UNASSESSED",

    operational_eligible: false,

    crowd_eligible: false,

    training_eligible: false,

    validation_eligible: false,

    assessment_policy_version: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    assessment_reason: "INDEPENDENT_CORROBORATION_DENIED",

    assessed_at: stableAssessedAt,
  });

  assert.deepEqual(mock.getFilters(), [
    ["organization_id", "org-q8"],

    ["id", "target-evidence-q8"],

    ["integrity_fingerprint", fingerprint],
  ]);

  assert.equal(
    mock.getSelected(),
    "id, trust_state, operational_eligible, assessment_policy_version, assessment_reason, assessed_at",
  );
});

test("modified B11F5 denial is rejected before persistence", async () => {
  const decision = deniedDecision();

  const canonical = assessmentFor(decision);

  const modified: HsppCorroboratedMemberAssessment = {
    ...canonical,

    reason: "INDEPENDENT_CORROBORATION_ACCEPTED",
  };

  const mock = createSupabaseMock(persistedRow());

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment: modified,

        assessedAt: stableAssessedAt,
      }),
    /canonical B11F5 denial/i,
  );

  assert.equal(mock.getFromCalls(), 0);
});

test("eligible B11F4 decision is never persisted by the denied boundary", async () => {
  const decision = deniedDecision({
    state: "MEMBER_CORROBORATION_ELIGIBLE",

    reason: "INDEPENDENT_SUPPORT_PRESENT",

    supportingEvidenceIds: ["support-evidence-q8"],

    independentSupportCount: 1,
  });

  const assessment = assessmentFor(decision);

  const mock = createSupabaseMock(persistedRow());

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment,

        assessedAt: stableAssessedAt,
      }),
    /only denied B11F4/i,
  );

  assert.equal(mock.getFromCalls(), 0);
});

test("noncanonical supporter provenance cannot masquerade as B11F4 denial", async () => {
  const decision = deniedDecision({
    supportingEvidenceIds: ["support-evidence-q8"],

    independentSupportCount: 1,
  });

  const assessment = assessmentFor(decision);

  const mock = createSupabaseMock(persistedRow());

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment,

        assessedAt: stableAssessedAt,
      }),
    /support cardinality/i,
  );

  assert.equal(mock.getFromCalls(), 0);
});

test("unsafe immutable target identity is rejected before persistence", async () => {
  const decisions = [
    deniedDecision({
      organizationId: " ",
    }),

    deniedDecision({
      assemblyId: " ",
    }),

    deniedDecision({
      assemblyDecisionId: " ",
    }),

    deniedDecision({
      targetEvidenceId: " ",
    }),

    deniedDecision({
      targetIntegrityFingerprint: "INVALID",
    }),
  ];

  for (const decision of decisions) {
    const mock = createSupabaseMock(persistedRow());

    await assert.rejects(() =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment: assessmentFor(decision),

        assessedAt: stableAssessedAt,
      }),
    );

    assert.equal(mock.getFromCalls(), 0);
  }
});

test("caller-controlled assessedAt is required before database use", async () => {
  const decision = deniedDecision();

  const mock = createSupabaseMock(persistedRow());

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment: assessmentFor(decision),

        assessedAt: "",
      }),
    /assessedAt is required/i,
  );

  assert.equal(mock.getFromCalls(), 0);
});

test("equivalent assessedAt representations canonicalize to one retry identity", async () => {
  const decision = deniedDecision();

  const mock = createSupabaseMock(persistedRow());

  const result = await persistHsppDeniedCorroboratedMemberAssessment({
    supabase: mock.supabase,

    corroborationDecision: decision,

    assessment: assessmentFor(decision),

    assessedAt: "  2026-08-22T12:00:00+02:00  ",
  });

  assert.equal(result.assessedAt, stableAssessedAt);

  assert.equal(mock.getUpdatePayload()?.assessed_at, stableAssessedAt);
});

test("identical denied retries with the same assessedAt are deterministic", async () => {
  const decision = deniedDecision();

  const assessment = assessmentFor(decision);

  const firstMock = createSupabaseMock(persistedRow());

  const secondMock = createSupabaseMock(persistedRow());

  const first = await persistHsppDeniedCorroboratedMemberAssessment({
    supabase: firstMock.supabase,

    corroborationDecision: decision,

    assessment,

    assessedAt: stableAssessedAt,
  });

  const second = await persistHsppDeniedCorroboratedMemberAssessment({
    supabase: secondMock.supabase,

    corroborationDecision: decision,

    assessment,

    assessedAt: stableAssessedAt,
  });

  assert.deepEqual(first, second);

  assert.deepEqual(firstMock.getUpdatePayload(), secondMock.getUpdatePayload());

  assert.deepEqual(firstMock.getFilters(), secondMock.getFilters());
});

test("persisted result mismatch is rejected", async () => {
  const decision = deniedDecision();

  const mock = createSupabaseMock(
    persistedRow({
      trust_state: "CORROBORATED",
    }),
  );

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment: assessmentFor(decision),

        assessedAt: stableAssessedAt,
      }),
    /persisted result does not match/i,
  );
});

test("missing or stale immutable evidence target fails closed through generic apply", async () => {
  const decision = deniedDecision();

  const mock = createSupabaseMock(null);

  await assert.rejects(
    () =>
      persistHsppDeniedCorroboratedMemberAssessment({
        supabase: mock.supabase,

        corroborationDecision: decision,

        assessment: assessmentFor(decision),

        assessedAt: stableAssessedAt,
      }),
    /not found|integrity identity/i,
  );
});

test("B7490-07Q8 does not mutate B11F4 or B11F5 inputs", async () => {
  const decision = deniedDecision({
    reason: "TARGET_CONFLICT_PRESENT",
  });

  const assessment = assessmentFor(decision);

  const decisionBefore = structuredClone(decision);

  const assessmentBefore = structuredClone(assessment);

  const mock = createSupabaseMock(persistedRow());

  await persistHsppDeniedCorroboratedMemberAssessment({
    supabase: mock.supabase,

    corroborationDecision: decision,

    assessment,

    assessedAt: stableAssessedAt,
  });

  assert.deepEqual(decision, decisionBefore);

  assert.deepEqual(assessment, assessmentBefore);
});
