import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence.ts",
    "utf8",
  );


test(
  "Q14ag24 exposes one explicit pure recovery-equivalence verifier",
  () => {
    assert.match(
      source,
      /HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION/,
    );

    assert.match(
      source,
      /hspp-evidence-assembly-reconstruction-recovery-equivalence-v1/,
    );

    assert.match(
      source,
      /export function verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence/,
    );

    assert.match(
      source,
      /state:\s*"EXACT_RECOVERY"/,
    );
  },
);


test(
  "Q14ag24 consumes selected historical replacement parent and FOUND recovery facts only",
  () => {
    for (
      const signal of [
        "historicalCandidate: HsppReservoirCandidate",
        "replacementCandidate: HsppReservoirCandidate",
        "membershipPolicyVersion: string",
        "reconstructionPolicyVersion: string",
        "reconstructionReason: string",
        "parentAssembly: ReadHsppSealedEvidenceAssemblyResult",
        "recovery: HsppEvidenceAssemblyReconstructionRecoverySnapshot",
      ]
    ) {
      assert.ok(
        source.includes(
          signal,
        ),
        `missing Q14ag24 input: ${signal}`,
      );
    }
  },
);


test(
  "Q14ag24 requires the precise historical plus never-assembled lifecycle route",
  () => {
    assert.match(
      source,
      /"HISTORICAL_NOT_CURRENT"/,
    );

    assert.match(
      source,
      /"NEVER_ASSEMBLED"/,
    );

    assert.match(
      source,
      /hasAssemblyMembership/,
    );

    assert.match(
      source,
      /reservoirDecision\?\.eligible/,
    );
  },
);


test(
  "Q14ag24 binds selected evidence to persisted immutable identity and SHA256",
  () => {
    assert.match(
      source,
      /operationalRead\?\.evidence/,
    );

    assert.match(
      source,
      /persisted evidence identity does not match/,
    );

    assert.match(
      source,
      /SHA256_PATTERN/,
    );

    assert.match(
      source,
      /evidence organization does not match/,
    );
  },
);


test(
  "Q14ag24 binds recovery to exact organization child parent policies and reason",
  () => {
    assert.match(
      source,
      /recovery\.organizationId\s*!==\s*organizationId/,
    );

    assert.match(
      source,
      /recovery\.childAssemblyId\s*!==\s*childAssemblyId/,
    );

    assert.match(
      source,
      /recovery\.parentAssemblyId\s*!==\s*parentAssemblyId/,
    );

    assert.match(
      source,
      /recovery\.membershipPolicyVersion\s*!==\s*membershipPolicyVersion/,
    );

    assert.match(
      source,
      /recovery\.reconstructionPolicyVersion\s*!==\s*reconstructionPolicyVersion/,
    );

    assert.match(
      source,
      /recovery\.reconstructionReason\s*!==\s*reconstructionReason/,
    );
  },
);


test(
  "Q14ag24 derives exact one-for-one H1 to H2 equivalence without persisted delta identities",
  () => {
    assert.match(
      source,
      /expectedRetained\s*=\s*parentMembers\.filter/,
    );

    assert.match(
      source,
      /recovery\.removedChangeCount\s*!==\s*1/,
    );

    assert.match(
      source,
      /recovery\.addedChangeCount\s*!==\s*1/,
    );

    assert.match(
      source,
      /recovery\.originalMemberCount\s*!==\s*1/,
    );

    assert.match(
      source,
      /recovery\.persistedMemberCount\s*!==/,
    );

    assert.doesNotMatch(
      source,
      /reconstructionChanges|changeRows|removedRows|addedRows/,
    );
  },
);


test(
  "Q14ag24 binds every retained H2 member to exact H1 membership fingerprint and order",
  () => {
    assert.match(
      source,
      /recovered\.membershipKind\s*!==\s*"RETAINED"/,
    );

    assert.match(
      source,
      /recovered\.sourceMembershipId\s*!==\s*expected\.membershipId/,
    );

    assert.match(
      source,
      /recovered\.evidenceId\s*!==\s*expected\.evidenceId/,
    );

    assert.match(
      source,
      /recovered\.integrityFingerprint\s*!==\s*expected\.integrityFingerprint/,
    );

    assert.match(
      source,
      /recovered\.memberOrdinal\s*!==\s*expectedOrdinal/,
    );
  },
);


test(
  "Q14ag24 proves the one ORIGINAL H2 member is exactly the authorized replacement",
  () => {
    assert.match(
      source,
      /recoveredReplacement\.membershipKind\s*!==\s*"ORIGINAL"/,
    );

    assert.match(
      source,
      /recoveredReplacement\.sourceMembershipId\s*!==\s*null/,
    );

    assert.match(
      source,
      /recoveredReplacement\.evidenceId\s*!==\s*replacement\.evidenceId/,
    );

    assert.match(
      source,
      /recoveredReplacement\.integrityFingerprint\s*!==\s*replacement\.integrityFingerprint/,
    );
  },
);


test(
  "Q14ag24 proves historical evidence is omitted from recovered H2",
  () => {
    assert.match(
      source,
      /recovery\.members\.some/,
    );

    assert.match(
      source,
      /member\.evidenceId\s*===\s*historical\.evidenceId/,
    );
  },
);


test(
  "Q14ag24 performs no reads RPC persistence planning UUID or scheduling",
  () => {
    const forbidden = [
      ".rpc(",
      ".from(",
      "readHsppEvidenceAssemblyReconstructionRecovery(",
      "readHsppHistoricalReconstructionContexts(",
      "readHsppSealedEvidenceAssembly(",
      "planHsppEvidenceAssemblyReconstructionMembers(",
      "persistHsppEvidenceAssemblyReconstruction(",
      "runHsppReservoirReevaluation(",
      "randomUUID(",
      "crypto.randomUUID(",
      "NextRequest",
      "NextResponse",
    ];

    for (const value of forbidden) {
      assert.equal(
        source.includes(
          value,
        ),
        false,
        `forbidden Q14ag24 authority present: ${value}`,
      );
    }
  },
);
