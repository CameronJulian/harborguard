import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  fileURLToPath,
} from "node:url";


const here =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );


const sourcePath =
  path.resolve(
    here,
    "../lib/hspp/runHsppReconstructionExecutionIntent.ts",
  );


const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );


const executableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/.*$/gm,
      "",
    );


test(
  "Q14ag31M defines one isolated durable reconstruction intent runner",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-execution-intent-runner-v1/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+runHsppReconstructionExecutionIntent\s*\(/,
    );

    assert.match(
      source,
      /intent:\s*HsppReconstructionExecutionIntent/,
    );
  },
);


test(
  "Q14ag31M does not discover or claim durable intents",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\breadHsppReconstructionExecutionIntents\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bclaimHsppReconstructionExecutionIntent\s*\(/,
    );
  },
);


test(
  "Q14ag31M recovery-preflights the canonical durable child before replacement hydration and common execution",
  () => {
    const mainStart =
      executableSource.indexOf(
        "export async function runHsppReconstructionExecutionIntent",
      );

    assert.ok(
      mainStart >=
      0,
    );

    const main =
      executableSource.slice(
        mainStart,
      );

    const initialRecoveryIndex =
      main.indexOf(
        "const initialRecovery",
      );

    const replacementIndex =
      main.indexOf(
        "const replacementRead",
      );

    const executionIndex =
      main.indexOf(
        "const execution",
      );

    assert.ok(
      initialRecoveryIndex >=
      0,
    );

    assert.ok(
      replacementIndex >
      initialRecoveryIndex,
    );

    assert.ok(
      executionIndex >
      replacementIndex,
    );

    assert.doesNotMatch(
      main.slice(
        0,
        executionIndex,
      ),
      /\breadHsppHistoricalReconstructionContexts\s*\(/,
    );

    assert.doesNotMatch(
      main.slice(
        0,
        executionIndex,
      ),
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
    );
  },
);


test(
  "Q14ag31M FOUND recovery uses immutable durable identity rather than B07B candidate state",
  () => {
    const helperStart =
      executableSource.indexOf(
        "async function recoverDurableIntentCore",
      );

    const helperEnd =
      executableSource.indexOf(
        "async function recoverDurableIntent({",
        helperStart,
      );

    assert.ok(
      helperStart >=
      0,
    );

    assert.ok(
      helperEnd >
      helperStart,
    );

    const helper =
      executableSource.slice(
        helperStart,
        helperEnd,
      );

    assert.match(
      helper,
      /readHsppEvidenceAssemblyReconstructionRecovery\s*\(/,
    );

    assert.match(
      helper,
      /readHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.match(
      helper,
      /verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /\breadHsppReconstructionIntentReplacementCandidate\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /\breadHsppHistoricalReconstructionContexts\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /\bplanHsppEvidenceAssemblyReconstructionMembers\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /\bverifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence\s*\(/,
    );
  },
);


test(
  "Q14ag31M binds FOUND recovery to durable immutable identities and provenance",
  () => {
    for (
      const required of [
        "historicalEvidenceId:",
        "historicalEvidenceIntegrityFingerprint:",
        "replacementEvidenceId:",
        "replacementEvidenceIntegrityFingerprint:",
        "membershipPolicyVersion:",
        "reconstructionPolicyVersion:",
        "reconstructionReason:",
      ]
    ) {
      assert.equal(
        executableSource.includes(
          required,
        ),
        true,
        `missing durable recovery binding: ${required}`,
      );
    }

    assert.match(
      executableSource,
      /recovery\.assemblyVersion\s*!==\s*HSPP_EVIDENCE_ASSEMBLY_VERSION/,
    );
  },
);


test(
  "Q14ag31M fails closed on RECONSTRUCTION_PERSISTED plus NOT_FOUND",
  () => {
    assert.match(
      executableSource,
      /intent\.persistenceState\s*===\s*"RECONSTRUCTION_PERSISTED"[\s\S]{0,700}?canonical child recovery returned NOT_FOUND/,
    );
  },
);


test(
  "Q14ag31M hydrates only the exact durable replacement after NOT_FOUND",
  () => {
    assert.match(
      executableSource,
      /readHsppReconstructionIntentReplacementCandidate\s*\(\s*\{[\s\S]*?replacementEvidenceId\s*:\s*intent\.replacementEvidenceId[\s\S]*?replacementEvidenceIntegrityFingerprint\s*:\s*intent\.replacementEvidenceIntegrityFingerprint[\s\S]*?discoveryPolicyVersion\s*:\s*intent\.discoveryPolicyVersion/,
    );
  },
);


test(
  "Q14ag31M requests historical context for exactly the durable historical evidence id",
  () => {
    assert.match(
      executableSource,
      /readHsppHistoricalReconstructionContexts\s*\(\s*\{[\s\S]{0,1200}?evidenceIds\s*:\s*\[\s*intent\.historicalEvidenceId\s*,?\s*\]/,
    );

    assert.match(
      executableSource,
      /historicalContext\.evidenceId\s*!==\s*intent\.historicalEvidenceId/,
    );

    assert.match(
      executableSource,
      /historicalContext\.evidenceIntegrityFingerprint\s*!==\s*intent\.historicalEvidenceIntegrityFingerprint/,
    );
  },
);


test(
  "Q14ag31M performs one bounded recovery recheck when actionable context disappears",
  () => {
    assert.match(
      executableSource,
      /contextRead\.contexts\.length\s*===\s*0/,
    );

    assert.match(
      executableSource,
      /const\s+recoveredAfterContextLoss\s*=\s*await\s+recoverDurableIntentCore\s*\(/,
    );
  },
);


test(
  "Q14ag31M composes SEALED H1, planner and Q14h with the canonical child and durable provenance",
  () => {
    assert.match(
      executableSource,
      /await\s+readHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.match(
      executableSource,
      /planHsppEvidenceAssemblyReconstructionMembers\s*\(/,
    );

    assert.match(
      executableSource,
      /persistHsppEvidenceAssemblyReconstruction\s*\(\s*\{[\s\S]*?childAssemblyId\s*:\s*intent\.childAssemblyId[\s\S]*?membershipPolicyVersion\s*:\s*intent\.membershipPolicyVersion[\s\S]*?reconstructionPolicyVersion\s*:\s*intent\.reconstructionPolicyVersion[\s\S]*?reconstructionReason\s*:\s*intent\.reconstructionReason[\s]*,[\s\S]*?members\s*:\s*plan\.members/,
    );
  },
);


test(
  "Q14ag31M preserves one ambiguous persistence recovery fallback",
  () => {
    assert.match(
      executableSource,
      /catch\s*\(\s*persistenceError\s*\)/,
    );

    assert.match(
      executableSource,
      /const\s+recoveredAfterPersistenceError\s*=\s*await\s+recoverDurableIntentCore\s*\(/,
    );

    assert.match(
      executableSource,
      /throw\s+persistenceError/,
    );
  },
);


test(
  "Q14ag31M has exactly two successful result states",
  () => {
    assert.match(
      source,
      /"RECONSTRUCTION_RECOVERED"/,
    );

    assert.match(
      source,
      /"RECONSTRUCTION_PERSISTED"/,
    );

    assert.doesNotMatch(
      executableSource,
      /"NO_RECONSTRUCTION_CANDIDATE"/,
    );

    assert.doesNotMatch(
      executableSource,
      /"NO_RECONSTRUCTION_CONTEXT"/,
    );
  },
);


test(
  "Q14ag31M introduces no mutable discovery, direct DB authority, UUID generation or activation wiring",
  () => {
    const forbiddenCalls = [
      "readHsppReservoirCandidates",
      "evaluateHsppReservoirReevaluation",
      "runHsppReservoirReevaluation",
      "runHsppReservoirReconstruction",
      "persistHsppReservoirAssemblyCandidate",
      "claimHsppReconstructionExecutionIntent",
      "readHsppReconstructionExecutionIntents",
      "randomUUID",
    ];

    for (const name of forbiddenCalls) {
      assert.doesNotMatch(
        executableSource,
        new RegExp(
          `\\b${name}\\s*\\(`,
        ),
        `forbidden authority call: ${name}`,
      );
    }

    assert.doesNotMatch(
      executableSource,
      /\.rpc\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\.(?:insert|update|delete|upsert)\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bcrypto\.randomUUID\s*\(/,
    );
  },
);