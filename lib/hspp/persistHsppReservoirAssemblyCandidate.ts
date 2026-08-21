import type { SupabaseClient } from "@supabase/supabase-js";

import {
  persistHsppEvidenceAssembly,
  type PersistedHsppEvidenceAssembly,
} from "@/lib/hspp/persistHsppEvidenceAssembly";

import type { HsppReservoirCandidate } from "@/lib/hspp/readHsppReservoirCandidates";

import type { RunHsppReservoirReevaluationResult } from "@/lib/hspp/runHsppReservoirReevaluation";

export const HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION =
  "hspp-reservoir-assembly-handoff-v1" as const;

export type HsppReservoirAssemblyHandoffState =
  "NO_ASSEMBLY_CANDIDATE" | "ASSEMBLY_PERSISTED";

export type PersistHsppReservoirAssemblyCandidateInput = {
  supabase: SupabaseClient;

  lifeguardResult: RunHsppReservoirReevaluationResult;
};

export type PersistHsppReservoirAssemblyCandidateResult = {
  handoffVersion: typeof HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION;

  state: HsppReservoirAssemblyHandoffState;

  organizationId: string;

  selectedEvidenceIds: string[];

  assembly: PersistedHsppEvidenceAssembly | null;
};

function requireCandidate(
  candidates: HsppReservoirCandidate[],
  evidenceId: string,
): HsppReservoirCandidate {
  const candidate = candidates.find((item) => item.evidenceId === evidenceId);

  if (!candidate) {
    throw new Error(
      `Selected Reservoir evidence ${evidenceId} was not found in discovery candidates.`,
    );
  }

  return candidate;
}

function requirePersistenceMember(candidate: HsppReservoirCandidate): {
  evidenceId: string;
  integrityFingerprint: string;
} {
  const evidence = candidate.operationalRead.evidence;

  if (!evidence) {
    throw new Error(
      `Selected Reservoir evidence ${candidate.evidenceId} has no persisted evidence.`,
    );
  }

  if (evidence.id !== candidate.evidenceId) {
    throw new Error(
      `Selected Reservoir evidence identity mismatch for ${candidate.evidenceId}.`,
    );
  }

  const integrityFingerprint =
    typeof evidence.integrityFingerprint === "string"
      ? evidence.integrityFingerprint.trim()
      : "";

  if (!integrityFingerprint) {
    throw new Error(
      `Selected Reservoir evidence ${candidate.evidenceId} has no immutable integrity fingerprint.`,
    );
  }

  return {
    evidenceId: candidate.evidenceId,
    integrityFingerprint,
  };
}

/**
 * B7490-07C2 deterministic Lifeguard -> assembly handoff.
 *
 * This boundary consumes an already-computed B07B Lifeguard result.
 *
 * When B07A produced one or more ASSEMBLY_CANDIDATE pairs, B07C2:
 *
 * - selects only the first deterministic eligible pair;
 * - resolves both immutable evidence fingerprints from the existing
 *   B06B discovery result;
 * - preserves the exact B11A2 membership policy provenance; and
 * - invokes B07C1 persistence at most once.
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
 * - create API, cron, retry, or scheduling behavior.
 */
export async function persistHsppReservoirAssemblyCandidate(
  input: PersistHsppReservoirAssemblyCandidateInput,
): Promise<PersistHsppReservoirAssemblyCandidateResult> {
  const result = input.lifeguardResult;

  const organizationId = result.organizationId.trim();

  if (!organizationId) {
    throw new Error("lifeguardResult.organizationId is required.");
  }

  if (result.discovery.organizationId !== organizationId) {
    throw new Error(
      "Lifeguard discovery organization does not match the runner organization.",
    );
  }

  const selected = result.reevaluation.assemblyCandidates[0] ?? null;

  if (result.reevaluation.state !== "ASSEMBLY_CANDIDATE" || !selected) {
    return {
      handoffVersion: HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,

      state: "NO_ASSEMBLY_CANDIDATE",

      organizationId,

      selectedEvidenceIds: [],

      assembly: null,
    };
  }

  if (!selected.membershipDecision.eligible) {
    throw new Error(
      "Selected Lifeguard assembly candidate is not membership eligible.",
    );
  }

  const firstCandidate = requireCandidate(
    result.discovery.candidates,
    selected.firstEvidenceId,
  );

  const secondCandidate = requireCandidate(
    result.discovery.candidates,
    selected.secondEvidenceId,
  );

  const members = [
    requirePersistenceMember(firstCandidate),
    requirePersistenceMember(secondCandidate),
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
    handoffVersion: HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION,

    state: "ASSEMBLY_PERSISTED",

    organizationId,

    selectedEvidenceIds: members.map((member) => member.evidenceId),

    assembly,
  };
}
