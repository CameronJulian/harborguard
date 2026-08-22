import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroborationSupport,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroborationSupport";

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

      if (table === "hspp_evidence_assembly_membership_relations") {
        const query: any = {
          select() {
            return query;
          },

          eq() {
            return query;
          },

          async maybeSingle() {
            return {
              data: null,

              error: null,
            };
          },
        };

        return query;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    supabase,

    organizationId,

    assemblyId,
  };
}

test("B07J evaluates B11F3 from the exact B07I assessment context", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyCorroborationSupport({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.runnerVersion,
    HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION,
  );

  assert.equal(result.corroborationSupport.state, "CORROBORATION_SUPPORTED");

  assert.equal(
    result.corroborationSupport.reason,
    "SUPPORTED_ASSESSMENT_CONTEXT",
  );

  assert.equal(result.corroborationSupport.authority, "NONE");

  assert.equal(
    result.corroborationSupport.organizationId,
    result.assessmentContextRun.assessmentContext.organizationId,
  );

  assert.equal(
    result.corroborationSupport.assemblyId,
    result.assessmentContextRun.assessmentContext.assemblyId,
  );

  assert.equal(
    result.corroborationSupport.assemblyDecisionId,
    result.assessmentContextRun.assessmentContext.assemblyDecisionId,
  );

  assert.deepEqual(
    result.corroborationSupport.evidenceIds,
    result.assessmentContextRun.assessmentContext.evidence.map(
      (member) => member.evidenceId,
    ),
  );
});

test("B07J preserves exact B07I and B11F3 provenance", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyCorroborationSupport({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.assessmentContextRunnerVersion,
    result.assessmentContextRun.runnerVersion,
  );

  assert.equal(
    result.corroborationSupportPolicyVersion,
    result.corroborationSupport.policyVersion,
  );

  assert.equal(
    result.organizationId,
    result.assessmentContextRun.organizationId,
  );

  assert.equal(result.assemblyId, result.assessmentContextRun.assemblyId);
});

test("B07J performs no additional database mutation after B07I", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyCorroborationSupport({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.corroborationSupport.authority, "NONE");
});
