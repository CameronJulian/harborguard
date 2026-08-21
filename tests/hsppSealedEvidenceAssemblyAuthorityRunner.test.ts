import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

import {
  HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyAuthority,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyAuthority";

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

  let decisionInsertCount = 0;

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
        decisionInsertCount += 1;

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

                    decided_at: "2026-08-21T20:00:00.000Z",

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

    decisionInsertCount: () => decisionInsertCount,
  };
}

test("B07H turns a CONSISTENT persisted assembly decision into assessment candidacy only", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyAuthority({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.runnerVersion,
    HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION,
  );

  assert.equal(mock.decisionInsertCount(), 1);

  assert.equal(result.organizationId, mock.organizationId);

  assert.equal(result.assemblyId, mock.assemblyId);

  assert.equal(
    result.decisionPersistence.persistedDecision.id,
    "decision-row-1",
  );

  assert.equal(result.authorityDecision.state, "ASSESSMENT_CANDIDATE");

  assert.equal(
    result.authorityDecision.reason,
    "CONSISTENT_ASSEMBLY_CANDIDATE",
  );

  assert.equal(result.authorityDecision.authority, "NONE");

  assert.equal(
    result.authorityDecision.assemblyDecisionId,
    result.decisionPersistence.persistedDecision.id,
  );

  assert.equal(
    result.authorityPolicyVersion,
    result.authorityDecision.policyVersion,
  );
});

test("B07H preserves B07G persistence provenance unchanged", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyAuthority({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.decisionPersistenceRunnerVersion,
    result.decisionPersistence.runnerVersion,
  );

  assert.equal(
    result.authorityDecision.organizationId,
    result.decisionPersistence.persistedDecision.organizationId,
  );

  assert.equal(
    result.authorityDecision.assemblyId,
    result.decisionPersistence.persistedDecision.assemblyId,
  );

  assert.equal(
    result.authorityDecision.sourcePersistenceVersion,
    result.decisionPersistence.persistedDecision.persistenceVersion,
  );

  assert.equal(
    result.authorityDecision.sourceDecisionPolicyVersion,
    result.decisionPersistence.persistedDecision.decisionPolicyVersion,
  );

  assert.equal(
    result.authorityDecision.sourceDecisionState,
    result.decisionPersistence.persistedDecision.decisionState,
  );

  assert.equal(
    result.authorityDecision.sourceDecisionReason,
    result.decisionPersistence.persistedDecision.decisionReason,
  );
});

test("B07H never grants authority while evaluating candidacy", async () => {
  const mock = createSupabaseMock(["road_closure", "road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyAuthority({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.decisionPersistence.persistedDecision.authority, "NONE");

  assert.equal(result.authorityDecision.authority, "NONE");
});
