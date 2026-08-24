import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_EVIDENCE_ASSEMBLY_VERSION,
} from "@/lib/hspp/persistHsppEvidenceAssembly";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";
import {
  resolveHsppReconstructionClaimMaterial,
  type HsppReconstructionClaimMaterial,
} from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import {
  readHsppEvidenceAssemblyReconstructionRecovery,
} from "@/lib/hspp/readHsppEvidenceAssemblyReconstructionRecovery";

import {
  readHsppHistoricalReconstructionContexts,
} from "@/lib/hspp/readHsppHistoricalReconstructionContexts";

import {
  readHsppSealedEvidenceAssembly,
} from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import {
  planHsppEvidenceAssemblyReconstructionMembers,
} from "@/lib/hspp/planHsppEvidenceAssemblyReconstructionMembers";

import {
  persistHsppEvidenceAssemblyReconstruction,
} from "@/lib/hspp/persistHsppEvidenceAssemblyReconstruction";

import {
  verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence,
} from "@/lib/hspp/verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence";


export const HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION =
  "hspp-reservoir-reconstruction-runner-v1" as const;


export type HsppReservoirReconstructionState =
  | "NO_RECONSTRUCTION_CANDIDATE"
  | "NO_RECONSTRUCTION_CONTEXT"
  | "RECONSTRUCTION_PERSISTED"
  | "RECONSTRUCTION_RECOVERED";


export type RunHsppReservoirReconstructionInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * This bridge does not call table APIs or reconstruction RPCs
   * directly. It composes the already-closed typed authorities only.
   */
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * Caller-owned immutable Q14h retry identity.
   *
   * The bridge deliberately generates no UUID.
   */
  childAssemblyId: string;

  /**
   * Already-computed B07B discovery + reevaluation snapshot.
   *
   * The bridge never reruns B06B or B07A.
   */
  reevaluationResult: RunHsppReservoirReevaluationResult;

  /**
   * Trusted reconstruction orchestration input.
   *
   * It is deliberately NOT derived from cessation provenance.
   */
  reconstructionPolicyVersion: string;

  /**
   * Trusted reconstruction orchestration input.
   *
   * It is deliberately NOT derived from cessation provenance.
   */
  reconstructionReason: string;
};


export type RunHsppReservoirReconstructionResult = {
  runnerVersion:
    typeof HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION;

  state:
    HsppReservoirReconstructionState;

  organizationId: string;

  childAssemblyId: string;

  /**
   * Preserves the original B07A pair orientation.
   */
  selectedEvidenceIds: string[];

  historicalEvidenceId:
    | string
    | null;

  replacementEvidenceId:
    | string
    | null;

  /**
   * Derived only from the selected B07A/B11A2 decision.
   */
  membershipPolicyVersion:
    | string
    | null;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  parentAssemblyId:
    | string
    | null;

  reconstructionId:
    | string
    | null;

  assemblyState:
    | "OPEN"
    | "SEALED"
    | null;

  /**
   * Preserved only for the Q14ag16A persistence path.
   *
   * Q14ag22B + Q14ag24 recovery is represented by the state itself,
   * so this field is null for RECONSTRUCTION_RECOVERED.
   */
  idempotentRecovery:
    | boolean
    | null;

  memberCount:
    | number
    | null;
};


function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}


function makeBaseResult({
  state,
  organizationId,
  childAssemblyId,
  pair,
  reconstructionPolicyVersion,
  reconstructionReason,
}: {
  state:
    HsppReservoirReconstructionState;

  organizationId: string;

  childAssemblyId: string;

  pair:
    HsppReconstructionClaimMaterial | null;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;
}): RunHsppReservoirReconstructionResult {
  return {
    runnerVersion:
      HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION,

    state,

    organizationId,

    childAssemblyId,

    selectedEvidenceIds:
      pair
        ? [
            ...pair.selectedEvidenceIds,
          ]
        : [],

    historicalEvidenceId:
      pair
        ? pair.historicalCandidate.evidenceId
        : null,

    replacementEvidenceId:
      pair
        ? pair.replacementCandidate.evidenceId
        : null,

    membershipPolicyVersion:
      pair
        ? pair.membershipPolicyVersion
        : null,

    reconstructionPolicyVersion,

    reconstructionReason,

    parentAssemblyId:
      null,

    reconstructionId:
      null,

    assemblyState:
      null,

    idempotentRecovery:
      null,

    memberCount:
      null,
  };
}


/**
 * One bounded exact-child recovery attempt.
 *
 * NOT_FOUND returns null.
 *
 * FOUND is accepted only after:
 *
 * - canonical assembly-version equality;
 * - immutable SEALED H1 loading through Q14ag18A; and
 * - Q14ag24 exact H1 -> recovered-H2 equivalence verification.
 */
async function recoverExactReconstruction({
  supabase,
  organizationId,
  childAssemblyId,
  pair,
  reconstructionPolicyVersion,
  reconstructionReason,
}: {
  supabase: SupabaseClient;

  organizationId: string;

  childAssemblyId: string;

  pair: HsppReconstructionClaimMaterial;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;
}): Promise<RunHsppReservoirReconstructionResult | null> {
  const recoveryRead =
    await readHsppEvidenceAssemblyReconstructionRecovery({
      supabase,

      organizationId,

      childAssemblyId,
    });


  if (
    recoveryRead.state ===
    "NOT_FOUND"
  ) {
    return null;
  }


  const recovery =
    recoveryRead.reconstruction;


  if (
    recovery.assemblyVersion !==
    HSPP_EVIDENCE_ASSEMBLY_VERSION
  ) {
    throw new Error(
      "Recovered reconstruction assembly version does not match the canonical bridge assembly version.",
    );
  }


  const parentAssembly =
    await readHsppSealedEvidenceAssembly({
      supabase,

      organizationId,

      assemblyId:
        recovery.parentAssemblyId,
    });


  const verification =
    verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence({
      organizationId,

      childAssemblyId,

      historicalCandidate:
        pair.historicalCandidate,

      replacementCandidate:
        pair.replacementCandidate,

      membershipPolicyVersion:
        pair.membershipPolicyVersion,

      reconstructionPolicyVersion,

      reconstructionReason,

      parentAssembly,

      recovery,
    });


  return {
    ...makeBaseResult({
      state:
        "RECONSTRUCTION_RECOVERED",

      organizationId,

      childAssemblyId,

      pair,

      reconstructionPolicyVersion,

      reconstructionReason,
    }),

    parentAssemblyId:
      verification.parentAssemblyId,

    reconstructionId:
      recovery.reconstructionId,

    assemblyState:
      verification.assemblyState,

    memberCount:
      verification.memberCount,
  };
}


/**
 * Q14ag26 isolated Reservoir reconstruction execution bridge.
 *
 * This is the first mutation-capable orchestration boundary for the
 * one-for-one H1 -> H2 lifecycle, but it remains completely dormant
 * from API, cron, queue and scheduler wiring.
 *
 * Selection:
 *
 * - consume one already-computed B07B result;
 * - preserve B07A assemblyCandidates order;
 * - choose the first pair whose already-read lifecycle classifications
 *   are exactly HISTORICAL_NOT_CURRENT + NEVER_ASSEMBLED;
 * - derive membershipPolicyVersion only from that pair's existing
 *   membershipDecision.policyVersion.
 *
 * FOUND path:
 *
 * - Q14ag22B exact child recovery;
 * - Q14ag18A immutable SEALED H1 read;
 * - Q14ag24 pure exact-equivalence verification;
 * - return RECONSTRUCTION_RECOVERED;
 * - never call Q14ag16C, Q14ag18B or Q14ag16A.
 *
 * NOT_FOUND path:
 *
 * - Q14ag16C exact actionable historical context;
 * - one bounded recovery recheck if actionable context disappeared;
 * - Q14ag18A immutable SEALED H1 read;
 * - Q14ag18B pure final-member planning;
 * - Q14ag16A/Q14h persistence using the caller-owned child UUID.
 *
 * If Q14ag16A throws after the mutation boundary, perform one exact
 * recovery attempt. This safely resolves an ambiguous successful commit
 * or a same-child race whose child progressed to SEALED before the
 * low-level OPEN-only wrapper could accept the retry result.
 *
 * No loop, polling, rediscovery or reranking is permitted.
 *
 * This bridge does NOT:
 *
 * - run B06B discovery;
 * - run B07A reevaluation;
 * - call B07C1;
 * - call Supabase table APIs directly;
 * - invoke Q14h RPC directly;
 * - generate UUIDs;
 * - seal or assess H2;
 * - mutate evidence trust;
 * - alter Reservoir state;
 * - grant downstream operational authority;
 * - create API, cron, queue or scheduler behavior.
 */
export async function runHsppReservoirReconstruction({
  supabase,
  organizationId: rawOrganizationId,
  childAssemblyId: rawChildAssemblyId,
  reevaluationResult,
  reconstructionPolicyVersion: rawReconstructionPolicyVersion,
  reconstructionReason: rawReconstructionReason,
}: RunHsppReservoirReconstructionInput): Promise<RunHsppReservoirReconstructionResult> {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );


  const childAssemblyId =
    requireNonBlank(
      rawChildAssemblyId,
      "childAssemblyId",
    );


  const reconstructionPolicyVersion =
    requireNonBlank(
      rawReconstructionPolicyVersion,
      "reconstructionPolicyVersion",
    );


  const reconstructionReason =
    requireNonBlank(
      rawReconstructionReason,
      "reconstructionReason",
    );


  if (
    !reevaluationResult ||
    typeof reevaluationResult !==
      "object"
  ) {
    throw new Error(
      "reevaluationResult is required.",
    );
  }


  const pair =
    resolveHsppReconstructionClaimMaterial({
      reevaluationResult,
      organizationId,
    });


  if (!pair) {
    return makeBaseResult({
      state:
        "NO_RECONSTRUCTION_CANDIDATE",

      organizationId,

      childAssemblyId,

      pair:
        null,

      reconstructionPolicyVersion,

      reconstructionReason,
    });
  }


  /*
   * First external read for every selected reconstruction candidate.
   */
  const initialRecovery =
    await recoverExactReconstruction({
      supabase,

      organizationId,

      childAssemblyId,

      pair,

      reconstructionPolicyVersion,

      reconstructionReason,
    });


  if (initialRecovery) {
    return initialRecovery;
  }


  const contextRead =
    await readHsppHistoricalReconstructionContexts({
      supabase,

      organizationId,

      evidenceIds: [
        pair.historicalCandidate.evidenceId,
      ],
    });


  if (
    contextRead.organizationId !==
    organizationId
  ) {
    throw new Error(
      "Historical reconstruction context organization does not match the bridge organization.",
    );
  }


  if (
    contextRead.contexts.length ===
    0
  ) {
    /*
     * One bounded TOCTOU recovery recheck:
     *
     * the initial child lookup may have been NOT_FOUND, after which
     * another same-child caller created H2 and caused Q14ag14 to stop
     * returning the now-reconstructed H1 as actionable context.
     */
    const recoveredAfterContextLoss =
      await recoverExactReconstruction({
        supabase,

        organizationId,

        childAssemblyId,

        pair,

        reconstructionPolicyVersion,

        reconstructionReason,
      });


    if (
      recoveredAfterContextLoss
    ) {
      return recoveredAfterContextLoss;
    }


    return makeBaseResult({
      state:
        "NO_RECONSTRUCTION_CONTEXT",

      organizationId,

      childAssemblyId,

      pair,

      reconstructionPolicyVersion,

      reconstructionReason,
    });
  }


  if (
    contextRead.contexts.length !==
    1
  ) {
    throw new Error(
      "Exactly one actionable historical reconstruction context is required for one-for-one reconstruction.",
    );
  }


  const historicalContext =
    contextRead.contexts[0];


  const parentAssembly =
    await readHsppSealedEvidenceAssembly({
      supabase,

      organizationId,

      assemblyId:
        historicalContext.parentAssemblyId,
    });


  const plan =
    planHsppEvidenceAssemblyReconstructionMembers({
      historicalContext,

      parentAssembly,

      replacementCandidate:
        pair.replacementCandidate,
    });


  try {
    const persistence =
      await persistHsppEvidenceAssemblyReconstruction({
        supabase,

        organizationId,

        parentAssemblyId:
          plan.parentAssemblyId,

        childAssemblyId,

        membershipPolicyVersion:
          pair.membershipPolicyVersion,

        reconstructionPolicyVersion,

        reconstructionReason,

        members:
          plan.members,
      });


    return {
      ...makeBaseResult({
        state:
          "RECONSTRUCTION_PERSISTED",

        organizationId,

        childAssemblyId,

        pair,

        reconstructionPolicyVersion,

        reconstructionReason,
      }),

      parentAssemblyId:
        persistence.parentAssemblyId,

      reconstructionId:
        persistence.reconstructionId,

      assemblyState:
        persistence.assemblyState,

      idempotentRecovery:
        persistence.idempotentRecovery,

      memberCount:
        persistence.persistedMemberCount,
    };
  }
  catch (persistenceError) {
    /*
     * A persistence error can be ambiguous:
     *
     * - another same-child caller may have completed Q14h first;
     * - the successful child may have become SEALED before the
     *   OPEN-only Q14ag16A result validation accepted the retry;
     * - a transport failure may occur after the DB commit.
     *
     * One exact recovery attempt is safe because Q14ag22B is keyed by
     * the caller-owned child UUID and Q14ag24 fails closed unless H1/H2,
     * evidence identities, fingerprints, provenance and policies all
     * equal this exact authorized request.
     *
     * A different-child same-parent race remains NOT_FOUND for this
     * child UUID, so its original Q14h/Q14ag21 error is rethrown.
     */
    const recoveredAfterPersistenceError =
      await recoverExactReconstruction({
        supabase,

        organizationId,

        childAssemblyId,

        pair,

        reconstructionPolicyVersion,

        reconstructionReason,
      });


    if (
      recoveredAfterPersistenceError
    ) {
      return recoveredAfterPersistenceError;
    }


    throw persistenceError;
  }
}
