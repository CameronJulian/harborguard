import type { HsppReservoirCandidate } from "@/lib/hspp/readHsppReservoirCandidates";
import type { HsppReconstructionClaimMaterial } from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";
import type { RunHsppReservoirReevaluationResult } from "@/lib/hspp/runHsppReservoirReevaluation";

export const HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION =
  "hspp-reservoir-lifecycle-route-v1" as const;

export type HsppReservoirLifecycleRouteState =
  | "NO_LIFECYCLE_WRITE"
  | "INITIAL_ASSEMBLY"
  | "RECONSTRUCTION";

export type ResolveHsppReservoirLifecycleRouteInput = {
  reevaluationResult: RunHsppReservoirReevaluationResult;
  reconstructionMaterial: HsppReconstructionClaimMaterial | null;
};

export type HsppReservoirLifecycleRoute = {
  routeVersion: typeof HSPP_RESERVOIR_LIFECYCLE_ROUTE_VERSION;
  state: HsppReservoirLifecycleRouteState;
};

function requireCandidate(
  candidates: HsppReservoirCandidate[],
  evidenceId: string,
): HsppReservoirCandidate {
  const candidate =
    candidates.find(
      (item) =>
        item.evidenceId ===
        evidenceId,
    ) ?? null;

  if (!candidate) {
    throw new Error(
      `Selected Reservoir evidence ${evidenceId} was not found in discovery candidates.`,
    );
  }

  return candidate;
}

/**
 * Pure lifecycle routing for one already-computed B07B snapshot.
 *
 * Existing authorized reconstruction material has precedence so activating
 * initial-H1 persistence cannot pre-empt the already-live H1 -> H2 repair
 * path.
 *
 * Only when no reconstruction material exists may the first deterministic
 * B07B assembly candidate enter B07C2, and then only when both identities
 * remain NEVER_ASSEMBLED.
 *
 * This resolver performs no database read/write, RPC, Reservoir discovery,
 * B07B reevaluation, persistence, reconstruction, sealing or assessment.
 */
export function resolveHsppReservoirLifecycleRoute({
  reevaluationResult: result,
  reconstructionMaterial,
}: ResolveHsppReservoirLifecycleRouteInput): HsppReservoirLifecycleRoute {
  if (reconstructionMaterial) {
    if (
      reconstructionMaterial.organizationId !==
      result.organizationId
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
    result.reevaluation
      .assemblyCandidates;

  if (
    result.reevaluation.state !==
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
      result.discovery.candidates,
      selected.firstEvidenceId,
    );

  const secondCandidate =
    requireCandidate(
      result.discovery.candidates,
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
