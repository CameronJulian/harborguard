import assert from "node:assert/strict";
import test from "node:test";

import { buildHsppCanonicalClaims } from "../lib/hspp/buildHsppCanonicalClaims";

import { scanHsppEvidenceAssembly } from "../lib/hspp/scanHsppEvidenceAssembly";

import { evaluateHsppAssemblyDecision } from "../lib/hspp/evaluateHsppAssemblyDecision";

import {
  persistHsppAssemblyDecision,
  type HsppAssemblyDecisionPersistenceClient,
} from "../lib/hspp/persistHsppAssemblyDecision";

const fingerprintA = "a".repeat(64);

const fingerprintB = "b".repeat(64);

function buildConsistentScan() {
  return scanHsppEvidenceAssembly({
    assemblyId: "assembly-1",

    organizationId: "org-1",

    assemblyState: "SEALED",

    members: [
      {
        evidenceId: "evidence-1",

        integrityFingerprint: fingerprintA,

        memberOrdinal: 1,

        canonicalClaims: buildHsppCanonicalClaims({
          eventType: "road_closure",
        }),
      },
      {
        evidenceId: "evidence-2",

        integrityFingerprint: fingerprintB,

        memberOrdinal: 2,

        canonicalClaims: buildHsppCanonicalClaims({
          eventType: "roadblock",
        }),
      },
    ],
  });
}

function existingRow(
  scan: ReturnType<typeof buildConsistentScan>,
  overrides: Record<string, unknown> = {},
) {
  const decision = evaluateHsppAssemblyDecision(scan);

  return {
    id: "original-decision-row",

    organization_id: "org-1",

    assembly_id: "assembly-1",

    assembly_scan_version: scan.scanVersion,

    assembly_decision_policy_version: decision.policyVersion,

    assembly_decision_state: decision.state,

    assembly_decision_reason: decision.reason,

    member_count: scan.memberCount,

    pair_count: scan.pairCount,

    canonical_conflict_count: scan.canonicalConflictCount,

    canonical_agreement_count: scan.canonicalAgreementCount,

    canonical_unknown_count: scan.canonicalUnknownCount,

    has_canonical_conflict: scan.hasCanonicalConflict,

    scan_summary: structuredClone(scan),

    decision_summary: structuredClone(decision),

    decided_at: "2026-08-21T12:34:56.000Z",

    authority: "NONE",

    ...overrides,
  };
}

function duplicateClient(
  row: Record<string, unknown>,
  options?: {
    insertCode?: string;
    insertMessage?: string;
    recoveryError?: {
      code?: string;
      message?: string;
    } | null;
  },
) {
  const filters: Array<[string, string]> = [];

  let insertCount = 0;

  let lookupCount = 0;

  const client = {
    from(table: string) {
      assert.equal(table, "hspp_assembly_decisions");

      return {
        insert(_values: Record<string, unknown>) {
          insertCount += 1;

          return {
            select(_columns: string) {
              return {
                async single() {
                  return {
                    data: null,

                    error: {
                      code: options?.insertCode ?? "23505",

                      message: options?.insertMessage ?? "duplicate key",
                    },
                  };
                },
              };
            },
          };
        },

        select(_columns: string) {
          lookupCount += 1;

          const query: any = {
            eq(column: string, value: string) {
              filters.push([column, value]);

              return query;
            },

            async maybeSingle() {
              if (options?.recoveryError) {
                return {
                  data: null,

                  error: options.recoveryError,
                };
              }

              return {
                data: row,

                error: null,
              };
            },
          };

          return query;
        },
      };
    },
  } as unknown as HsppAssemblyDecisionPersistenceClient;

  return {
    client,

    filters,

    getInsertCount: () => insertCount,

    getLookupCount: () => lookupCount,
  };
}

async function persistWith(client: HsppAssemblyDecisionPersistenceClient) {
  const scan = buildConsistentScan();

  const decision = evaluateHsppAssemblyDecision(scan);

  const result = await persistHsppAssemblyDecision({
    supabase: client,

    organizationId: "org-1",

    assemblyId: "assembly-1",

    scan,

    decision,
  });

  return {
    scan,
    decision,
    result,
  };
}

test("B07G3 PostgreSQL 23505 recovers the exact existing immutable decision", async () => {
  const scan = buildConsistentScan();

  const mock = duplicateClient(existingRow(scan));

  const { result } = await persistWith(mock.client);

  assert.equal(mock.getInsertCount(), 1);

  assert.equal(mock.getLookupCount(), 1);

  assert.equal(result.id, "original-decision-row");

  assert.equal(result.decidedAt, "2026-08-21T12:34:56.000Z");

  assert.equal(result.authority, "NONE");
});

test("B07G3 duplicate recovery is scoped by complete logical identity", async () => {
  const scan = buildConsistentScan();

  const decision = evaluateHsppAssemblyDecision(scan);

  const mock = duplicateClient(existingRow(scan));

  await persistWith(mock.client);

  assert.deepEqual(mock.filters, [
    ["organization_id", "org-1"],
    ["assembly_id", "assembly-1"],
    ["assembly_scan_version", scan.scanVersion],
    ["assembly_decision_policy_version", decision.policyVersion],
  ]);
});

test("B07G3 conflicting scalar provenance fails closed", async () => {
  const scan = buildConsistentScan();

  const cases: Array<[string, unknown]> = [
    ["organization_id", "other-org"],
    ["assembly_id", "other-assembly"],
    ["assembly_scan_version", "different-scan-version"],
    ["assembly_decision_policy_version", "different-policy"],
    ["assembly_decision_state", "UNRESOLVED"],
    ["assembly_decision_reason", "NO_COMPARABLE_AGREEMENT"],
    ["member_count", scan.memberCount + 1],
    ["pair_count", scan.pairCount + 1],
    ["canonical_conflict_count", scan.canonicalConflictCount + 1],
    ["canonical_agreement_count", scan.canonicalAgreementCount + 1],
    ["canonical_unknown_count", scan.canonicalUnknownCount + 1],
    ["has_canonical_conflict", !scan.hasCanonicalConflict],
    ["authority", "UNSAFE"],
  ];

  for (const [field, value] of cases) {
    const mock = duplicateClient(
      existingRow(scan, {
        [field]: value,
      }),
    );

    await assert.rejects(
      () => persistWith(mock.client),
      /does not match|conflicts with the attempted idempotent persistence provenance/,
      field,
    );
  }
});

test("B07G3 differing scan snapshot fails closed", async () => {
  const scan = buildConsistentScan();

  const changedScan = structuredClone(scan);

  (changedScan as any).memberCount += 1;

  const mock = duplicateClient(
    existingRow(scan, {
      scan_summary: changedScan,
    }),
  );

  await assert.rejects(
    () => persistWith(mock.client),
    /conflicts with the attempted idempotent persistence provenance/,
  );
});

test("B07G3 JSON snapshot comparison is semantic across object key order", async () => {
  const scan = buildConsistentScan();

  const decision = evaluateHsppAssemblyDecision(scan);

  function reverseKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(reverseKeys);
    }

    if (value !== null && typeof value === "object") {
      const object = value as Record<string, unknown>;

      const result: Record<string, unknown> = {};

      for (const key of Object.keys(object).reverse()) {
        result[key] = reverseKeys(object[key]);
      }

      return result;
    }

    return value;
  }

  const mock = duplicateClient(
    existingRow(scan, {
      scan_summary: reverseKeys(scan),

      decision_summary: reverseKeys(decision),
    }),
  );

  const { result } = await persistWith(mock.client);

  assert.equal(result.id, "original-decision-row");
});

test("B07G3 differing decision snapshot fails closed", async () => {
  const scan = buildConsistentScan();

  const decision = evaluateHsppAssemblyDecision(scan);

  const changedDecision = {
    ...decision,

    memberCount: decision.memberCount + 1,
  };

  const mock = duplicateClient(
    existingRow(scan, {
      decision_summary: changedDecision,
    }),
  );

  await assert.rejects(
    () => persistWith(mock.client),
    /conflicts with the attempted idempotent persistence provenance/,
  );
});

test("B07G3 non-23505 database errors do not enter duplicate recovery", async () => {
  const scan = buildConsistentScan();

  const mock = duplicateClient(existingRow(scan), {
    insertCode: "42501",

    insertMessage: "insert denied",
  });

  await assert.rejects(
    () => persistWith(mock.client),
    /Failed to persist HSPP assembly decision: insert denied/,
  );

  assert.equal(mock.getLookupCount(), 0);
});

test("B07G3 duplicate lookup database failure fails closed", async () => {
  const scan = buildConsistentScan();

  const mock = duplicateClient(existingRow(scan), {
    recoveryError: {
      code: "42501",

      message: "read denied",
    },
  });

  await assert.rejects(
    () => persistWith(mock.client),
    /Failed to recover existing HSPP assembly decision: read denied/,
  );
});
