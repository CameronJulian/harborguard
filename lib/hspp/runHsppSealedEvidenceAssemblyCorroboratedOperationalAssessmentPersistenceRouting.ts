import type { SupabaseClient } from "@supabase/supabase-js";

import type { HsppAssessmentExecutionLeaseContext } from "@/lib/hspp/hsppAssessmentExecutionLeaseContext";

import {
  HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION,
  runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting,
  type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult,
  type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult,
  type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult,
} from "@/lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
  persistHsppCorroboratedOperationalAssessment,
  type HsppPersistedCorroboratedOperationalAssessment,
  type PersistHsppCorroboratedOperationalAssessmentInput,
} from "@/lib/hspp/persistHsppCorroboratedOperationalAssessment";

export const HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION =
  "hspp-sealed-assembly-corroborated-operational-assessment-persistence-routing-runner-v1" as const;

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingInput =
  {
    supabase: SupabaseClient;

    organizationId: string;

    assemblyId: string;

    /*
     * Caller-owned deterministic persistence retry identity.
     *
     * Q12 passes this value unchanged through Q11 and into Q6.
     *
     * Q12 does not generate, normalize or reinterpret time.
     */
    assessedAt: string;

    /**
     * Optional recovery execution ownership.
     *
     * Q12 does not acquire, renew or release this lease. When supplied it is
     * passed unchanged through Q11 and into the controlled Q6 persistence
     * boundary.
     */
    executionLease?: HsppAssessmentExecutionLeaseContext;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingDeniedPreparation =
  {
    branch: "MEMBER_CORROBORATION_DENIED";

    operationalAssessmentRoutingRun: HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingEligiblePreparation =
  {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    operationalAssessmentRoutingRun: HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

    authorityDecision: PersistHsppCorroboratedOperationalAssessmentInput["authorityDecision"];

    assessment: PersistHsppCorroboratedOperationalAssessmentInput["assessment"];

    assessedAt: string;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingPreparation =
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingDeniedPreparation
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingEligiblePreparation;

type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingCommonResult =
  {
    runnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION;

    operationalAssessmentRoutingRunnerVersion: typeof HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_ROUTING_RUNNER_VERSION;

    organizationId: string;

    assemblyId: string;

    targetMemberOrdinal: number;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingDeniedResult =
  HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_DENIED";

    operationalAssessmentRoutingRun: HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingDeniedResult;

    persistenceVersion: null;

    persistenceResult: null;
  };

export type HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingEligibleResult =
  HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingCommonResult & {
    branch: "MEMBER_CORROBORATION_ELIGIBLE";

    operationalAssessmentRoutingRun: HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingEligibleResult;

    persistenceVersion: typeof HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION;

    persistenceResult: HsppPersistedCorroboratedOperationalAssessment;
  };

export type RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult =
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingDeniedResult
  | HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingEligibleResult;

/**
 * Project one completed Q11 run into the next safe persistence action.
 *
 * Q11 denied:
 *
 *   The earlier Q9 denied branch has already persisted the canonical
 *   fail-closed member assessment through Q8.
 *
 *   No Q4 operational assessment exists and Q6 must not execute.
 *
 * Q11 eligible:
 *
 *   Q11 exposes the exact B11G2 authority decision and exact Q4
 *   operational assessment.
 *
 *   Q12 preserves those exact object references and the caller-owned
 *   assessedAt for Q6.
 *
 * Q12 does not inspect or reconstruct the Q4 assessment.
 *
 * Q6 remains the sole controlled persistence validator for the exact
 * successful Q4 operational assessment.
 */
export function prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
  operationalAssessmentRoutingRun: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRoutingResult,
  assessedAt: string,
): HsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingPreparation {
  if (
    !operationalAssessmentRoutingRun ||
    typeof operationalAssessmentRoutingRun !== "object"
  ) {
    throw new Error(
      "B7490-07Q12 requires one completed B7490-07Q11 operational-assessment routing run.",
    );
  }

  if (
    operationalAssessmentRoutingRun.branch === "MEMBER_CORROBORATION_DENIED"
  ) {
    if (
      operationalAssessmentRoutingRun.authorityDecision !== null ||
      operationalAssessmentRoutingRun.operationalAssessment !== null
    ) {
      throw new Error(
        "B7490-07Q12 requires the exact terminal denied Q11 result.",
      );
    }

    return {
      branch: "MEMBER_CORROBORATION_DENIED",

      operationalAssessmentRoutingRun,
    };
  }

  if (
    operationalAssessmentRoutingRun.branch === "MEMBER_CORROBORATION_ELIGIBLE"
  ) {
    const authorityDecision = operationalAssessmentRoutingRun.authorityDecision;

    const assessment = operationalAssessmentRoutingRun.operationalAssessment;

    if (!authorityDecision || typeof authorityDecision !== "object") {
      throw new Error(
        "B7490-07Q12 requires the exact B11G2 authority decision returned by Q11.",
      );
    }

    if (!assessment || typeof assessment !== "object") {
      throw new Error(
        "B7490-07Q12 requires the exact Q4 operational assessment returned by Q11.",
      );
    }

    return {
      branch: "MEMBER_CORROBORATION_ELIGIBLE",

      operationalAssessmentRoutingRun,

      authorityDecision,

      assessment,

      assessedAt,
    };
  }

  throw new Error("B7490-07Q12 requires one canonical Q11 routing branch.");
}

/**
 * B7490-07Q12 branch-aware Q11 -> Q6 persistence runner.
 *
 * This boundary composes exactly:
 *
 *   Q11 once
 *
 * then:
 *
 *   MEMBER_CORROBORATION_DENIED
 *      -> retain complete terminal Q11/Q10/Q9/Q8 provenance
 *      -> Q6 is not invoked
 *      -> STOP
 *
 *   MEMBER_CORROBORATION_ELIGIBLE
 *      -> pass Q11's exact authorityDecision to Q6
 *      -> pass Q11's exact operationalAssessment to Q6
 *      -> pass the same caller-owned assessedAt to Q6
 *      -> Q6 exactly once
 *      -> retain complete Q11 + Q6 provenance
 *      -> STOP
 *
 * The canonical Q11 eligible runtime arrives through Q9's exact B11F6
 * persisted result. B11F6 already enforces the invariants B11G2 needs
 * for candidacy and clears upstream operational eligibility before
 * B11G2 evaluates the result.
 *
 * Q12 deliberately does NOT:
 *
 * - create a negative Q4 persistence primitive;
 * - invent OPERATIONAL_AUTHORITY_REVOKED;
 * - call Q7 or Q5;
 * - call Q10, Q9, Q3 or Q2 directly;
 * - call B07P, B11F6, Q8 or B11G2 directly;
 * - call Q4 directly;
 * - call applyHsppAssessmentDecision directly;
 * - perform direct database access;
 * - create a second persistence implementation;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - assign VERIFIED trust;
 * - establish physical-world truth;
 * - create API, UI, cron, queue, retry or scheduling execution.
 */
export async function runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
  input: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingInput,
): Promise<RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult> {
  const operationalAssessmentRoutingRun =
    await runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting(
      {
        supabase: input.supabase,

        organizationId: input.organizationId,

        assemblyId: input.assemblyId,

        assessedAt: input.assessedAt,

        executionLease: input.executionLease,
      },
    );

  const preparation =
    prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
      operationalAssessmentRoutingRun,
      input.assessedAt,
    );

  if (preparation.branch === "MEMBER_CORROBORATION_DENIED") {
    return {
      runnerVersion:
        HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

      operationalAssessmentRoutingRunnerVersion:
        preparation.operationalAssessmentRoutingRun.runnerVersion,

      organizationId:
        preparation.operationalAssessmentRoutingRun.organizationId,

      assemblyId: preparation.operationalAssessmentRoutingRun.assemblyId,

      targetMemberOrdinal:
        preparation.operationalAssessmentRoutingRun.targetMemberOrdinal,

      branch: "MEMBER_CORROBORATION_DENIED",

      operationalAssessmentRoutingRun:
        preparation.operationalAssessmentRoutingRun,

      persistenceVersion: null,

      persistenceResult: null,
    };
  }

  const persistenceResult = await persistHsppCorroboratedOperationalAssessment({
    supabase: input.supabase,

    authorityDecision: preparation.authorityDecision,

    assessment: preparation.assessment,

    assessedAt: preparation.assessedAt,

    executionLease: input.executionLease,
  });

  return {
    runnerVersion:
      HSPP_SEALED_ASSEMBLY_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_ROUTING_RUNNER_VERSION,

    operationalAssessmentRoutingRunnerVersion:
      preparation.operationalAssessmentRoutingRun.runnerVersion,

    organizationId: preparation.operationalAssessmentRoutingRun.organizationId,

    assemblyId: preparation.operationalAssessmentRoutingRun.assemblyId,

    targetMemberOrdinal:
      preparation.operationalAssessmentRoutingRun.targetMemberOrdinal,

    branch: "MEMBER_CORROBORATION_ELIGIBLE",

    operationalAssessmentRoutingRun:
      preparation.operationalAssessmentRoutingRun,

    persistenceVersion: persistenceResult.persistenceVersion,

    persistenceResult,
  };
}
