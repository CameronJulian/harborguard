import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyDecision,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyDecision";

import { buildHsppEvidence } from "../lib/hspp/buildHsppEvidence";

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

function createSupabaseMock(
  eventTypes: string[] = ["road_closure", "road_closure"],
) {
  const organizationId = "22222222-2222-4222-8222-222222222222";

  const assemblyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const rows = eventTypes.map((eventType, index) =>
    evidenceRow(
      `${index + 1}`.repeat(8) +
        "-" +
        `${index + 1}`.repeat(4) +
        "-4" +
        `${index + 1}`.repeat(3) +
        "-8" +
        `${index + 1}`.repeat(3) +
        "-" +
        `${index + 1}`.repeat(12),
      eventType,
    ),
  );

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

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    supabase,
    organizationId,
    assemblyId,
  };
}

test("B07F composes B07E scan and B11D decision", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyDecision({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(
    result.runnerVersion,
    HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION,
  );

  assert.equal(result.scanRun.scan.state, "SCANNED");

  assert.equal(result.decision.state, "CONSISTENT");

  assert.equal(result.decision.reason, "CANONICAL_AGREEMENT_WITHOUT_CONFLICT");

  assert.equal(result.decision.authority, "NONE");
});

test("B07F evaluates insufficient B11C evidence as NOT_READY", async () => {
  const mock = createSupabaseMock(["road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyDecision({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.scanRun.scan.state, "INSUFFICIENT_EVIDENCE");

  assert.equal(result.decision.state, "NOT_READY");

  assert.equal(result.decision.reason, "INSUFFICIENT_EVIDENCE");

  assert.equal(result.decision.authority, "NONE");
});

test("B07F preserves B07E B07D B11C and B11D provenance", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyDecision({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.scanRunnerVersion, result.scanRun.runnerVersion);

  assert.equal(result.readerVersion, result.scanRun.readerVersion);

  assert.equal(result.scanVersion, result.scanRun.scan.scanVersion);

  assert.equal(result.decisionPolicyVersion, result.decision.policyVersion);

  assert.equal(result.organizationId, mock.organizationId);

  assert.equal(result.assemblyId, mock.assemblyId);
});
