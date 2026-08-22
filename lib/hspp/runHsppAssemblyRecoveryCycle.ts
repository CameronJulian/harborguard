import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  readHsppAssemblyRecoveryWorkItems,
  type HsppAssemblyRecoveryWorkItem,
  type ReadHsppAssemblyRecoveryWorkItemsResult,
} from "@/lib/hspp/readHsppAssemblyRecoveryWorkItems";

import {
  runHsppOpenAssemblyRecoverySealing,
  type RunHsppOpenAssemblyRecoverySealingResult,
} from "@/lib/hspp/runHsppOpenAssemblyRecoverySealing";

import {
  runHsppSealedAssemblyRecoveryAssessment,
  type RunHsppSealedAssemblyRecoveryAssessmentResult,
} from "@/lib/hspp/runHsppSealedAssemblyRecoveryAssessment";

export const HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION =
  "hspp-assembly-recovery-cycle-runner-v1" as const;

export type HsppAssemblyRecoveryAttemptValueFactory =
  (
    workItem: HsppAssemblyRecoveryWorkItem
  ) => string;

export type RunHsppAssemblyRecoveryCycleInput = {
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * Applied independently to each persisted lifecycle-state discovery.
   *
   * Q13b remains the canonical bounded-discovery validator.
   */
  limit?: number;

  /**
   * Caller-owned execution-lease duration.
   *
   * Q13e3 remains the canonical range validator.
   */
  leaseSeconds: number;

  /**
   * Caller-owned assessment-identity proposal factory.
   *
   * The cycle does not own wall-clock generation.
   */
  createProposedAssessedAt:
    HsppAssemblyRecoveryAttemptValueFactory;

  /**
   * Caller-owned fresh execution-ownership identity factory.
   *
   * The cycle does not own UUID generation.
   */
  createLeaseToken:
    HsppAssemblyRecoveryAttemptValueFactory;
};

export type HsppAssemblyRecoveryOpenWorkResult =
  | {
      branch: "OPEN_SEALED";

      workItem:
        HsppAssemblyRecoveryWorkItem;

      sealing:
        RunHsppOpenAssemblyRecoverySealingResult;

      error: null;
    }
  | {
      branch: "OPEN_ERROR";

      workItem:
        HsppAssemblyRecoveryWorkItem;

      sealing: null;

      error: string;
    };

export type HsppAssemblyRecoverySealedWorkResult =
  | {
      branch: "SEALED_ASSESSMENT";

      workItem:
        HsppAssemblyRecoveryWorkItem;

      assessment:
        RunHsppSealedAssemblyRecoveryAssessmentResult;

      error: null;
    }
  | {
      branch: "SEALED_ERROR";

      workItem:
        HsppAssemblyRecoveryWorkItem;

      assessment: null;

      error: string;
    };

export type RunHsppAssemblyRecoveryCycleResult = {
  runnerVersion:
    typeof HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION;

  organizationId: string;

  sealedDiscovery:
    ReadHsppAssemblyRecoveryWorkItemsResult;

  openDiscovery:
    ReadHsppAssemblyRecoveryWorkItemsResult;

  openResults:
    HsppAssemblyRecoveryOpenWorkResult[];

  sealedResults:
    HsppAssemblyRecoverySealedWorkResult[];
};

function requireNonBlank(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return value.trim();
}

function requireFactory(
  value: unknown,
  fieldName: string
): void {
  if (typeof value !== "function") {
    throw new Error(
      `${fieldName} must be a function.`
    );
  }
}

function recoveryErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message.trim();
  }

  if (
    typeof error === "string" &&
    error.trim().length > 0
  ) {
    return error.trim();
  }

  return "HSPP assembly recovery work item failed.";
}

/**
 * B7490-07Q13f bounded higher-level persisted assembly recovery cycle.
 *
 * The cycle composes only the already-established recovery boundaries:
 *
 *   Q13b persisted-state discovery
 *      ->
 *   Q13c OPEN -> SEALED continuation
 *
 * and:
 *
 *   Q13b persisted SEALED discovery
 *      ->
 *   Q13d7 lease-controlled SEALED assessment continuation
 *
 * Both lifecycle-state snapshots are captured before the first mutation.
 * Therefore an OPEN assembly sealed during this cycle cannot immediately
 * continue into assessment using the stale OPEN work item. It must be
 * rediscovered as SEALED by a later recovery cycle.
 *
 * Discovery failures remain cycle-fatal because no trustworthy recovery
 * snapshot exists. Once discovery succeeds, each persisted work item is
 * isolated so one work-item failure does not block unrelated recovery work.
 *
 * This runner deliberately does NOT:
 *
 * - query organizations;
 * - create a Supabase client;
 * - generate wall-clock assessment identity;
 * - generate UUID lease identity;
 * - choose lease duration;
 * - retry an item internally;
 * - reinterpret EXECUTION_BUSY as failure;
 * - alter evidence trust or assembly membership;
 * - implement H1 -> H2 reconstruction;
 * - create API, cron, queue, scheduler or Vercel wiring.
 */
export async function runHsppAssemblyRecoveryCycle({
  supabase,
  organizationId,
  limit,
  leaseSeconds,
  createProposedAssessedAt,
  createLeaseToken,
}: RunHsppAssemblyRecoveryCycleInput): Promise<RunHsppAssemblyRecoveryCycleResult> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  requireFactory(
    createProposedAssessedAt,
    "createProposedAssessedAt"
  );

  requireFactory(
    createLeaseToken,
    "createLeaseToken"
  );

  /*
   * Capture both persisted lifecycle-state snapshots before the first
   * recovery mutation. No same-cycle SEALED rediscovery is permitted.
   */
  const sealedDiscovery =
    await readHsppAssemblyRecoveryWorkItems({
      supabase,

      organizationId:
        normalizedOrganizationId,

      assemblyState:
        "SEALED",

      limit,
    });

  const openDiscovery =
    await readHsppAssemblyRecoveryWorkItems({
      supabase,

      organizationId:
        normalizedOrganizationId,

      assemblyState:
        "OPEN",

      limit,
    });

  const openResults:
    HsppAssemblyRecoveryOpenWorkResult[] =
      [];

  for (
    const workItem
    of openDiscovery.workItems
  ) {
    try {
      const sealing =
        await runHsppOpenAssemblyRecoverySealing({
          supabase,
          workItem,
        });

      openResults.push({
        branch:
          "OPEN_SEALED",

        workItem,

        sealing,

        error:
          null,
      });
    } catch (error) {
      openResults.push({
        branch:
          "OPEN_ERROR",

        workItem,

        sealing:
          null,

        error:
          recoveryErrorMessage(
            error
          ),
      });
    }
  }

  const sealedResults:
    HsppAssemblyRecoverySealedWorkResult[] =
      [];

  for (
    const workItem
    of sealedDiscovery.workItems
  ) {
    try {
      const proposedAssessedAt =
        requireNonBlank(
          createProposedAssessedAt(
            workItem
          ),
          "createProposedAssessedAt result"
        );

      const leaseToken =
        requireNonBlank(
          createLeaseToken(
            workItem
          ),
          "createLeaseToken result"
        );

      const assessment =
        await runHsppSealedAssemblyRecoveryAssessment({
          supabase,

          workItem,

          proposedAssessedAt,

          leaseToken,

          leaseSeconds,
        });

      sealedResults.push({
        branch:
          "SEALED_ASSESSMENT",

        workItem,

        assessment,

        error:
          null,
      });
    } catch (error) {
      sealedResults.push({
        branch:
          "SEALED_ERROR",

        workItem,

        assessment:
          null,

        error:
          recoveryErrorMessage(
            error
          ),
      });
    }
  }

  return {
    runnerVersion:
      HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION,

    organizationId:
      normalizedOrganizationId,

    sealedDiscovery,

    openDiscovery,

    openResults,

    sealedResults,
  };
}