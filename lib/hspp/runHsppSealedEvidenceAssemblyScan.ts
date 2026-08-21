import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_READER_VERSION,
  readHsppSealedEvidenceAssembly,
  type ReadHsppSealedEvidenceAssemblyResult,
} from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import {
  HSPP_ASSEMBLY_SCAN_VERSION,
  scanHsppEvidenceAssembly,
  type HsppAssemblyScanResult,
} from "@/lib/hspp/scanHsppEvidenceAssembly";

export const HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION =
  "hspp-sealed-assembly-scan-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyScanInput = {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyScanResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION;

  readerVersion: typeof HSPP_SEALED_ASSEMBLY_READER_VERSION;

  scanVersion: typeof HSPP_ASSEMBLY_SCAN_VERSION;

  organizationId: string;
  assemblyId: string;

  read: ReadHsppSealedEvidenceAssemblyResult;

  scan: HsppAssemblyScanResult;
};

/**
 * B7490-07E SEALED evidence-assembly scan runner.
 *
 * This runner composes exactly two existing HSPP boundaries:
 *
 *   B07D persisted SEALED assembly reader
 *       ->
 *   B11C completed-assembly scanner
 *
 * It deliberately does NOT:
 *
 * - create or modify an evidence assembly;
 * - add or remove assembly members;
 * - seal an assembly;
 * - reimplement persisted evidence integrity verification;
 * - reimplement canonical contradiction policy;
 * - evaluate the B11D assembly decision;
 * - persist a B11E assembly decision;
 * - modify evidence trust or validation state;
 * - apply HSPP assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyScan(
  input: RunHsppSealedEvidenceAssemblyScanInput,
): Promise<RunHsppSealedEvidenceAssemblyScanResult> {
  const read = await readHsppSealedEvidenceAssembly({
    supabase: input.supabase,

    organizationId: input.organizationId,

    assemblyId: input.assemblyId,
  });

  const scan = scanHsppEvidenceAssembly(read.scanInput);

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION,

    readerVersion: read.readerVersion,

    scanVersion: scan.scanVersion,

    organizationId: read.scanInput.organizationId,

    assemblyId: read.scanInput.assemblyId,

    read,

    scan,
  };
}
