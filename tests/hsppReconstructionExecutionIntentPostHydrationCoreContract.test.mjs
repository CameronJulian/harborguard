import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runner =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntent.ts",
  );

const source =
  fs.readFileSync(
    runner,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );


function between(
  startToken,
  endToken,
) {
  const start =
    source.indexOf(
      startToken,
    );

  assert.notEqual(
    start,
    -1,
    `missing start token: ${startToken}`,
  );

  const end =
    source.indexOf(
      endToken,
      start + startToken.length,
    );

  assert.notEqual(
    end,
    -1,
    `missing end token: ${endToken}`,
  );

  return source.slice(
    start,
    end,
  );
}


test(
  "Q14ag33E3C2 defines one producer-neutral post-hydration execution core",
  () => {
    const core =
      between(
        "async function runHsppReconstructionPostHydrationExecutionCore({",
        "/**\n * Q14ag31M isolated durable reconstruction-intent execution runner.",
      );

    assert.match(
      core,
      /HsppReconstructionExecutionIntentCore/,
    );

    assert.match(
      core,
      /replacementCandidate/,
    );

    assert.doesNotMatch(
      core,
      /discoveryPolicyVersion/,
    );

    assert.doesNotMatch(
      core,
      /selectionSource/,
    );

    assert.doesNotMatch(
      core,
      /pairSchedulingVersion/,
    );

    assert.doesNotMatch(
      core,
      /reservoirEligibilityPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E3C2 common core owns context planning and persistence",
  () => {
    const core =
      between(
        "async function runHsppReconstructionPostHydrationExecutionCore({",
        "/**\n * Q14ag31M isolated durable reconstruction-intent execution runner.",
      );

    assert.match(
      core,
      /readHsppHistoricalReconstructionContexts\s*\(/,
    );

    assert.match(
      core,
      /readHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.match(
      core,
      /planHsppEvidenceAssemblyReconstructionMembers\s*\(/,
    );

    assert.match(
      core,
      /persistHsppEvidenceAssemblyReconstruction\s*\(/,
    );
  },
);


test(
  "Q14ag33E3C2 common core owns both bounded recovery fallbacks through neutral recovery",
  () => {
    const core =
      between(
        "async function runHsppReconstructionPostHydrationExecutionCore({",
        "/**\n * Q14ag31M isolated durable reconstruction-intent execution runner.",
      );

    assert.match(
      core,
      /const recoveredAfterContextLoss/,
    );

    assert.match(
      core,
      /const recoveredAfterPersistenceError/,
    );

    const recoveryCalls =
      core.match(
        /recoverDurableIntentCore\s*\(/g,
      ) ?? [];

    assert.equal(
      recoveryCalls.length,
      2,
    );

    assert.doesNotMatch(
      core,
      /recoverDurableIntent\s*\(/,
    );
  },
);


test(
  "Q14ag33E3C2 common core owns no legacy result decoration",
  () => {
    const core =
      between(
        "async function runHsppReconstructionPostHydrationExecutionCore({",
        "/**\n * Q14ag31M isolated durable reconstruction-intent execution runner.",
      );

    assert.doesNotMatch(
      core,
      /makeCommonResult\s*\(/,
    );

    assert.match(
      core,
      /state:\s*"RECONSTRUCTION_PERSISTED"/,
    );

    assert.match(
      core,
      /state:\s*"RECONSTRUCTION_RECOVERED"/,
    );
  },
);


test(
  "Q14ag33E3C2 leaves producer-specific B07B hydration outside the common core",
  () => {
    const coreStart =
      source.indexOf(
        "async function runHsppReconstructionPostHydrationExecutionCore({",
      );

    const mainStart =
      source.indexOf(
        "export async function runHsppReconstructionExecutionIntent",
      );

    const core =
      source.slice(
        coreStart,
        mainStart,
      );

    const main =
      source.slice(
        mainStart,
      );

    assert.doesNotMatch(
      core,
      /readHsppReconstructionIntentReplacementCandidate/,
    );

    assert.match(
      main,
      /readHsppReconstructionIntentReplacementCandidate\s*\(/,
    );

    assert.match(
      main,
      /discoveryPolicyVersion:\s*intent\.discoveryPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E3C2 legacy runner delegates hydrated candidate into common core",
  () => {
    const main =
      source.slice(
        source.indexOf(
          "export async function runHsppReconstructionExecutionIntent",
        ),
      );

    assert.match(
      main,
      /await\s+runHsppReconstructionPostHydrationExecutionCore\s*\(/,
    );

    assert.match(
      main,
      /toExecutionIntentCore\s*\(\s*intent/,
    );

    assert.match(
      main,
      /replacementCandidate:\s*replacementRead\.candidate/,
    );

    assert.match(
      main,
      /\.\.\.makeCommonResult\s*\(\s*intent/,
    );

    assert.match(
      main,
      /\.\.\.execution/,
    );
  },
);


test(
  "Q14ag33E3C2 preserves recovery before hydration before common execution",
  () => {
    const main =
      source.slice(
        source.indexOf(
          "export async function runHsppReconstructionExecutionIntent",
        ),
      );

    const recovery =
      main.indexOf(
        "const initialRecovery",
      );

    const hydration =
      main.indexOf(
        "const replacementRead",
      );

    const execution =
      main.indexOf(
        "const execution",
      );

    assert.ok(
      recovery >= 0,
    );

    assert.ok(
      hydration > recovery,
    );

    assert.ok(
      execution > hydration,
    );
  },
);


test(
  "Q14ag33E3C2 does not activate scheduled-pair execution",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppScheduledPairReconstructionIntentReplacementCandidate/,
    );

    assert.doesNotMatch(
      source,
      /"SCHEDULED_PAIR"/,
    );
  },
);