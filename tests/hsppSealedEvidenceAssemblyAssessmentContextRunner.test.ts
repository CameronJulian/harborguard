import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

import {
  HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyAssessmentContext,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyAssessmentContext";

function evidenceRow(id: string, eventType: string) {
  const evidence = buildHsppEvidence({
    sourceClass: "telematics",
    sourceProvider: "test-provider",
    sourceStream: "test-stream",
    sourceMessageId: `message-${id}`,
    observedAt: "2026-08-21T10:00:00.000Z",
    receivedAt: "2026-08-21T10:00:01.000Z",
    payloadSchemaVersion: "1",

    normalizedPayload: {
      eventType,
    },
  });

  return {
    id,

    organization_id: "22222222-2222-4222-8222-222222222222",

    protocol_version: evidence.protocolVersion,

    canonicalization_version: evidence.canonicalizationVersion,

    source_class: evidence.sourceClass,

    source_provider: evidence.sourceProvider,

    source_stream: evidence.sourceStream,

    source_message_id: evidence.sourceMessageId,

    observed_at: evidence.observedAt,

    received_at: evidence.receivedAt,

    payload_schema_version: evidence.payloadSchemaVersion,

    normalized_payload: evidence.normalizedPayload,

    integrity_algorithm: evidence.integrityAlgorithm,

    integrity_fingerprint: evidence.integrityFingerprint,

    integrity_state: evidence.integrityState,

    validation_state: "VALIDATED",

    trust_state: "VERIFIED",

    operational_eligible: true,

    assessment_policy_version: "hspp-assessment-v1",

    assessment_reason: "verified_test_evidence",

    assessed_at: "2026-08-21T10:00:02.000Z",

    parent_evidence_id: null,

    parent_integrity_fingerprint: null,

    derivation_type: null,

    derivation_version: null,
  };
}

function createSupabaseMock(eventTypes: [string, string]) {
  const organizationId = "22222222-2222-4222-8222-222222222222";

  const assemblyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const rows = [
    evidenceRow("11111111-1111-4111-8111-111111111111", eventTypes[0]),

    evidenceRow("22222222-2222-4222-8222-222222222222", eventTypes[1]),
  ];

  const members = rows.map((row, index) => ({
    evidence_id: row.id,

    evidence_integrity_fingerprint: row.integrity_fingerprint,

    member_ordinal: index + 1,
  }));

  let memberReadCount = 0;

  function assemblyQuery() {
    const query: any = {
      select() {
        return query;
      },

      eq() {
        return query;
      },

      async maybeSingle() {
        return {
          data: {
            id: assemblyId,

            organization_id: organizationId,

            assembly_state: "SEALED",
          },

          error: null,
        };
      },
    };

    return query;
  }

  function memberQuery() {
    memberReadCount += 1;

    const query: any = {
      select() {
        return query;
      },

      eq() {
        return query;
      },

      order() {
        return Promise.resolve({
          data: members,

          error: null,
        });
      },
    };

    return query;
  }

  function evidenceQuery() {
    const query: any = {
      select() {
        return query;
      },

      eq() {
        return query;
      },

      in() {
        return Promise.resolve({
          data: rows,

          error: null,
        });
      },
    };

    return query;
  }

  function decisionQuery() {
    return {
      insert(values: Record<string, unknown>) {
        return {
          select() {
            return {
              async single() {
                return {
                  data: {
                    id: "decision-row-1",

                    organization_id: String(values.organization_id),

                    assembly_id: String(values.assembly_id),

                    assembly_scan_version: String(values.assembly_scan_version),

                    assembly_decision_policy_version: String(
                      values.assembly_decision_policy_version,
                    ),

                    assembly_decision_state: values.assembly_decision_state,

                    assembly_decision_reason: values.assembly_decision_reason,

                    decided_at: "2026-08-21T20:30:00.000Z",

                    authority: "NONE",
                  },

                  error: null,
                };
              },
            };
          },
        };
      },
    };
  }

  const supabase = {
    from(table: string) {
      if (table === "hspp_evidence_assemblies") {
        return assemblyQuery();
      }

      if (table === "hspp_evidence_assembly_members") {
        return memberQuery();
      }

      if (table === "hspp_evidence") {
        return evidenceQuery();
      }

      if (table === "hspp_assembly_decisions") {
        return decisionQuery();
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    supabase,

    organizationId,

    assemblyId,

    rows,

    getMemberReadCount: () => memberReadCount,
  };
}

test("B07I builds B11F2 context from retained canonical B07D members", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyAssessmentContext({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.runnerVersion,
    HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION,
  );

  assert.equal(result.organizationId, mock.organizationId);

  assert.equal(result.assemblyId, mock.assemblyId);

  assert.equal(
    result.authority.authorityDecision.state,
    "ASSESSMENT_CANDIDATE",
  );

  assert.equal(result.assessmentContext.authority, "NONE");

  assert.equal(result.assessmentContext.evidenceCount, 2);

  assert.deepEqual(
    result.assessmentContext.evidence,
    mock.rows.map((row, index) => ({
      evidenceId: row.id,

      integrityFingerprint: row.integrity_fingerprint,

      memberOrdinal: index + 1,
    })),
  );

  /*
   * Exactly one member-table read must have occurred:
   * the original B07D read inside the retained chain.
   *
   * B07I itself performs no second membership read.
   */
  assert.equal(mock.getMemberReadCount(), 1);
});

test("B07I preserves authority and assessment-context provenance", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyAssessmentContext({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.authorityRunnerVersion, result.authority.runnerVersion);

  assert.equal(
    result.assessmentContextVersion,
    result.assessmentContext.contextVersion,
  );

  assert.equal(
    result.assessmentContext.organizationId,
    result.authority.authorityDecision.organizationId,
  );

  assert.equal(
    result.assessmentContext.assemblyId,
    result.authority.authorityDecision.assemblyId,
  );

  assert.equal(
    result.assessmentContext.assemblyDecisionId,
    result.authority.authorityDecision.assemblyDecisionId,
  );
});

test("B07I fails closed for a denied authority decision", async () => {
  const mock = createSupabaseMock(["road_closure", "vehicle_collision"]);

  await assert.rejects(
    () =>
      runHsppSealedEvidenceAssemblyAssessmentContext({
        supabase: mock.supabase as any,

        organizationId: mock.organizationId,

        assemblyId: mock.assemblyId,
      }),
    /not an assessment candidate/i,
  );

  assert.equal(mock.getMemberReadCount(), 1);
});
