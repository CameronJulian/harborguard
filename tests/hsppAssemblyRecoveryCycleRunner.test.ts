import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION,
  runHsppAssemblyRecoveryCycle,
} from "../lib/hspp/runHsppAssemblyRecoveryCycle";

type RecoveryState =
  | "OPEN"
  | "SEALED";

type RecoveryRow = {
  id: string;

  organization_id: string;

  assembly_version: string;

  membership_policy_version: string;

  assembly_state: RecoveryState;

  created_at: string;

  sealed_at: string | null;
};

function recoveryRow(
  id: string,
  state: RecoveryState
): RecoveryRow {
  return {
    id,

    organization_id:
      "organization-1",

    assembly_version:
      "assembly-v1",

    membership_policy_version:
      "membership-v1",

    assembly_state:
      state,

    created_at:
      "2026-08-22T17:00:00.000Z",

    sealed_at:
      state === "SEALED"
        ? "2026-08-22T17:01:00.000Z"
        : null,
  };
}

function createRecoveryDiscoverySupabase(
  rowsByState: Partial<
    Record<
      RecoveryState,
      RecoveryRow[]
    >
  >,
  observedStates: string[]
): SupabaseClient {
  return {
    from(table: string) {
      assert.equal(
        table,
        "hspp_evidence_assemblies"
      );

      let organizationId:
        string | null =
          null;

      let assemblyState:
        RecoveryState | null =
          null;

      const builder: {
        select: (
          columns: string
        ) => typeof builder;

        eq: (
          column: string,
          value: unknown
        ) => typeof builder;

        order: (
          column: string,
          options: unknown
        ) => typeof builder;

        limit: (
          value: number
        ) => Promise<{
          data: RecoveryRow[];
          error: null;
        }>;
      } = {
        select() {
          return builder;
        },

        eq(
          column: string,
          value: unknown
        ) {
          if (
            column ===
            "organization_id"
          ) {
            organizationId =
              String(value);
          }

          if (
            column ===
            "assembly_state"
          ) {
            const valueString =
              String(value);

            if (
              valueString === "OPEN" ||
              valueString === "SEALED"
            ) {
              assemblyState =
                valueString;
            }
          }

          return builder;
        },

        order() {
          return builder;
        },

        async limit(value: number) {
          assert.ok(
            assemblyState,
            "assembly state was not scoped"
          );

          observedStates.push(
            assemblyState
          );

          const rows =
            rowsByState[
              assemblyState
            ] || [];

          return {
            data:
              rows
                .filter(
                  (row) =>
                    row.organization_id ===
                    organizationId
                )
                .slice(
                  0,
                  value
                ),

            error:
              null,
          };
        },
      };

      return builder;
    },
  } as unknown as SupabaseClient;
}

test(
  "Q13f snapshots SEALED then OPEN before any work and returns an empty bounded cycle",
  async () => {
    const observedStates:
      string[] =
        [];

    let assessedAtFactoryCalls =
      0;

    let leaseTokenFactoryCalls =
      0;

    const result =
      await runHsppAssemblyRecoveryCycle({
        supabase:
          createRecoveryDiscoverySupabase(
            {},
            observedStates
          ),

        organizationId:
          "organization-1",

        limit:
          5,

        leaseSeconds:
          60,

        createProposedAssessedAt() {
          assessedAtFactoryCalls +=
            1;

          return "2026-08-22T17:00:00.000Z";
        },

        createLeaseToken() {
          leaseTokenFactoryCalls +=
            1;

          return "11111111-1111-4111-8111-111111111111";
        },
      });

    assert.deepEqual(
      observedStates,
      [
        "SEALED",
        "OPEN",
      ]
    );

    assert.equal(
      result.runnerVersion,
      HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION
    );

    assert.equal(
      result.organizationId,
      "organization-1"
    );

    assert.equal(
      result.sealedDiscovery.assemblyState,
      "SEALED"
    );

    assert.equal(
      result.openDiscovery.assemblyState,
      "OPEN"
    );

    assert.equal(
      result.sealedDiscovery.requestedLimit,
      5
    );

    assert.equal(
      result.openDiscovery.requestedLimit,
      5
    );

    assert.deepEqual(
      result.openResults,
      []
    );

    assert.deepEqual(
      result.sealedResults,
      []
    );

    assert.equal(
      assessedAtFactoryCalls,
      0
    );

    assert.equal(
      leaseTokenFactoryCalls,
      0
    );
  }
);

test(
  "Q13f rejects missing caller-owned identity factories before discovery",
  async () => {
    await assert.rejects(
      () =>
        runHsppAssemblyRecoveryCycle({
          supabase:
            {} as SupabaseClient,

          organizationId:
            "organization-1",

          leaseSeconds:
            60,

          createProposedAssessedAt:
            null as unknown as (
              workItem: never
            ) => string,

          createLeaseToken:
            () =>
              "11111111-1111-4111-8111-111111111111",
        }),
      /createProposedAssessedAt must be a function/
    );
  }
);

test(
  "Q13f isolates SEALED work-item preparation failures and continues the snapshot",
  async () => {
    const observedStates:
      string[] =
        [];

    const assessedAssemblyIds:
      string[] =
        [];

    let leaseTokenFactoryCalls =
      0;

    const result =
      await runHsppAssemblyRecoveryCycle({
        supabase:
          createRecoveryDiscoverySupabase(
            {
              SEALED: [
                recoveryRow(
                  "assembly-1",
                  "SEALED"
                ),

                recoveryRow(
                  "assembly-2",
                  "SEALED"
                ),
              ],
            },
            observedStates
          ),

        organizationId:
          "organization-1",

        limit:
          10,

        leaseSeconds:
          60,

        createProposedAssessedAt(
          workItem
        ) {
          assessedAssemblyIds.push(
            workItem.assemblyId
          );

          throw new Error(
            `assessment clock unavailable for ${workItem.assemblyId}`
          );
        },

        createLeaseToken() {
          leaseTokenFactoryCalls +=
            1;

          return "11111111-1111-4111-8111-111111111111";
        },
      });

    assert.deepEqual(
      observedStates,
      [
        "SEALED",
        "OPEN",
      ]
    );

    assert.deepEqual(
      assessedAssemblyIds,
      [
        "assembly-1",
        "assembly-2",
      ]
    );

    assert.equal(
      leaseTokenFactoryCalls,
      0
    );

    assert.equal(
      result.sealedResults.length,
      2
    );

    assert.equal(
      result.sealedResults[0].branch,
      "SEALED_ERROR"
    );

    assert.equal(
      result.sealedResults[1].branch,
      "SEALED_ERROR"
    );

    if (
      result.sealedResults[0].branch ===
      "SEALED_ERROR"
    ) {
      assert.match(
        result.sealedResults[0].error,
        /assembly-1/
      );
    }

    if (
      result.sealedResults[1].branch ===
      "SEALED_ERROR"
    ) {
      assert.match(
        result.sealedResults[1].error,
        /assembly-2/
      );
    }
  }
);