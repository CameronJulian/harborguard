import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppCanonicalClaims,
} from "../lib/hspp/buildHsppCanonicalClaims";

import {
  scanHsppEvidenceAssembly,
} from "../lib/hspp/scanHsppEvidenceAssembly";

import {
  evaluateHsppAssemblyDecision,
} from "../lib/hspp/evaluateHsppAssemblyDecision";

import {
  persistHsppAssemblyDecision,
  type HsppAssemblyDecisionPersistenceClient,
} from "../lib/hspp/persistHsppAssemblyDecision";

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

function buildConsistentScan() {
  return scanHsppEvidenceAssembly({
    assemblyId:
      "assembly-1",

    organizationId:
      "org-1",

    assemblyState:
      "SEALED",

    members: [
      {
        evidenceId:
          "evidence-1",

        integrityFingerprint:
          fingerprintA,

        memberOrdinal:
          1,

        canonicalClaims:
          buildHsppCanonicalClaims({
            eventType:
              "road_closure",
          }),
      },
      {
        evidenceId:
          "evidence-2",

        integrityFingerprint:
          fingerprintB,

        memberOrdinal:
          2,

        canonicalClaims:
          buildHsppCanonicalClaims({
            eventType:
              "roadblock",
          }),
      },
    ],
  });
}

function fakeClient(
  options?: {
    error?: {
      message?: string;
      code?: string;
    } | null;
  }
) {
  const calls: {
    table:
      string | null;
    inserted:
      Record<string, unknown> |
      null;
    selected:
      string | null;
  } = {
    table:
      null,
    inserted:
      null,
    selected:
      null,
  };

  const client:
    HsppAssemblyDecisionPersistenceClient = {
      from(table) {
        calls.table =
          table;

        return {
          insert(values) {
            calls.inserted =
              values;

            return {
              select(columns) {
                calls.selected =
                  columns;

                return {
                  async single() {
                    if (options?.error) {
                      return {
                        data:
                          null,

                        error:
                          options.error,
                      };
                    }

                    const inserted =
                      calls.inserted!;

                    return {
                      data: {
                        id:
                          "decision-row-1",

                        organization_id:
                          String(
                            inserted.organization_id
                          ),

                        assembly_id:
                          String(
                            inserted.assembly_id
                          ),

                        assembly_scan_version:
                          String(
                            inserted.assembly_scan_version
                          ),

                        assembly_decision_policy_version:
                          String(
                            inserted.assembly_decision_policy_version
                          ),

                        assembly_decision_state:
                          inserted.assembly_decision_state as
                            "CONSISTENT",

                        assembly_decision_reason:
                          inserted.assembly_decision_reason as
                            "CANONICAL_AGREEMENT_WITHOUT_CONFLICT",

                        decided_at:
                          "2026-08-21T10:00:00.000Z",

                        authority:
                          "NONE",
                      },

                      error:
                        null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

  return {
    client,
    calls,
  };
}

test(
  "B11E2 persists exact B11C and B11D provenance",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const {
      client,
      calls,
    } =
      fakeClient();

    const result =
      await persistHsppAssemblyDecision({
        supabase:
          client,

        organizationId:
          "org-1",

        assemblyId:
          "assembly-1",

        scan,
        decision,
      });

    assert.equal(
      calls.table,
      "hspp_assembly_decisions"
    );

    assert.ok(
      calls.inserted
    );

    assert.equal(
      calls.inserted
        ?.organization_id,
      "org-1"
    );

    assert.equal(
      calls.inserted
        ?.assembly_id,
      "assembly-1"
    );

    assert.equal(
      calls.inserted
        ?.assembly_scan_version,
      scan.scanVersion
    );

    assert.equal(
      calls.inserted
        ?.assembly_decision_policy_version,
      decision.policyVersion
    );

    assert.equal(
      calls.inserted
        ?.assembly_decision_state,
      "CONSISTENT"
    );

    assert.equal(
      calls.inserted
        ?.assembly_decision_reason,
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
    );

    assert.deepEqual(
      calls.inserted
        ?.scan_summary,
      scan
    );

    assert.deepEqual(
      calls.inserted
        ?.decision_summary,
      decision
    );

    assert.equal(
      calls.inserted
        ?.authority,
      "NONE"
    );

    assert.equal(
      result.id,
      "decision-row-1"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "blank organization identity fails before persistence",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const {
      client,
      calls,
    } =
      fakeClient();

    await assert.rejects(
      () =>
        persistHsppAssemblyDecision({
          supabase:
            client,

          organizationId:
            "   ",

          assemblyId:
            "assembly-1",

          scan,
          decision,
        }),
      /organizationId is required/
    );

    assert.equal(
      calls.table,
      null
    );
  }
);

test(
  "blank assembly identity fails before persistence",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const {
      client,
      calls,
    } =
      fakeClient();

    await assert.rejects(
      () =>
        persistHsppAssemblyDecision({
          supabase:
            client,

          organizationId:
            "org-1",

          assemblyId:
            "",

          scan,
          decision,
        }),
      /assemblyId is required/
    );

    assert.equal(
      calls.table,
      null
    );
  }
);

test(
  "mismatched B11D decision fails closed before database write",
  async () => {
    const scan =
      buildConsistentScan();

    const validDecision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const invalidDecision = {
      ...validDecision,

      state:
        "UNRESOLVED" as const,

      reason:
        "NO_COMPARABLE_AGREEMENT" as const,
    };

    const {
      client,
      calls,
    } =
      fakeClient();

    await assert.rejects(
      () =>
        persistHsppAssemblyDecision({
          supabase:
            client,

          organizationId:
            "org-1",

          assemblyId:
            "assembly-1",

          scan,
          decision:
            invalidDecision,
        }),
      /does not match the supplied B11C scan/
    );

    assert.equal(
      calls.table,
      null
    );
  }
);

test(
  "non-NONE authority fails closed",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const unsafeScan = {
      ...scan,

      authority:
        "UNSAFE" as "NONE",
    };

    const {
      client,
      calls,
    } =
      fakeClient();

    await assert.rejects(
      () =>
        persistHsppAssemblyDecision({
          supabase:
            client,

          organizationId:
            "org-1",

          assemblyId:
            "assembly-1",

          scan:
            unsafeScan,

          decision,
        }),
      /requires authority NONE/
    );

    assert.equal(
      calls.table,
      null
    );
  }
);

test(
  "database persistence error is surfaced",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const {
      client,
    } =
      fakeClient({
        error: {
          message:
            "insert denied",
        },
      });

    await assert.rejects(
      () =>
        persistHsppAssemblyDecision({
          supabase:
            client,

          organizationId:
            "org-1",

          assemblyId:
            "assembly-1",

          scan,
          decision,
        }),
      /Failed to persist HSPP assembly decision: insert denied/
    );
  }
);

test(
  "persistence does not mutate scan or decision objects",
  async () => {
    const scan =
      buildConsistentScan();

    const decision =
      evaluateHsppAssemblyDecision(
        scan
      );

    const scanBefore =
      structuredClone(
        scan
      );

    const decisionBefore =
      structuredClone(
        decision
      );

    const {
      client,
    } =
      fakeClient();

    await persistHsppAssemblyDecision({
      supabase:
        client,

      organizationId:
        "org-1",

      assemblyId:
        "assembly-1",

      scan,
      decision,
    });

    assert.deepEqual(
      scan,
      scanBefore
    );

    assert.deepEqual(
      decision,
      decisionBefore
    );
  }
);