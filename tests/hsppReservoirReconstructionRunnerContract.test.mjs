import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppReservoirReconstruction.ts",
    "utf8",
  );


test(
  "Q14ag26 exposes one explicitly versioned reconstruction runner",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_RECONSTRUCTION_RUNNER_VERSION/,
    );

    assert.match(
      source,
      /hspp-reservoir-reconstruction-runner-v1/,
    );

    assert.match(
      source,
      /export async function runHsppReservoirReconstruction/,
    );
  },
);


test(
  "Q14ag26 result surface distinguishes no-candidate no-context persisted and recovered",
  () => {
    for (
      const state of [
        "NO_RECONSTRUCTION_CANDIDATE",
        "NO_RECONSTRUCTION_CONTEXT",
        "RECONSTRUCTION_PERSISTED",
        "RECONSTRUCTION_RECOVERED",
      ]
    ) {
      assert.ok(
        source.includes(
          `"${state}"`,
        ),
        `missing state ${state}`,
      );
    }

    assert.match(
      source,
      /idempotentRecovery/,
    );

    assert.match(
      source,
      /memberCount/,
    );
  },
);


test(
  "Q14ag26 accepts only orchestration-owned inputs and no caller parent membership policy or assembly version",
  () => {
    for (
      const signal of [
        "supabase: SupabaseClient",
        "organizationId: string",
        "childAssemblyId: string",
        "reevaluationResult: RunHsppReservoirReevaluationResult",
        "reconstructionPolicyVersion: string",
        "reconstructionReason: string",
      ]
    ) {
      assert.ok(
        source.includes(
          signal,
        ),
        `missing bridge input ${signal}`,
      );
    }

    const inputSection =
      source.slice(
        source.indexOf(
          "export type RunHsppReservoirReconstructionInput",
        ),
        source.indexOf(
          "export type RunHsppReservoirReconstructionResult",
        ),
      );

    assert.doesNotMatch(
      inputSection,
      /parentAssemblyId/,
    );

    assert.doesNotMatch(
      inputSection,
      /membershipPolicyVersion/,
    );

    assert.doesNotMatch(
      inputSection,
      /assemblyVersion/,
    );
  },
);


test(
  "Q14ag26 scans B07A assembly candidates in existing order without reranking",
  () => {
    assert.match(
      source,
      /for\s*\(\s*const selected of\s*assemblyCandidates\s*\)/,
    );

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
      /selected\.membershipDecision\.policyVersion/,
    );

    assert.doesNotMatch(
      source,
      /assemblyCandidates\.sort\s*\(/,
    );
  },
);


test(
  "Q14ag26 resolves B07A pair identities only from the existing B07B discovery candidates",
  () => {
    assert.match(
      source,
      /result\?\.discovery\?\.candidates/,
    );

    assert.match(
      source,
      /requireCandidate\s*\(/,
    );

    assert.match(
      source,
      /must resolve to exactly one discovery candidate/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppReservoirCandidates\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );
  },
);


test(
  "Q14ag26 uses Q14ag22B as the first external read for a selected reconstruction pair",
  () => {
    assert.match(
      source,
      /const initialRecovery\s*=\s*await recoverExactReconstruction\s*\(/,
    );

    assert.match(
      source,
      /if\s*\(\s*initialRecovery\s*\)\s*\{\s*return initialRecovery;/,
    );

    const mainStart =
      source.indexOf(
        "export async function runHsppReservoirReconstruction",
      );

    const mainSource =
      source.slice(
        mainStart,
      );

    const initialRecoveryIndex =
      mainSource.indexOf(
        "const initialRecovery",
      );

    const contextIndex =
      mainSource.indexOf(
        "const contextRead",
      );

    const persistenceIndex =
      mainSource.indexOf(
        "const persistence",
      );

    assert.ok(
      initialRecoveryIndex >= 0,
    );

    assert.ok(
      contextIndex >
        initialRecoveryIndex,
    );

    assert.ok(
      persistenceIndex >
        contextIndex,
    );
  },
);


test(
  "Q14ag26 FOUND recovery enforces canonical assembly version then SEALED H1 plus Q14ag24 equivalence",
  () => {
    assert.match(
      source,
      /recovery\.assemblyVersion\s*!==\s*HSPP_EVIDENCE_ASSEMBLY_VERSION/,
    );

    assert.match(
      source,
      /await readHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.match(
      source,
      /verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence\s*\(/,
    );

    assert.match(
      source,
      /state:\s*"RECONSTRUCTION_RECOVERED"/,
    );
  },
);


test(
  "Q14ag26 performs one bounded same-child recovery recheck when Q14ag16C context disappears",
  () => {
    assert.match(
      source,
      /contextRead\.contexts\.length\s*===\s*0/,
    );

    assert.match(
      source,
      /const recoveredAfterContextLoss\s*=\s*await recoverExactReconstruction\s*\(/,
    );

    assert.match(
      source,
      /state:\s*"NO_RECONSTRUCTION_CONTEXT"/,
    );

    assert.doesNotMatch(
      source,
      /\bwhile\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bsetInterval\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bsetTimeout\s*\(/,
    );
  },
);


test(
  "Q14ag26 invokes first-run context parent planner and persistence authorities without caller assembly version",
  () => {
    assert.equal(
      (
        source.match(
          /await\s+readHsppHistoricalReconstructionContexts\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    assert.match(
      source,
      /planHsppEvidenceAssemblyReconstructionMembers\s*\(/,
    );

    assert.equal(
      (
        source.match(
          /await\s+persistHsppEvidenceAssemblyReconstruction\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    const persistenceCall =
      source.slice(
        source.indexOf(
          "await persistHsppEvidenceAssemblyReconstruction",
        ),
        source.indexOf(
          "return {",
          source.indexOf(
            "await persistHsppEvidenceAssemblyReconstruction",
          ),
        ),
      );

    assert.doesNotMatch(
      persistenceCall,
      /assemblyVersion/,
    );

    assert.match(
      persistenceCall,
      /childAssemblyId/,
    );

    assert.match(
      persistenceCall,
      /membershipPolicyVersion:\s*pair\.membershipPolicyVersion/,
    );
  },
);


test(
  "Q14ag26 preserves Q14ag16A idempotentRecovery on successful persistence",
  () => {
    assert.match(
      source,
      /state:\s*"RECONSTRUCTION_PERSISTED"/,
    );

    assert.match(
      source,
      /idempotentRecovery:\s*persistence\.idempotentRecovery/,
    );
  },
);


test(
  "Q14ag26 resolves ambiguous persistence failure with one exact child recovery fallback",
  () => {
    assert.match(
      source,
      /catch\s*\(\s*persistenceError\s*\)/,
    );

    assert.match(
      source,
      /const recoveredAfterPersistenceError\s*=\s*await recoverExactReconstruction\s*\(/,
    );

    assert.match(
      source,
      /if\s*\(\s*recoveredAfterPersistenceError\s*\)\s*\{\s*return recoveredAfterPersistenceError;/,
    );

    assert.match(
      source,
      /throw persistenceError;/,
    );
  },
);


test(
  "Q14ag26 never directly crosses database B07C1 UUID downstream or scheduling boundaries",
  () => {
    const forbidden = [
      ".rpc(",
      ".from(",
      "readHsppReservoirCandidates(",
      "evaluateHsppReservoirReevaluation(",
      "evaluateHsppAssemblyMembership(",
      "persistHsppEvidenceAssembly(",
      "persistHsppReservoirAssemblyCandidate(",
      "randomUUID(",
      "crypto.randomUUID(",
      "NextRequest",
      "NextResponse",
      "schedule(",
      "sealHspp",
      "applyHspp",
    ];

    for (
      const value of
        forbidden
    ) {
      assert.equal(
        source.includes(
          value,
        ),
        false,
        `forbidden Q14ag26 authority present: ${value}`,
      );
    }
  },
);
