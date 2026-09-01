import {
  createHsppReservoirDownstreamSnapshotFromB07B,
  type HsppReservoirDownstreamCandidate,
  type HsppReservoirDownstreamSnapshot,
} from "@/lib/hspp/createHsppReservoirDownstreamSnapshot";

import type { HsppReconstructionClaimMaterial } from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import type { RunHsppReservoirReevaluationResult } from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION =
  "hspp-reservoir-lifecycle-route-v1" as const;


export type HsppReservoirLifecycleRouteState =
  | "NO_LIFECYCLE_WRITE"
  | "INITIAL_ASSEMBLY"
  | "RECONSTRUCTION";


/**
 * Legacy B07B-compatible input retained so the current recovery route does
 * not need to change in this lifecycle-neutralization commit.
 */
export type ResolveHsppReservoirLifecycleRouteInput = {
  reevaluationResult:
    RunHsppReservoirReevaluationResult;

  reconstructionMaterial:
    HsppReconstructionClaimMaterial | null;
};


export type ResolveHsppReservoirLifecycleRouteFromSnapshotInput = {
  snapshot:
    HsppReservoirDownstreamSnapshot;

  reconstructionMaterial:
    HsppReconstructionClaimMaterial | null;
};


export type HsppReservoirLifecycleRoute = {
  routeVersion:
    typeof HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION;

  state:
    HsppReservoirLifecycleRouteState;
};


function requireCandidate(
  candidates:
    readonly HsppReservoirDownstreamCandidate[],

  evidenceId:
    string,
): HsppReservoirDownstreamCandidate {
  const candidate =
    candidates.find(
      (item) =>
        item.evidenceId ===
        evidenceId,
    ) ?? null;


  if (!candidate) {
    /*
     * Preserve the established fail-closed diagnostic while the legacy
     * B07B wrapper remains an active compatibility boundary.
     */
    throw new Error(
      `Selected Reservoir evidence ${evidenceId} was not found in discovery candidates.`,
    );
  }


  return candidate;
}


/**
 * Pure producer-neutral lifecycle decision core.
 *
 * The caller must provide one already-computed semantic Reservoir snapshot.
 * The core does not know whether that snapshot originated from B07B
 * discovery scheduling or from the global scheduled-pair path.
 *
 * Existing authorized reconstruction material retains precedence so
 * initial-H1 persistence cannot pre-empt the existing H1 -> H2 repair path.
 *
 * Only when no reconstruction authority exists may the first deterministic
 * assembly candidate route to initial persistence, and then only when both
 * selected identities remain NEVER_ASSEMBLED.
 *
 * This resolver performs no:
 *
 * - database read or write;
 * - RPC;
 * - Reservoir discovery;
 * - pair scheduling;
 * - reevaluation;
 * - cursor mutation;
 * - persistence;
 * - reconstruction execution;
 * - sealing;
 * - assessment;
 * - downstream authority transition.
 */
export function resolveHsppReservoirLifecycleRouteFromSnapshot({
  snapshot,
  reconstructionMaterial,
}: ResolveHsppReservoirLifecycleRouteFromSnapshotInput): HsppReservoirLifecycleRoute {
  if (reconstructionMaterial) {
    if (
      reconstructionMaterial.organizationId !==
      snapshot.organizationId
    ) {
      throw new Error(
        "Reconstruction material organization does not match the B07B snapshot organization.",
      );
    }


    return {
      routeVersion:
        HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION,

      state:
        "RECONSTRUCTION",
    };
  }


  const assemblyCandidates =
    snapshot.reevaluation
      .assemblyCandidates;


  if (
    snapshot.reevaluation.state !==
    "ASSEMBLY_CANDIDATE"
  ) {
    if (
      assemblyCandidates.length !==
      0
    ) {
      throw new Error(
        "B07B non-candidate state cannot expose assembly candidates.",
      );
    }


    return {
      routeVersion:
        HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION,

      state:
        "NO_LIFECYCLE_WRITE",
    };
  }


  const selected =
    assemblyCandidates[0] ??
    null;


  if (!selected) {
    throw new Error(
      "B07B ASSEMBLY_CANDIDATE state must expose at least one assembly candidate.",
    );
  }


  if (
    selected.membershipDecision
      .eligible !==
    true
  ) {
    throw new Error(
      "Selected B07B assembly candidate must preserve an eligible membership decision.",
    );
  }


  const firstCandidate =
    requireCandidate(
      snapshot.candidates,
      selected.firstEvidenceId,
    );


  const secondCandidate =
    requireCandidate(
      snapshot.candidates,
      selected.secondEvidenceId,
    );


  if (
    firstCandidate
      .membershipClassification ===
      "NEVER_ASSEMBLED" &&
    secondCandidate
      .membershipClassification ===
      "NEVER_ASSEMBLED"
  ) {
    return {
      routeVersion:
        HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION,

      state:
        "INITIAL_ASSEMBLY",
    };
  }


  return {
    routeVersion:
      HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION,

    state:
      "NO_LIFECYCLE_WRITE",
  };
}


/**
 * Existing B07B compatibility wrapper.
 *
 * Keeping this public signature unchanged preserves the current recovery
 * route byte-for-byte while all lifecycle decisions execute through the
 * producer-neutral semantic core.
 */
export function resolveHsppReservoirLifecycleRoute({
  reevaluationResult,
  reconstructionMaterial,
}: ResolveHsppReservoirLifecycleRouteInput): HsppReservoirLifecycleRoute {
  return resolveHsppReservoirLifecycleRouteFromSnapshot({
    snapshot:
      createHsppReservoirDownstreamSnapshotFromB07B(
        reevaluationResult,
      ),

    reconstructionMaterial,
  });
}