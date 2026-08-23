import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/planHsppEvidenceAssemblyReconstructionMembers.ts",
    "utf8",
  );


test(
  "Q14ag18B exposes one explicit pure reconstruction member-planner contract",
  () => {
    assert.match(
      source,
      /HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION/,
    );

    assert.match(
      source,
      /hspp-evidence-assembly-reconstruction-member-planner-v1/,
    );

    assert.match(
      source,
      /export function planHsppEvidenceAssemblyReconstructionMembers/,
    );
  },
);


test(
  "Q14ag18B consumes existing typed context parent and replacement facts only",
  () => {
    assert.match(
      source,
      /HsppHistoricalReconstructionContext/,
    );

    assert.match(
      source,
      /ReadHsppSealedEvidenceAssemblyResult/,
    );

    assert.match(
      source,
      /HsppSealedAssemblyVerifiedMemberMetadata/,
    );

    assert.match(
      source,
      /HsppReservoirCandidate/,
    );

    assert.match(
      source,
      /historicalContext:/,
    );

    assert.match(
      source,
      /parentAssembly:/,
    );

    assert.match(
      source,
      /replacementCandidate:/,
    );
  },
);


test(
  "Q14ag18B binds Q14ag14 context to the exact immutable H1 membership identity",
  () => {
    assert.match(
      source,
      /historicalMembershipId/,
    );

    assert.match(
      source,
      /member\.membershipId\s*===\s*historicalMembershipId/,
    );

    assert.match(
      source,
      /historicalMember\.evidenceId\s*!==\s*historicalEvidenceId/,
    );

    assert.match(
      source,
      /historicalMember\.integrityFingerprint\s*!==\s*historicalFingerprint/,
    );

    assert.match(
      source,
      /historicalMember\.memberOrdinal\s*!==\s*historicalParentOrdinal/,
    );
  },
);


test(
  "Q14ag18B requires an independently eligible NEVER_ASSEMBLED replacement",
  () => {
    assert.match(
      source,
      /membershipClassification\s*!==\s*"NEVER_ASSEMBLED"/,
    );

    assert.match(
      source,
      /hasAssemblyMembership\s*!==\s*false/,
    );

    assert.match(
      source,
      /reservoirDecision\?\.eligible\s*!==\s*true/,
    );

    assert.match(
      source,
      /replacementCandidate\.operationalRead\?\.evidence/,
    );

    assert.match(
      source,
      /replacementEvidence\.id/,
    );

    assert.match(
      source,
      /replacementEvidence\.integrityFingerprint/,
    );
  },
);


test(
  "Q14ag18B removes exactly the ceased historical membership and preserves unaffected parent order",
  () => {
    assert.match(
      source,
      /validated\.sort\(/,
    );

    assert.match(
      source,
      /first\.memberOrdinal\s*-\s*second\.memberOrdinal/,
    );

    assert.match(
      source,
      /parentMembers\.filter\(/,
    );

    assert.match(
      source,
      /member\.membershipId\s*!==\s*historicalMembershipId/,
    );

    assert.match(
      source,
      /\.\.\.retainedMembers\.map\(/,
    );

    assert.match(
      source,
      /evidenceId:\s*replacementEvidenceId/,
    );
  },
);


test(
  "Q14ag18B returns only the final desired evidence and immutable fingerprint member set",
  () => {
    assert.match(
      source,
      /export type HsppEvidenceAssemblyReconstructionPlannedMember = \{[\s\S]*?evidenceId:\s*string;[\s\S]*?integrityFingerprint:\s*string;/,
    );

    assert.match(
      source,
      /members:\s*HsppEvidenceAssemblyReconstructionPlannedMember\[\]/,
    );

    assert.doesNotMatch(
      source,
      /childAssemblyId\s*:/,
    );

    assert.doesNotMatch(
      source,
      /membershipPolicyVersion\s*:/,
    );

    assert.doesNotMatch(
      source,
      /reconstructionPolicyVersion\s*:/,
    );

    assert.doesNotMatch(
      source,
      /reconstructionReason\s*:/,
    );
  },
);


test(
  "Q14ag18B performs no reads RPC persistence UUID generation or scheduling",
  () => {
    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppHistoricalReconstructionContexts\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppReservoirCandidates\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\brunHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\brandomUUID\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bNextRequest\b|\bNextResponse\b/,
    );
  },
);


test(
  "Q14ag18B does not assign final child ordinals or database provenance",
  () => {
    const plannedMemberType =
      source.match(
        /export type HsppEvidenceAssemblyReconstructionPlannedMember = \{([\s\S]*?)\};/,
      );

    assert.ok(
      plannedMemberType,
    );

    assert.doesNotMatch(
      plannedMemberType[1],
      /memberOrdinal/,
    );

    assert.doesNotMatch(
      plannedMemberType[1],
      /membershipId/,
    );

    assert.doesNotMatch(
      plannedMemberType[1],
      /membershipKind/,
    );

    assert.doesNotMatch(
      plannedMemberType[1],
      /sourceMembershipId/,
    );
  },
);
