import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyDecision,
  type RunHsppSealedEvidenceAssemblyDecisionResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyDecision";

import {
  HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,
  persistHsppAssemblyDecision,
  type HsppAssemblyDecisionPersistenceClient,
  type HsppPersistedAssemblyDecision,
} from "@/lib/hspp/persistHsppAssemblyDecision";

export const HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION =
  "hspp-sealed-assembly-decision-persistence-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyDecisionPersistenceInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyDecisionPersistenceResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION;

  decisionRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION;

  scanRunnerVersion: RunHsppSealedEvidenceAssemblyDecisionResult["scanRunnerVersion"];

  readerVersion: RunHsppSealedEvidenceAssemblyDecisionResult["readerVersion"];

  scanVersion: RunHsppSealedEvidenceAssemblyDecisionResult["scanVersion"];

  decisionPolicyVersion: RunHsppSealedEvidenceAssemblyDecisionResult["decisionPolicyVersion"];

  persistenceVersion: typeof HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION;

  organizationId: string;

  assemblyId: string;

  decisionRun: RunHsppSealedEvidenceAssemblyDecisionResult;

  persistedDecision: HsppPersistedAssemblyDecision;
};

/**
 * B7490-07G SEALED evidence-assembly decision-persistence runner.
 *
 * This runner composes exactly:
 *
 *   B07F SEALED assembly decision runner
 *       ->
 *   B11E immutable assembly-decision persistence
 *
 * It passes the exact B07F B11C scan and B11D decision into B11E.
 * It does not re-scan, re-evaluate, adapt, or reinterpret either
 * provenance object.
 *
 * The runner stops immediately after B11E provenance persistence.
 *
 * It deliberately does NOT:
 *
 * - directly write to hspp_assembly_decisions;
 * - implement INSERT, UPDATE, UPSERT, DELETE, or RPC operations;
 * - reimplement B11C scanning;
 * - reimplement B11D decision policy;
 * - reimplement B11E persistence or idempotency;
 * - evaluate assembly authority;
 * - persist corroborated-member assessments;
 * - apply HSPP assessment decisions;
 * - modify HSPP evidence trust or validation state;
 * - grant operational eligibility;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - disassemble an evidence assembly;
 * - return evidence to the Reservoir;
 * - search for replacement evidence;
 * - reconstruct or supersede an assembly;
 * - create an API route;
 * - create cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyDecisionPersistence(
  input: RunHsppSealedEvidenceAssemblyDecisionPersistenceInput,
): Promise<RunHsppSealedEvidenceAssemblyDecisionPersistenceResult> {
  const decisionRun = await runHsppSealedEvidenceAssemblyDecision({
    supabase: input.supabase,

    organizationId: input.organizationId,

    assemblyId: input.assemblyId,
  });

  const persistedDecision = await persistHsppAssemblyDecision({
    supabase:
      input.supabase as unknown as HsppAssemblyDecisionPersistenceClient,

    organizationId: decisionRun.organizationId,

    assemblyId: decisionRun.assemblyId,

    scan: decisionRun.scanRun.scan,

    decision: decisionRun.decision,
  });

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION,

    decisionRunnerVersion: decisionRun.runnerVersion,

    scanRunnerVersion: decisionRun.scanRunnerVersion,

    readerVersion: decisionRun.readerVersion,

    scanVersion: decisionRun.scanVersion,

    decisionPolicyVersion: decisionRun.decisionPolicyVersion,

    persistenceVersion: persistedDecision.persistenceVersion,

    organizationId: decisionRun.organizationId,

    assemblyId: decisionRun.assemblyId,

    decisionRun,

    persistedDecision,
  };
}
