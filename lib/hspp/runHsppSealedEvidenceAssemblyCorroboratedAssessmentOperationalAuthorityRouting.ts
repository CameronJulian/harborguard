import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult,
  type HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  evaluateHsppCorroboratedOperationalAuthority,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "@/lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-assessment-operational-authority-routing-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic persistence retry identity.
     *
     * Q10 passes this value unchanged into Q9.
     *
     * Q10 does not generate, normalize or reinterpret wall-clock time.
     */
    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedPreparation =
  {
    branch: "MEMBER_CORROBORATION_DENIED";

    persistenceRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligiblePreparation =
  {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    persistenceRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult;

    persistedAssessment: HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult["persistenceResult"];
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingPreparation =
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedPreparation
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligiblePreparation;

type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingCommonResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION;

    persistenceRoutingRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: number;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult =
  HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_DENIED";

    persistenceRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult;

    /*
     * The denied Q9 branch has already persisted the canonical
     * fail-closed B11F5 result through Q8.
     *
     * B11G2 is intentionally not invoked.
     */
    authorityDecision: null;
  };

export type HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult =
  HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    persistenceRoutingRun: HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult;

    authorityPolicyVersion: typeof HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION;

    authorityDecision: HsppCorroboratedOperationalAuthorityDecision;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult =
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityDeniedResult
  | HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityEligibleResult;

/**
 * Project one completed Q9 result into the next safe lifecycle action.
 *
 * Q10 does not reinterpret B11F4, B11F5, B11F6 or Q8.
 *
 * DENIED:
 *
 *   Q9 has already persisted the fail-closed Q8 result.
 *   The branch is terminal here and B11G2 must not run.
 *
 * ELIGIBLE:
 *
 *   Q9.persistenceResult is the exact B11F6 persisted assessment.
 *   That exact object is exposed for B11G2 without cloning,
 *   normalization, reconstruction or pre-filtering.
 *
 * B11G2 remains the sole operational-authority candidacy policy.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
  persistenceRoutingRun: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRoutingResult,
): HsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingPreparation {
  if (!persistenceRoutingRun || typeof persistenceRoutingRun !== "object") {
    throw new Error(
      "B7490-07Q10 requires one completed B7490-07Q9 persistence-routing run.",
    );
  }

  if (persistenceRoutingRun.branch === "MEMBER_CORROBORATION_DENIED") {
    if (
      !persistenceRoutingRun.persistenceResult ||
      typeof persistenceRoutingRun.persistenceResult !== "object"
    ) {
      throw new Error(
        "B7490-07Q10 requires the exact denied Q8 persistence result returned by Q9.",
      );
    }

    return {
      branch: "MEMBER_CORROBORATION_DENIED",

      persistenceRoutingRun,
    };
  }

  if (persistenceRoutingRun.branch === "MEMBER_CORROBORATION_ELIGIBLE") {
    const persistedAssessment = persistenceRoutingRun.persistenceResult;

    if (!persistedAssessment || typeof persistedAssessment !== "object") {
      throw new Error(
        "B7490-07Q10 requires the exact positive B11F6 persistence result returned by Q9.",
      );
    }

    return {
      branch: "MEMBER_CORROBORATION_ELIGIBLE",

      persistenceRoutingRun,

      persistedAssessment,
    };
  }

  throw new Error(
    "B7490-07Q10 requires one canonical Q9 persistence-routing branch.",
  );
}

/**
 * B7490-07Q10 branch-aware Q9 -> B11G2 continuation runner.
 *
 * This boundary composes exactly:
 *
 *   Q9 once
 *
 * then:
 *
 *   MEMBER_CORROBORATION_DENIED
 *      -> return the complete Q9/Q8 provenance
 *      -> STOP
 *
 *   MEMBER_CORROBORATION_ELIGIBLE
 *      -> pass Q9's exact B11F6 persistenceResult to B11G2 once
 *      -> return the complete Q9 + B11G2 provenance
 *      -> STOP
 *
 * Calling existing Q3 here would be incorrect because Q3 invokes Q2,
 * which would rerun B07P and B11F6 after Q9 already completed them.
 *
 * Q10 deliberately does NOT:
 *
 * - call Q2;
 * - call Q3;
 * - call B07P directly;
 * - call B11F6 directly;
 * - call Q8 directly;
 * - rerun B11F4 or B11F5;
 * - call applyHsppAssessmentDecision directly;
 * - perform direct database access;
 * - send the denied branch into B11G2;
 * - call Q4, Q5, Q6 or Q7;
 * - persist a B11G2 decision;
 * - create authority-candidate storage;
 * - grant operational authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - create API, UI, cron, queue, retry or scheduling execution.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
  input: RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRoutingResult> {
  const persistenceRoutingRun =
    await runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting(
      {
        supabase: input.supabase,

        organizationId: input.organizationId,

        assemblyId: input.assemblyId,

        assessedAt: input.assessedAt,
      },
    );

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting(
      persistenceRoutingRun,
    );

  if (preparation.branch === "MEMBER_CORROBORATION_DENIED") {
    return {
      runnerVersion:
        HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,

      persistenceRoutingRunnerVersion:
        preparation.persistenceRoutingRun.runnerVersion,

      organizationId: preparation.persistenceRoutingRun.organizationId,

      assemblyId: preparation.persistenceRoutingRun.assemblyId,

      targetMemberOrdinal:
        preparation.persistenceRoutingRun.targetMemberOrdinal,

      branch: "MEMBER_CORROBORATION_DENIED",

      persistenceRoutingRun: preparation.persistenceRoutingRun,

      authorityDecision: null,
    };
  }

  const authorityDecision = evaluateHsppCorroboratedOperationalAuthority(
    preparation.persistedAssessment,
  );

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_ASSESSMENT_OPERATIONAL_AUTHORITY_ROUTING_RUNNER_VERSION,

    persistenceRoutingRunnerVersion:
      preparation.persistenceRoutingRun.runnerVersion,

    organizationId: preparation.persistenceRoutingRun.organizationId,

    assemblyId: preparation.persistenceRoutingRun.assemblyId,

    targetMemberOrdinal: preparation.persistenceRoutingRun.targetMemberOrdinal,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    persistenceRoutingRun: preparation.persistenceRoutingRun,

    authorityPolicyVersion: authorityDecision.policyVersion,

    authorityDecision,
  };
}
