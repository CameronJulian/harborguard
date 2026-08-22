import type { SupabaseClient } from "@supabase/supabase-js";

import type { HsppAssemblyRecoveryWorkItem } from "@/lib/hspp/readHsppAssemblyRecoveryWorkItems";

import {
  HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION,
  sealHsppEvidenceAssembly,
  type SealedHsppEvidenceAssembly,
} from "@/lib/hspp/sealHsppEvidenceAssembly";

export const HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION =
  "hspp-open-assembly-recovery-sealing-runner-v1" as const;

export type RunHsppOpenAssemblyRecoverySealingInput = {
  supabase: SupabaseClient;

  workItem: HsppAssemblyRecoveryWorkItem;
};

export type RunHsppOpenAssemblyRecoverySealingResult = {
  runnerVersion: typeof HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION;

  sealingVersion: typeof HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION;

  workItem: HsppAssemblyRecoveryWorkItem;

  sealedAssembly: SealedHsppEvidenceAssembly;
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

/**
 * B7490-07Q13c single-work-item OPEN recovery sealing continuation.
 *
 * Q13c consumes one already-discovered Q13b recovery work item.
 *
 * It does not perform discovery itself.
 *
 * The only permitted lifecycle continuation is:
 *
 *   persisted OPEN assembly
 *       ->
 *   existing B07C3 OPEN -> SEALED sealing boundary
 *
 * Recovery remains state-driven. If sealing succeeds in PostgreSQL but the
 * caller loses the response, the next recovery invocation must rediscover
 * the persisted assembly through Q13b's SEALED state query rather than
 * blindly replaying this stale OPEN work item.
 *
 * Q13c deliberately does NOT:
 *
 * - query recovery work;
 * - rerun Reservoir discovery or reevaluation;
 * - rerun Lifeguard or membership evaluation;
 * - create or recreate an assembly;
 * - read, add, remove or replace assembly members;
 * - directly access Supabase tables or RPCs;
 * - retry sealing internally;
 * - reinterpret a database "not OPEN" response as success;
 * - read or scan the SEALED assembly;
 * - run assembly decision/corroboration routing;
 * - invoke Q9, Q10, Q11 or Q12;
 * - generate, accept, infer or persist assessedAt;
 * - reinterpret createdAt or sealedAt as assessment identity;
 * - infer that SEALED means Q12 pending or Q12 complete;
 * - alter evidence trust or downstream eligibility;
 * - create API, UI, cron, queue, retry or scheduler execution.
 */
export async function runHsppOpenAssemblyRecoverySealing({
  supabase,
  workItem,
}: RunHsppOpenAssemblyRecoverySealingInput): Promise<RunHsppOpenAssemblyRecoverySealingResult> {
  if (!workItem || typeof workItem !== "object") {
    throw new Error(
      "B7490-07Q13c requires one persisted Q13b recovery work item.",
    );
  }

  const organizationId = requireNonBlank(
    workItem.organizationId,
    "workItem.organizationId",
  );

  const assemblyId = requireNonBlank(
    workItem.assemblyId,
    "workItem.assemblyId",
  );

  if (workItem.assemblyState !== "OPEN") {
    throw new Error(
      "B7490-07Q13c may continue only a persisted OPEN assembly recovery work item.",
    );
  }

  if (workItem.sealedAt !== null) {
    throw new Error(
      "B7490-07Q13c OPEN recovery work must not already contain sealedAt.",
    );
  }

  const sealedAssembly = await sealHsppEvidenceAssembly({
    supabase,

    organizationId,

    assemblyId,
  });

  return {
    runnerVersion: HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION,

    sealingVersion: sealedAssembly.sealingVersion,

    workItem,

    sealedAssembly,
  };
}
