import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyScan,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyScan";

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

  const calls: string[] = [];

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

      order(
        column: string,
        options: {
          ascending?: boolean;
        },
      ) {
        calls.push(`${column}:${options.ascending}`);

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
    calls,
    organizationId,
    assemblyId,
  };
}

test("B07E composes B07D read and B11C scan", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyScan({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.runnerVersion, HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION);

  assert.equal(result.organizationId, mock.organizationId);

  assert.equal(result.assemblyId, mock.assemblyId);

  assert.equal(result.read.scanInput.assemblyState, "SEALED");

  assert.equal(result.scan.state, "SCANNED");

  assert.equal(result.scan.memberCount, 2);

  assert.equal(result.scan.pairCount, 1);

  assert.equal(result.scan.authority, "NONE");

  assert.deepEqual(mock.calls, ["member_ordinal:true"]);
});

test("B07E returns B11C insufficient-evidence result without later decision processing", async () => {
  const mock = createSupabaseMock(["road_closure"]);

  const result = await runHsppSealedEvidenceAssemblyScan({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.scan.state, "INSUFFICIENT_EVIDENCE");

  assert.equal(result.scan.reason, "INSUFFICIENT_MEMBERS");

  assert.equal(result.scan.authority, "NONE");
});

test("B07E preserves B07D reader and B11C scan provenance", async () => {
  const mock = createSupabaseMock();

  const result = await runHsppSealedEvidenceAssemblyScan({
    supabase: mock.supabase as any,

    organizationId: mock.organizationId,

    assemblyId: mock.assemblyId,
  });

  assert.equal(result.readerVersion, result.read.readerVersion);

  assert.equal(result.scanVersion, result.scan.scanVersion);
});
