import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

import {
  HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyDecisionPersistence,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyDecisionPersistence";

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

function createSupabaseMock(options?: {
  persistenceError?: {
    code?: string;
    message?: string;
  };
}) {
  const organizationId = "22222222-2222-4222-8222-222222222222";

  const assemblyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const rows = [
    evidenceRow("11111111-1111-4111-8111-111111111111", "road_closure"),

    evidenceRow("22222222-2222-4222-8222-222222222222", "road_closure"),
  ];

  const members = rows.map((row, index) => ({
    evidence_id: row.id,

    evidence_integrity_fingerprint: row.integrity_fingerprint,

    member_ordinal: index + 1,
  }));

  let decisionInsertCount = 0;

  let insertedDecision: Record<string, unknown> | null = null;

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

  function decisionPersistenceQuery() {
    return {
      insert(values: Record<string, unknown>) {
        decisionInsertCount += 1;

        insertedDecision = values;

        return {
          select() {
            return {
              async single() {
                if (options?.persistenceError) {
                  return {
                    data: null,

                    error: options.persistenceError,
                  };
                }

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

                    decided_at: "2026-08-21T19:30:00.000Z",

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
        return decisionPersistenceQuery();
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    supabase,

    organizationId,

    assemblyId,

    getDecisionInsertCount: () => decisionInsertCount,

    getInsertedDecision: () => insertedDecision,
  };
}

test("B07G composes B07F decision and B11E persistence", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyDecisionPersistence({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.runnerVersion,
    HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION,
  );

  assert.equal(mock.getDecisionInsertCount(), 1);

  assert.equal(result.organizationId, mock.organizationId);

  assert.equal(result.assemblyId, mock.assemblyId);

  assert.equal(result.decisionRun.decision.state, "CONSISTENT");

  assert.equal(result.persistedDecision.id, "decision-row-1");

  assert.equal(result.persistedDecision.authority, "NONE");

  assert.equal(
    result.persistenceVersion,
    result.persistedDecision.persistenceVersion,
  );
});

test("B07G passes exact B07F scan and decision provenance to B11E", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyDecisionPersistence({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  const inserted = mock.getInsertedDecision();

  assert.ok(inserted);

  assert.equal(inserted.organization_id, result.decisionRun.organizationId);

  assert.equal(inserted.assembly_id, result.decisionRun.assemblyId);

  assert.deepEqual(inserted.scan_summary, result.decisionRun.scanRun.scan);

  assert.deepEqual(inserted.decision_summary, result.decisionRun.decision);

  assert.equal(
    inserted.assembly_scan_version,
    result.decisionRun.scanRun.scan.scanVersion,
  );

  assert.equal(
    inserted.assembly_decision_policy_version,
    result.decisionRun.decision.policyVersion,
  );
});

test("B07G preserves complete B07F and B11E provenance", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyDecisionPersistence({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.decisionRunnerVersion, result.decisionRun.runnerVersion);

  assert.equal(result.scanRunnerVersion, result.decisionRun.scanRunnerVersion);

  assert.equal(result.readerVersion, result.decisionRun.readerVersion);

  assert.equal(result.scanVersion, result.decisionRun.scanVersion);

  assert.equal(
    result.decisionPolicyVersion,
    result.decisionRun.decisionPolicyVersion,
  );

  assert.equal(
    result.persistenceVersion,
    result.persistedDecision.persistenceVersion,
  );
});

test("B07G propagates B11E persistence failure", async () => {
  const mock = createSupabaseMock({
    persistenceError: {
      code: "42501",

      message: "insert denied",
    },
  });

  await assert.rejects(
    () =>
      runHsppSealedEvidenceAssemblyDecisionPersistence({
        supabase: mock.supabase as any,

        organizationId: mock.organizationId,

        assemblyId: mock.assemblyId,
      }),
    /Failed to persist HSPP assembly decision: insert denied/,
  );

  assert.equal(mock.getDecisionInsertCount(), 1);
});
