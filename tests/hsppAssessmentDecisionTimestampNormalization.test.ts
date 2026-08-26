import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHsppAssessmentDecision,
} from "../lib/hspp/applyHsppAssessmentDecision";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const EVIDENCE_ID =
  "22222222-2222-4222-8222-222222222222";

const FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";


test(
  "applyHsppAssessmentDecision canonicalizes returned assessed_at",
  async () => {
    const updatePayloads:
      Record<string, unknown>[] =
        [];

    const builder: any = {};

    builder.update =
      (
        value:
          Record<string, unknown>,
      ) => {
        updatePayloads.push(
          value,
        );

        return builder;
      };

    builder.eq =
      () =>
        builder;

    builder.select =
      () =>
        builder;

    builder.maybeSingle =
      async () => ({
        data: {
          id:
            EVIDENCE_ID,

          trust_state:
            "CORROBORATED",

          operational_eligible:
            false,

          assessment_policy_version:
            "hspp-member-corroborated-assessment-v1",

          assessment_reason:
            "INDEPENDENT_CORROBORATION_ACCEPTED",

          /*
           * Same instant as the caller-owned retry identity,
           * deliberately returned in a non-toISOString form.
           */
          assessed_at:
            "2026-08-26T07:35:00+00:00",
        },

        error:
          null,
      });


    const supabase = {
      from(
        table:
          string,
      ) {
        assert.equal(
          table,
          "hspp_evidence",
        );

        return builder;
      },
    };


    const result =
      await applyHsppAssessmentDecision({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          FINGERPRINT,

        assessment: {
          trustState:
            "CORROBORATED",

          operationalEligible:
            false,

          crowdEligible:
            false,

          trainingEligible:
            false,

          validationEligible:
            false,

          policyVersion:
            "hspp-member-corroborated-assessment-v1",

          reason:
            "INDEPENDENT_CORROBORATION_ACCEPTED",
        } as any,

        /*
         * Same instant, different caller representation.
         */
        assessedAt:
          "2026-08-26T09:35:00+02:00",
      });


    assert.equal(
      updatePayloads.length,
      1,
    );

    const updatePayload =
      updatePayloads[0];

    assert.ok(
      updatePayload,
    );

    assert.equal(
      updatePayload.assessed_at,
      "2026-08-26T07:35:00.000Z",
      "database write must use canonical retry identity",
    );

    assert.equal(
      result.assessedAt,
      "2026-08-26T07:35:00.000Z",
      "database response must be returned canonically",
    );

    assert.equal(
      result.evidenceId,
      EVIDENCE_ID,
    );

    assert.equal(
      result.trustState,
      "CORROBORATED",
    );

    assert.equal(
      result.operationalEligible,
      false,
    );

    assert.equal(
      result.policyVersion,
      "hspp-member-corroborated-assessment-v1",
    );

    assert.equal(
      result.reason,
      "INDEPENDENT_CORROBORATION_ACCEPTED",
    );
  },
);
