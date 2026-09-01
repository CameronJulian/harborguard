import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createHsppReservoirDownstreamSnapshotFromB07B,
  type HsppReservoirDownstreamCandidate,
  type HsppReservoirDownstreamSnapshot,
} from "@/lib/hspp/createHsppReservoirDownstreamSnapshot";

import {
  persistHsppEvidenceAssembly,
  type PersistedHsppEvidenceAssembly,
} from "@/lib/hspp/persistHsppEvidenceAssembly";

import type { RunHsppReservoirReevaluationResult } from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION =
  "hspp-reservoir-assembly-handoff-v1" as const;


export type HsppReservoirAssemblyHandoffState =
  "NO_ASSEMBLY_CANDIDATE" | "ASSEMBLY_PERSISTED";


/**
 * Existing B07B-compatible input retained so the current recovery route
 * remains byte-for-byte unchanged in this persistence-neutralization commit.
 */
export type PersistHsppReservoirAssemblyCandidateInput = {
  supabase:
    SupabaseClient;

  lifeguardResult:
    RunHsppReservoirReevaluationResult;
};


/**
 * Producer-neutral B07C2 input.
 */
export type PersistHsppReservoirAssemblyCandidateFromSnapshotInput = {
  supabase:
    SupabaseClient;

  snapshot:
    HsppReservoirDownstreamSnapshot;
};


export type PersistHsppReservoirAssemblyCandidateResult = {
  handoffVersion:
    typeof HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION;

  state:
    HsppReservoirAssemblyHandoffState;

  organizationId:
    string;

  selectedEvidenceIds:
    string[];

  assembly:
    PersistedHsppEvidenceAssembly | null;
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
    );


  if (!candidate) {
    /*
     * Preserve the established B07C2 diagnostic while the legacy B07B
     * compatibility wrapper remains active.
     */
    throw new Error(
      `Selected Reservoir evidence ${evidenceId} was not found in discovery candidates.`,
    );
  }


  return candidate;
}


function requireInitialAssemblyLifecycle(
  candidate:
    HsppReservoirDownstreamCandidate,
): void {
  if (
    candidate.membershipClassification !==
    "NEVER_ASSEMBLED"
  ) {
    throw new Error(
      `Selected Reservoir evidence ${candidate.evidenceId} cannot use initial assembly persistence because lifecycle classification ${candidate.membershipClassification} is not NEVER_ASSEMBLED.`,
    );
  }
}


function requirePersistenceMember(
  candidate:
    HsppReservoirDownstreamCandidate,
): {
  evidenceId:
    string;

  integrityFingerprint:
    string;
} {
  const evidence =
    candidate.operationalRead
      .evidence;


  if (!evidence) {
    throw new Error(
      `Selected Reservoir evidence ${candidate.evidenceId} has no persisted evidence.`,
    );
  }


  if (
    evidence.id !==
    candidate.evidenceId
  ) {
    throw new Error(
      `Selected Reservoir evidence identity mismatch for ${candidate.evidenceId}.`,
    );
  }


  const integrityFingerprint =
    typeof evidence.integrityFingerprint ===
    "string"
      ? evidence.integrityFingerprint.trim()
      : "";


  if (!integrityFingerprint) {
    throw new Error(
      `Selected Reservoir evidence ${candidate.evidenceId} has no immutable integrity fingerprint.`,
    );
  }


  return {
    evidenceId:
      candidate.evidenceId,

    integrityFingerprint,
  };
}


/**
 * B7490-07C2 producer-neutral deterministic semantic handoff.
 *
 * The caller provides an already-computed Reservoir downstream snapshot.
 *
 * B07C2:
 *
 * - selects only the first deterministic eligible pair;
 * - resolves both selected identities from the already-revalidated
 *   snapshot candidates;
 * - requires BOTH selected candidates to be NEVER_ASSEMBLED before the
 *   generic initial-assembly persistence path may execute;
 * - resolves both immutable evidence fingerprints from those same
 *   candidates;
 * - preserves the exact B11A2 membership policy provenance; and
 * - invokes B07C1 persistence at most once.
 *
 * HISTORICAL_NOT_CURRENT is deliberately not treated as fresh evidence.
 * That lifecycle state is reserved for replacement/reconstruction
 * authority. CURRENT_EFFECTIVE also fails closed if it reaches this write
 * boundary unexpectedly.
 *
 * B07C2 deliberately does NOT:
 *
 * - run Reservoir discovery;
 * - rerun Lifeguard reevaluation;
 * - call evaluateHsppAssemblyMembership;
 * - select or persist multiple assemblies;
 * - reread evidence from the database;
 * - seal an evidence assembly;
 * - scan an evidence assembly;
 * - create an assembly decision;
 * - modify evidence trust;
 * - apply HSPP assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, cursor, or scheduling behavior.
 */
export async function persistHsppReservoirAssemblyCandidateFromSnapshot(
  input:
    PersistHsppReservoirAssemblyCandidateFromSnapshotInput,
): Promise<PersistHsppReservoirAssemblyCandidateResult> {
  const snapshot =
    input.snapshot;


  const organizationId =
    snapshot.organizationId
      .trim();


  if (!organizationId) {
    throw new Error(
      "snapshot.organizationId is required.",
    );
  }


  const selected =
    snapshot.reevaluation
      .assemblyCandidates[0] ??
    null;


  if (
    snapshot.reevaluation.state !==
      "ASSEMBLY_CANDIDATE" ||
    !selected
  ) {
    return {
      handoffVersion:
        HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,

      state:
        "NO_ASSEMBLY_CANDIDATE",

      organizationId,

      selectedEvidenceIds:
        [],

      assembly:
        null,
    };
  }


  if (
    !selected.membershipDecision
      .eligible
  ) {
    throw new Error(
      "Selected Lifeguard assembly candidate is not membership eligible.",
    );
  }


  const firstCandidate = requireCandidate(
    snapshot.candidates,
    selected.firstEvidenceId,
  );


  const secondCandidate = requireCandidate(
    snapshot.candidates,
    selected.secondEvidenceId,
  );


  requireInitialAssemblyLifecycle(firstCandidate);
  requireInitialAssemblyLifecycle(secondCandidate);


  const members = [
    requirePersistenceMember(
      firstCandidate,
    ),

    requirePersistenceMember(
      secondCandidate,
    ),
  ];


  const assembly = await persistHsppEvidenceAssembly({
    supabase: input.supabase,

    organizationId,

    membershipPolicyVersion: selected.membershipDecision.policyVersion,

    members,

    membershipRelation: {
      firstEvidenceId: selected.firstEvidenceId,

      secondEvidenceId: selected.secondEvidenceId,

      membershipEligible: selected.membershipDecision.eligible,

      membershipPolicyVersion: selected.membershipDecision.policyVersion,

      membershipReason: selected.membershipDecision.reason,

      distanceMeters: selected.membershipDecision.distanceMeters,

      timeDeltaMs: selected.membershipDecision.timeDeltaMs,
    },
  });


  return {
    handoffVersion:
      HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,

    state:
      "ASSEMBLY_PERSISTED",

    organizationId,

    selectedEvidenceIds:
      members.map(
        (member) =>
          member.evidenceId,
      ),

    assembly,
  };
}


/**
 * Existing B07B compatibility wrapper.
 *
 * The top-level B07B runner organization is still validated before
 * adaptation because the neutral B07B adapter intentionally derives its
 * organization from discovery provenance.
 */
export async function persistHsppReservoirAssemblyCandidate(
  input:
    PersistHsppReservoirAssemblyCandidateInput,
): Promise<PersistHsppReservoirAssemblyCandidateResult> {
  const result =
    input.lifeguardResult;


  const organizationId =
    result.organizationId
      .trim();


  if (!organizationId) {
    throw new Error(
      "lifeguardResult.organizationId is required.",
    );
  }


  if (
    result.discovery
      .organizationId !==
    organizationId
  ) {
    throw new Error(
      "Lifeguard discovery organization does not match the runner organization.",
    );
  }


  return persistHsppReservoirAssemblyCandidateFromSnapshot({
    supabase:
      input.supabase,

    snapshot:
      createHsppReservoirDownstreamSnapshotFromB07B(
        result,
      ),
  });
}