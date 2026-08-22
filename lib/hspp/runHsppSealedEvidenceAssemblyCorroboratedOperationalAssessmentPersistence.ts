import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
  persistHsppCorroboratedOperationalAssessment,
  type HsppPersistedCorroboratedOperationalAssessment,
  type PersistHsppCorroboratedOperationalAssessmentInput,
} from "@/lib/hspp/persistHsppCorroboratedOperationalAssessment";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-operational-assessment-persistence-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic Q6 retry identity.
     *
     * Q7 passes this value unchanged through Q5 and into Q6.
     * Q7 does not generate, normalize or reinterpret it.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistencePreparation =
  Pick<
    PersistHsppCorroboratedOperationalAssessmentInput,
    "authorityDecision" | "assessment" | "assessedAt"
  >;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_RUNNER_VERSION;

    operationalAssessmentRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_RUNNER_VERSION;

    persistenceVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult["targetMemberOrdinal"];

    operationalAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult;

    persistedOperationalAssessment: HsppPersistedCorroboratedOperationalAssessment;
  };

/**
 * Project one completed Q5 result into the exact Q6 persistence input.
 *
 * This preparation preserves the exact authorityDecision and
 * operationalAssessment objects produced by Q5 and passes through the
 * caller-owned assessedAt.
 *
 * It performs no persistence itself.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
  operationalAssessmentRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentResult,
  assessedAt: string,
): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistencePreparation {
  if (
    !operationalAssessmentRun ||
    typeof operationalAssessmentRun !== "object"
  ) {
    throw new Error(
      "B7490-07Q7 requires one completed B7490-07Q5 operational-assessment run.",
    );
  }

  const authorityDecision = operationalAssessmentRun.authorityDecision;

  if (!authorityDecision || typeof authorityDecision !== "object") {
    throw new Error(
      "B7490-07Q7 requires the exact B11G2 authority decision returned by Q5.",
    );
  }

  const assessment = operationalAssessmentRun.operationalAssessment;

  if (!assessment || typeof assessment !== "object") {
    throw new Error(
      "B7490-07Q7 requires the exact Q4 operational assessment returned by Q5.",
    );
  }

  return {
    authorityDecision,

    assessment,

    assessedAt,
  };
}

/**
 * B7490-07Q7 sealed-assembly corroborated operational-assessment
 * persistence runner.
 *
 * This boundary composes exactly:
 *
 *   existing B7490-07Q5 operational-assessment runner
 *       ->
 *   existing B7490-07Q6 controlled persistence primitive
 *
 * The exact authorityDecision and operationalAssessment returned by Q5
 * are handed to Q6 without reconstruction or reinterpretation.
 *
 * assessedAt remains caller-controlled. Q7 passes the same caller value
 * into Q5 and then into Q6. Q6 remains the canonical timestamp
 * normalization and persistence authority.
 *
 * This runner stops immediately after Q6 persistence.
 *
 * It deliberately does NOT:
 *
 * - independently rerun Q4;
 * - rerun Q3;
 * - rerun B11G2;
 * - call applyHsppAssessmentDecision directly;
 * - implement direct Supabase table access;
 * - construct a second persistence path;
 * - create operational-authority storage;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training eligibility;
 * - grant validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - create API, UI, cron, queue, retry or scheduling execution.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
  input: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceResult> {
  const operationalAssessmentRun =
    await runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment({
      supabase: input.supabase,

      organizationId: input.organizationId,

      assemblyId: input.assemblyId,

      assessedAt: input.assessedAt,
    });

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence(
      operationalAssessmentRun,
      input.assessedAt,
    );

  const persistedOperationalAssessment =
    await persistHsppCorroboratedOperationalAssessment({
      supabase: input.supabase,

      authorityDecision: preparation.authorityDecision,

      assessment: preparation.assessment,

      assessedAt: preparation.assessedAt,
    });

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_RUNNER_VERSION,

    operationalAssessmentRunnerVersion: operationalAssessmentRun.runnerVersion,

    persistenceVersion: persistedOperationalAssessment.persistenceVersion,

    organizationId: operationalAssessmentRun.organizationId,

    assemblyId: operationalAssessmentRun.assemblyId,

    targetMemberOrdinal: operationalAssessmentRun.targetMemberOrdinal,

    operationalAssessmentRun,

    persistedOperationalAssessment,
  };
}
