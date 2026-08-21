import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyScan,
  type RunHsppSealedEvidenceAssemblyScanResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyScan";

import {
  HSPP_ASSEMBLY_DECISION_VERSION,
  evaluateHsppAssemblyDecision,
  type HsppAssemblyDecision,
} from "@/lib/hspp/evaluateHsppAssemblyDecision";

export const HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION =
  "hspp-sealed-assembly-decision-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyDecisionInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyDecisionResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION;

  scanRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION;

  readerVersion: RunHsppSealedEvidenceAssemblyScanResult["readerVersion"];

  scanVersion: RunHsppSealedEvidenceAssemblyScanResult["scanVersion"];

  decisionPolicyVersion: typeof HSPP_ASSEMBLY_DECISION_VERSION;

  organizationId: string;

  assemblyId: string;

  scanRun: RunHsppSealedEvidenceAssemblyScanResult;

  decision: HsppAssemblyDecision;
};

/**
 * B7490-07F SEALED evidence-assembly decision runner.
 *
 * This runner composes exactly:
 *
 *   B07E SEALED assembly scan runner
 *       ->
 *   B11D assembly decision evaluator
 *
 * It preserves the complete B07E result plus the exact B11D
 * interpretation of the B11C scan.
 *
 * B11D intentionally consumes every valid B11C result, including
 * INSUFFICIENT_EVIDENCE and NOT_SCANNABLE results, and converts them
 * into fail-closed protocol decision states.
 *
 * This runner deliberately does NOT:
 *
 * - persist a B11E assembly decision;
 * - write to hspp_assembly_decisions;
 * - create or modify evidence assemblies;
 * - add, remove, or seal assembly members;
 * - rescan evidence independently of B07E/B11C;
 * - reimplement B11D decision policy;
 * - evaluate assembly authority;
 * - modify HSPP trust or validation state;
 * - grant operational eligibility;
 * - apply HSPP member assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyDecision(
  input: RunHsppSealedEvidenceAssemblyDecisionInput,
): Promise<RunHsppSealedEvidenceAssemblyDecisionResult> {
  const scanRun = await runHsppSealedEvidenceAssemblyScan({
    supabase: input.supabase,

    organizationId: input.organizationId,

    assemblyId: input.assemblyId,
  });

  const decision = evaluateHsppAssemblyDecision(scanRun.scan);

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION,

    scanRunnerVersion: scanRun.runnerVersion,

    readerVersion: scanRun.readerVersion,

    scanVersion: scanRun.scanVersion,

    decisionPolicyVersion: decision.policyVersion,

    organizationId: scanRun.organizationId,

    assemblyId: scanRun.assemblyId,

    scanRun,

    decision,
  };
}
