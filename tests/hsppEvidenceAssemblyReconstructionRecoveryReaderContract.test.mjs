import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/readHsppEvidenceAssemblyReconstructionRecovery.ts",
    "utf8",
  );


test(
  "Q14ag22B exposes one explicitly versioned child-keyed recovery reader",
  () => {
    assert.match(
      source,
      /HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION/,
    );

    assert.match(
      source,
      /hspp-evidence-assembly-reconstruction-recovery-reader-v1/,
    );

    assert.match(
      source,
      /export async function readHsppEvidenceAssemblyReconstructionRecovery/,
    );
  },
);


test(
  "Q14ag22B calls only the Q14ag22A recovery RPC",
  () => {
    assert.match(
      source,
      /read_hspp_evidence_assembly_reconstruction_recovery/,
    );

    const rpcCalls =
      source.match(
        /\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      rpcCalls.length,
      1,
    );

    assert.match(
      source,
      /p_organization_id:\s*organizationId/,
    );

    assert.match(
      source,
      /p_child_assembly_id:\s*childAssemblyId/,
    );
  },
);


test(
  "Q14ag22B makes zero rows an explicit NOT_FOUND result",
  () => {
    assert.match(
      source,
      /data\.length\s*===\s*0/,
    );

    assert.match(
      source,
      /state:\s*"NOT_FOUND"/,
    );

    assert.match(
      source,
      /reconstruction:\s*null/,
    );
  },
);


test(
  "Q14ag22B requires exactly one row for FOUND recovery",
  () => {
    assert.match(
      source,
      /data\.length\s*!==\s*1/,
    );

    assert.match(
      source,
      /state:\s*"FOUND"/,
    );
  },
);


test(
  "Q14ag22B exposes canonical typed recovery identity and lifecycle fields",
  () => {
    for (
      const signal of [
        "reconstructionId: string",
        "organizationId: string",
        "parentAssemblyId: string",
        "childAssemblyId: string",
        "assemblyVersion: string",
        "membershipPolicyVersion: string",
        "reconstructionPolicyVersion: string",
        "reconstructionReason: string",
        '"OPEN"',
        '"SEALED"',
        "persistedMemberCount: number",
        "retainedMemberCount: number",
        "originalMemberCount: number",
        "removedChangeCount: number",
        "addedChangeCount: number",
      ]
    ) {
      assert.ok(
        source.includes(
          signal,
        ),
        `missing typed recovery signal: ${signal}`,
      );
    }
  },
);


test(
  "Q14ag22B validates exact immutable child membership metadata",
  () => {
    assert.match(
      source,
      /membershipId:\s*string/,
    );

    assert.match(
      source,
      /evidenceId:\s*string/,
    );

    assert.match(
      source,
      /integrityFingerprint:\s*string/,
    );

    assert.match(
      source,
      /memberOrdinal:\s*number/,
    );

    assert.match(
      source,
      /"RETAINED"[\s\S]*"ORIGINAL"/,
    );

    assert.match(
      source,
      /sourceMembershipId/,
    );

    assert.match(
      source,
      /SHA256_PATTERN/,
    );

    assert.match(
      source,
      /duplicate evidence identity/,
    );

    assert.match(
      source,
      /contiguous ordinal order/,
    );
  },
);


test(
  "Q14ag22B supports recovery after OPEN child progresses to SEALED",
  () => {
    assert.match(
      source,
      /assemblyState\s*!==\s*"OPEN"[\s\S]*assemblyState\s*!==\s*"SEALED"/,
    );

    assert.match(
      source,
      /assemblyState\s*===\s*"OPEN"/,
    );

    assert.match(
      source,
      /requireIsoTimestamp\s*\([\s\S]*row\.sealed_at/,
    );
  },
);


test(
  "Q14ag22B validates persisted member and delta count consistency",
  () => {
    assert.match(
      source,
      /persistedMemberCount\s*!==\s*members\.length/,
    );

    assert.match(
      source,
      /retainedMemberCount\s*\+\s*originalMemberCount\s*!==\s*persistedMemberCount/,
    );

    assert.match(
      source,
      /actualRetainedCount\s*!==\s*retainedMemberCount/,
    );

    assert.match(
      source,
      /actualOriginalCount\s*!==\s*originalMemberCount/,
    );

    assert.match(
      source,
      /removedChangeCount\s*\+\s*addedChangeCount\s*<\s*1/,
    );
  },
);


test(
  "Q14ag22B performs no persistence discovery planning UUID or scheduling",
  () => {
    for (
      const forbidden of [
        "persistHsppEvidenceAssemblyReconstruction(",
        "persist_hspp_evidence_assembly_reconstruction",
        "readHsppHistoricalReconstructionContexts(",
        "read_hspp_historical_reconstruction_contexts",
        "readHsppSealedEvidenceAssembly(",
        "runHsppReservoirReevaluation(",
        "planHsppEvidenceAssemblyReconstructionMembers(",
        "randomUUID(",
        "crypto.randomUUID(",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden Q14ag22B authority present: ${forbidden}`,
      );
    }

    assert.doesNotMatch(
      source,
      /\bNextRequest\b|\bNextResponse\b/,
    );
  },
);
