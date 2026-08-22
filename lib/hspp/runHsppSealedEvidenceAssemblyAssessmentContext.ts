import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyAuthority,
  type RunHsppSealedEvidenceAssemblyAuthorityResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyAuthority";

import type { HsppSealedAssemblyMembershipRelation } from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import {
  HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,
  buildHsppAssemblyAssessmentInput,
  type HsppAssemblyAssessmentInput,
  type HsppAssemblyAssessmentMember,
} from "@/lib/hspp/buildHsppAssemblyAssessmentInput";

export const HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION =
  "hspp-sealed-assembly-assessment-context-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyAssessmentContextInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type RunHsppSealedEvidenceAssemblyAssessmentContextResult = {
  runnerVersion: typeof HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION;

  authorityRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION;

  assessmentContextVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION;

  organizationId: string;

  assemblyId: string;

  authority: RunHsppSealedEvidenceAssemblyAuthorityResult;

  membershipRelation: HsppSealedAssemblyMembershipRelation | null;

  assessmentContext: HsppAssemblyAssessmentInput;
};

/**
 * B7490-07I SEALED assembly assessment-context runner.
 *
 * This boundary composes exactly:
 *
 *   B07H assembly-authority candidacy
 *       ->
 *   existing canonical B07D member provenance
 *       ->
 *   B11F2 assessment-context construction
 *
 * Member identities are NOT re-read from the database.
 *
 * The exact B07D scanInput retained through:
 *
 *   B07E -> B07F -> B07G -> B07H
 *
 * is reused as the sole member source.
 *
 * This runner stops immediately after B11F2 context construction.
 *
 * It deliberately does NOT:
 *
 * - directly read or write any database table;
 * - call readHsppSealedEvidenceAssembly() again;
 * - persist corroborated-member assessment;
 * - call applyHsppAssessmentDecision();
 * - mutate evidence trust or validation;
 * - grant operational eligibility;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - disassemble an assembly;
 * - return evidence to the Reservoir;
 * - reconstruct or supersede an assembly;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function runHsppSealedEvidenceAssemblyAssessmentContext(
  input: RunHsppSealedEvidenceAssemblyAssessmentContextInput,
): Promise<RunHsppSealedEvidenceAssemblyAssessmentContextResult> {
  const authority = await runHsppSealedEvidenceAssemblyAuthority({
    supabase: input.supabase,

    organizationId: input.organizationId,

    assemblyId: input.assemblyId,
  });

  /*
   * Fail closed before constructing assessment context.
   *
   * B11F2 independently enforces this invariant as well,
   * but this runner exposes the orchestration boundary explicitly.
   */
  if (
    authority.authorityDecision.state !== "ASSESSMENT_CANDIDATE" ||
    authority.authorityDecision.reason !== "CONSISTENT_ASSEMBLY_CANDIDATE"
  ) {
    throw new Error("HSPP sealed assembly is not an assessment candidate.");
  }

  /*
   * Canonical member provenance path:
   *
   * B07H
   *   -> B07G decisionPersistence
   *   -> B07F decisionRun
   *   -> B07E scanRun
   *   -> B07D read
   *   -> scanInput
   *
   * No second persistence snapshot is loaded here.
   */
  const read = authority.decisionPersistence.decisionRun.scanRun.read;

  const scanInput = read.scanInput;

  /*
   * B7490-07M provenance bridge.
   *
   * This is the exact immutable B11A2 relation loaded by B07D.
   * It is not recomputed, inferred, or re-read here.
   */
  const membershipRelation = read.membershipRelation;

  const members: HsppAssemblyAssessmentMember[] = scanInput.members.map(
    (member) => ({
      organizationId: scanInput.organizationId,

      assemblyId: scanInput.assemblyId,

      evidenceId: member.evidenceId,

      integrityFingerprint: member.integrityFingerprint,

      memberOrdinal: member.memberOrdinal,
    }),
  );

  const assessmentContext = buildHsppAssemblyAssessmentInput({
    authorityDecision: authority.authorityDecision,

    members,
  });

  return {
    runnerVersion: HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION,

    authorityRunnerVersion: authority.runnerVersion,

    assessmentContextVersion: assessmentContext.contextVersion,

    organizationId: authority.organizationId,

    assemblyId: authority.assemblyId,

    authority,

    membershipRelation,

    assessmentContext,
  };
}
