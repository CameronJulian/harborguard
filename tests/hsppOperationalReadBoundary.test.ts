import assert from "node:assert/strict";
import test from "node:test";

import {
  readHsppEvidenceForOperationalUse,
} from "../lib/hspp/readHsppEvidenceForOperationalUse";

function createSupabaseMock(
  row: Record<string, unknown> | null
) {
  const query = {
    select() {
      return query;
    },

    eq() {
      return query;
    },

    async maybeSingle() {
      return {
        data: row,
        error: null,
      };
    },
  };

  return {
    from() {
      return query;
    },
  };
}

function validRow() {
  return {
    id:
      "00000000-0000-0000-0000-000000000001",

    organization_id:
      "00000000-0000-0000-0000-000000000002",

    protocol_version:
      "0.1",

    canonicalization_version:
      "hspp-canonical-json-v1",

    source_class:
      "telematics",

    source_provider:
      "traccar",

    source_stream:
      "positions",

    source_message_id:
      "position-1",

    observed_at:
      "2026-08-20T10:00:00.000Z",

    received_at:
      "2026-08-20T10:00:01.000Z",

    payload_schema_version:
      "normalized-telematics-position-v1",

    normalized_payload: {
      latitude: -33.9,
      longitude: 18.4,
      speedKmh: 45,
      heading: 120,
    },

    integrity_algorithm:
      "sha256",

    integrity_fingerprint:
      "",

    integrity_state:
      "INTEGRITY_SEALED",

    validation_state:
      "VALIDATED",

    trust_state:
      "PLAUSIBLE",

    operational_eligible:
      true,

    assessment_policy_version:
      "hspp-traccar-assessment-v1",

    assessment_reason:
      "plausibility_passed",

    assessed_at:
      "2026-08-20T10:00:02.000Z",

    parent_evidence_id:
      null,

    parent_integrity_fingerprint:
      null,

    derivation_type:
      null,

    derivation_version:
      null,
  };
}

test("missing evidence is denied operational use", async () => {
  const result =
    await readHsppEvidenceForOperationalUse({
      supabase:
        createSupabaseMock(null),
      organizationId:
        "00000000-0000-0000-0000-000000000002",
      evidenceId:
        "00000000-0000-0000-0000-000000000001",
    });

  assert.equal(
    result.decision.allowed,
    false
  );

  assert.equal(
    result.decision.reason,
    "evidence_not_found"
  );

  assert.equal(
    result.evidence,
    null
  );
});
