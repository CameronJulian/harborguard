import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHsppAssessmentDecision,
} from "../lib/hspp/applyHsppAssessmentDecision";

import {
  assessHsppTraccarEvidence,
} from "../lib/hspp/assessHsppTraccarEvidence";

const organizationId =
  "00000000-0000-0000-0000-000000000001";

const evidenceId =
  "00000000-0000-0000-0000-000000000002";

const fingerprint =
  "a".repeat(64);

const MATCH = {
  status: "MATCH",
  expectedFingerprint:
    fingerprint,
  actualFingerprint:
    fingerprint,
} as const;

function plausibleAssessment() {
  return assessHsppTraccarEvidence({
    verification:
      MATCH,
    validationState:
      "VALIDATED",
    sourceClass:
      "telematics",
    sourceProvider:
      "traccar",
    payloadSchemaVersion:
      "normalized-telematics-position-v1",
    processingOutcome:
      "accepted",
  });
}

function createSupabaseMock(
  result:
    Record<string, unknown> | null
) {
  const calls:
    Array<[string, unknown]> = [];

  let updateValue:
    Record<string, unknown> | null =
      null;

  const query = {
    update(
      value: Record<string, unknown>
    ) {
      updateValue = value;
      calls.push(["update", value]);
      return query;
    },

    eq(
      column: string,
      value: unknown
    ) {
      calls.push([
        `eq:${column}`,
        value,
      ]);

      return query;
    },

    select(value: string) {
      calls.push(["select", value]);
      return query;
    },

    async maybeSingle() {
      return {
        data: result,
        error: null,
      };
    },
  };

  const supabase = {
    from(table: string) {
      calls.push(["from", table]);
      return query;
    },
  };

  return {
    supabase,
    calls,
    getUpdate() {
      return updateValue;
    },
  };
}

test("plausible assessment persists trust and provenance", async () => {
  const assessment =
    plausibleAssessment();

  const assessedAt =
    "2026-08-20T10:30:00.000Z";

  const mock =
    createSupabaseMock({
      id:
        evidenceId,
      trust_state:
        "PLAUSIBLE",
      operational_eligible:
        true,
      assessment_policy_version:
        assessment.policyVersion,
      assessment_reason:
        assessment.reason,
      assessed_at:
        assessedAt,
    });

  const result =
    await applyHsppAssessmentDecision({
      supabase:
        mock.supabase,
      organizationId,
      evidenceId,
      integrityFingerprint:
        fingerprint,
      assessment,
      assessedAt,
    });

  assert.equal(
    result.trustState,
    "PLAUSIBLE"
  );

  assert.equal(
    result.policyVersion,
    assessment.policyVersion
  );

  assert.equal(
    result.reason,
    "plausibility_passed"
  );

  const update =
    mock.getUpdate();

  assert.ok(update);

  assert.equal(
    update.trust_state,
    "PLAUSIBLE"
  );

  assert.equal(
    update.crowd_eligible,
    false
  );

  assert.equal(
    update.training_eligible,
    false
  );
});

test("assessment write scopes by organization id evidence id and fingerprint", async () => {
  const assessment =
    plausibleAssessment();

  const mock =
    createSupabaseMock({
      id:
        evidenceId,
      trust_state:
        "PLAUSIBLE",
      operational_eligible:
        true,
      assessment_policy_version:
        assessment.policyVersion,
      assessment_reason:
        assessment.reason,
      assessed_at:
        "2026-08-20T10:30:00.000Z",
    });

  await applyHsppAssessmentDecision({
    supabase:
      mock.supabase,
    organizationId,
    evidenceId,
    integrityFingerprint:
      fingerprint,
    assessment,
    assessedAt:
      "2026-08-20T10:30:00.000Z",
  });

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "eq:organization_id" &&
        value === organizationId
    )
  );

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "eq:id" &&
        value === evidenceId
    )
  );

  assert.ok(
    mock.calls.some(
      ([name, value]) =>
        name === "eq:integrity_fingerprint" &&
        value === fingerprint
    )
  );
});

test("gps spike assessment persists fail-closed state", async () => {
  const assessment =
    assessHsppTraccarEvidence({
      verification:
        MATCH,
      validationState:
        "VALIDATED",
      sourceClass:
        "telematics",
      sourceProvider:
        "traccar",
      payloadSchemaVersion:
        "normalized-telematics-position-v1",
      processingOutcome:
        "gps_spike",
    });

  const mock =
    createSupabaseMock({
      id:
        evidenceId,
      trust_state:
        "UNASSESSED",
      operational_eligible:
        false,
      assessment_policy_version:
        assessment.policyVersion,
      assessment_reason:
        assessment.reason,
      assessed_at:
        "2026-08-20T10:30:00.000Z",
    });

  await applyHsppAssessmentDecision({
    supabase:
      mock.supabase,
    organizationId,
    evidenceId,
    integrityFingerprint:
      fingerprint,
    assessment,
    assessedAt:
      "2026-08-20T10:30:00.000Z",
  });

  const update =
    mock.getUpdate();

  assert.ok(update);

  assert.equal(
    update.trust_state,
    "UNASSESSED"
  );

  assert.equal(
    update.operational_eligible,
    false
  );

  assert.equal(
    update.crowd_eligible,
    false
  );

  assert.equal(
    update.training_eligible,
    false
  );
});

test("missing or stale evidence target fails closed", async () => {
  const mock =
    createSupabaseMock(null);

  await assert.rejects(
    () =>
      applyHsppAssessmentDecision({
        supabase:
          mock.supabase,
        organizationId,
        evidenceId,
        integrityFingerprint:
          fingerprint,
        assessment:
          plausibleAssessment(),
        assessedAt:
          "2026-08-20T10:30:00.000Z",
      }),
    /not found or no longer matched/
  );
});
