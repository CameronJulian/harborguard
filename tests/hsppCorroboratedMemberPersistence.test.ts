import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
} from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
  persistHsppCorroboratedMemberAssessment,
} from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

const fingerprint =
  "a".repeat(64);

function eligible():
  HsppMemberCorroborationDecision {
  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_ELIGIBLE",

    reason:
      "INDEPENDENT_SUPPORT_PRESENT",

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    assemblyDecisionId:
      "assembly-decision-1",

    targetEvidenceId:
      "evidence-a",

    targetIntegrityFingerprint:
      fingerprint,

    supportingEvidenceIds: [
      "evidence-b",
    ],

    independentSupportCount:
      1,

    authority:
      "NONE",
  };
}

function createSupabaseMock(
  returnedRow:
    Record<string, unknown> | null
) {
  let updatePayload:
    Record<string, unknown> | null =
      null;

  const filters:
    Array<[string, unknown]> =
      [];

  let selected:
    string | null =
      null;

  const query: any = {
    update(
      payload:
        Record<string, unknown>
    ) {
      updatePayload =
        payload;

      return query;
    },

    eq(
      column: string,
      value: unknown
    ) {
      filters.push([
        column,
        value,
      ]);

      return query;
    },

    select(
      value: string
    ) {
      selected =
        value;

      return query;
    },

    async maybeSingle() {
      return {
        data:
          returnedRow,

        error:
          null,
      };
    },
  };

  const supabase = {
    from(
      table: string
    ) {
      assert.equal(
        table,
        "hspp_evidence"
      );

      return query;
    },
  };

  return {
    supabase,

    getUpdate() {
      return updatePayload;
    },

    getFilters() {
      return filters;
    },

    getSelected() {
      return selected;
    },
  };
}

function persistedRow() {
  return {
    id:
      "evidence-a",

    trust_state:
      "CORROBORATED",

    operational_eligible:
      false,

    assessment_policy_version:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    assessment_reason:
      "INDEPENDENT_CORROBORATION_ACCEPTED",

    assessed_at:
      "2026-08-21T10:45:00.000Z",
  };
}

test(
  "eligible B11F4 and canonical B11F5 assessment persist CORROBORATED trust",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    const result =
      await persistHsppCorroboratedMemberAssessment({
        supabase:
          mock.supabase,

        corroborationDecision:
          corroboration,

        assessment,

        assessedAt:
          "2026-08-21T10:45:00.000Z",
      });

    assert.equal(
      result.persistenceVersion,
      HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION
    );

    assert.equal(
      result.state,
      "CORROBORATED_ASSESSMENT_PERSISTED"
    );

    assert.equal(
      result.trustState,
      "CORROBORATED"
    );

    assert.equal(
      result.operationalEligible,
      false
    );
  }
);

test(
  "B11F6 delegates exact tenant evidence and fingerprint scope",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    await persistHsppCorroboratedMemberAssessment({
      supabase:
        mock.supabase,

      corroborationDecision:
        corroboration,

      assessment,
    });

    assert.deepEqual(
      mock.getFilters(),
      [
        [
          "organization_id",
          "org-1",
        ],
        [
          "id",
          "evidence-a",
        ],
        [
          "integrity_fingerprint",
          fingerprint,
        ],
      ]
    );
  }
);

test(
  "B11F6 persists controlled trust and keeps every downstream eligibility false",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    await persistHsppCorroboratedMemberAssessment({
      supabase:
        mock.supabase,

      corroborationDecision:
        corroboration,

      assessment,
    });

    const update =
      mock.getUpdate();

    assert.ok(update);

    assert.equal(
      update.trust_state,
      "CORROBORATED"
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

    assert.equal(
      update.validation_eligible,
      false
    );
  }
);

test(
  "B11F6 persists exact B11F5 policy provenance",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    await persistHsppCorroboratedMemberAssessment({
      supabase:
        mock.supabase,

      corroborationDecision:
        corroboration,

      assessment,
    });

    const update =
      mock.getUpdate();

    assert.ok(update);

    assert.equal(
      update.assessment_policy_version,
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION
    );

    assert.equal(
      update.assessment_reason,
      "INDEPENDENT_CORROBORATION_ACCEPTED"
    );
  }
);

test(
  "B11F6 preserves assembly corroboration provenance in its result",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    const result =
      await persistHsppCorroboratedMemberAssessment({
        supabase:
          mock.supabase,

        corroborationDecision:
          corroboration,

        assessment,
      });

    assert.equal(
      result.organizationId,
      "org-1"
    );

    assert.equal(
      result.assemblyId,
      "assembly-1"
    );

    assert.equal(
      result.assemblyDecisionId,
      "assembly-decision-1"
    );

    assert.equal(
      result.evidenceId,
      "evidence-a"
    );

    assert.equal(
      result.integrityFingerprint,
      fingerprint
    );

    assert.deepEqual(
      result.supportingEvidenceIds,
      [
        "evidence-b",
      ]
    );
  }
);

test(
  "denied B11F4 member is rejected before database use",
  async () => {
    const corroboration = {
      ...eligible(),

      state:
        "MEMBER_CORROBORATION_DENIED" as const,

      reason:
        "NO_INDEPENDENT_SUPPORT" as const,

      supportingEvidenceIds:
        [],

      independentSupportCount:
        0,
    };

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    let databaseUsed =
      false;

    const supabase = {
      from() {
        databaseUsed =
          true;

        throw new Error(
          "database should not be used"
        );
      },
    };

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase,

          corroborationDecision:
            corroboration,

          assessment,
        }),
      /requires an eligible independently supported B11F4 member/
    );

    assert.equal(
      databaseUsed,
      false
    );
  }
);

test(
  "modified B11F5 assessment is rejected before persistence",
  async () => {
    const corroboration =
      eligible();

    const canonical =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const modified = {
      ...canonical,

      operationalEligible:
        true as false,
    };

    let databaseUsed =
      false;

    const supabase = {
      from() {
        databaseUsed =
          true;

        throw new Error(
          "database should not be used"
        );
      },
    };

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase,

          corroborationDecision:
            corroboration,

          assessment:
            modified,
        }),
      /does not match the canonical B11F5 decision/
    );

    assert.equal(
      databaseUsed,
      false
    );
  }
);

test(
  "UNASSESSED B11F5 decision is never persisted by B11F6",
  async () => {
    const corroboration =
      eligible();

    const invalidCorroboration = {
      ...corroboration,

      independentSupportCount:
        0,

      supportingEvidenceIds:
        [],
    };

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          invalidCorroboration,
      });

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase:
            {},

          corroborationDecision:
            invalidCorroboration,

          assessment,
        }),
      /coherent independent corroboration provenance/
    );
  }
);

test(
  "self-supporting provenance is rejected before database use",
  async () => {
    const corroboration = {
      ...eligible(),

      supportingEvidenceIds: [
        "evidence-a",
      ],
    };

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase:
            {},

          corroborationDecision:
            corroboration,

          assessment,
        }),
      /self-referential corroboration provenance/
    );
  }
);

test(
  "duplicate supporter provenance is rejected",
  async () => {
    const corroboration = {
      ...eligible(),

      supportingEvidenceIds: [
        "evidence-b",
        "evidence-b",
      ],

      independentSupportCount:
        2,
    };

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase:
            {},

          corroborationDecision:
            corroboration,

          assessment,
        }),
      /duplicate corroborating evidence identities/
    );
  }
);

test(
  "missing or stale persisted target fails closed through existing boundary",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const mock =
      createSupabaseMock(
        null
      );

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase:
            mock.supabase,

          corroborationDecision:
            corroboration,

          assessment,
        }),
      /not found or no longer matched its integrity identity/
    );
  }
);

test(
  "B11F6 does not mutate B11F4 or B11F5 inputs",
  async () => {
    const corroboration =
      eligible();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          corroboration,
      });

    const corroborationBefore =
      structuredClone(
        corroboration
      );

    const assessmentBefore =
      structuredClone(
        assessment
      );

    const mock =
      createSupabaseMock(
        persistedRow()
      );

    await persistHsppCorroboratedMemberAssessment({
      supabase:
        mock.supabase,

      corroborationDecision:
        corroboration,

      assessment,
    });

    assert.deepEqual(
      corroboration,
      corroborationBefore
    );

    assert.deepEqual(
      assessment,
      assessmentBefore
    );
  }
);