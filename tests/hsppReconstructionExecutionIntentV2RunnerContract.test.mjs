import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const wrapperPath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntentV2.ts",
  );

const legacyRunnerPath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntent.ts",
  );

const cyclePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntentCycle.ts",
  );


const source =
  fs.readFileSync(
    wrapperPath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );

const legacySource =
  fs.readFileSync(
    legacyRunnerPath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );

const cycleSource =
  fs.readFileSync(
    cyclePath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );


test(
  "Q14ag33E3D defines one isolated V2 successor execution entrypoint",
  () => {
    assert.match(
      source,
      /export\s+async\s+function\s+runHsppReconstructionExecutionIntentV2\s*\(/,
    );

    assert.match(
      source,
      /HsppReconstructionExecutionIntentV2/,
    );
  },
);


test(
  "Q14ag33E3D performs producer-neutral recovery before selection-source hydration",
  () => {
    const mainStart =
      source.indexOf(
        "export async function runHsppReconstructionExecutionIntentV2",
      );

    assert.ok(
      mainStart >= 0,
    );

    const main =
      source.slice(
        mainStart,
      );

    const recovery =
      main.indexOf(
        "const initialRecovery",
      );

    const hydration =
      main.indexOf(
        "const replacementCandidate",
      );

    const execution =
      main.indexOf(
        "const execution",
      );

    assert.ok(
      recovery >= 0,
    );

    assert.ok(
      hydration >
      recovery,
    );

    assert.ok(
      execution >
      hydration,
    );
  },
);


test(
  "Q14ag33E3D routes B07B_DISCOVERY only to the legacy exact hydrator",
  () => {
    assert.match(
      source,
      /intent\.selectionSource\s*===\s*"B07B_DISCOVERY"/,
    );

    assert.match(
      source,
      /await\s+dependencies\.readB07BReplacementCandidate\s*\(\s*\{/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*intent\.discoveryPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E3D routes SCHEDULED_PAIR only to the scheduled-pair exact hydrator",
  () => {
    assert.match(
      source,
      /intent\.selectionSource\s*===\s*"SCHEDULED_PAIR"/,
    );

    assert.match(
      source,
      /await\s+dependencies\.readScheduledPairReplacementCandidate\s*\(\s*\{/,
    );

    assert.match(
      source,
      /pairSchedulingVersion:\s*intent\.pairSchedulingVersion/,
    );

    assert.match(
      source,
      /reservoirEligibilityPolicyVersion:\s*intent\.reservoirEligibilityPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E3D preserves exact durable replacement identity on both routes",
  () => {
    const organizationChecks =
      source.match(
        /replacementRead\.organizationId\s*!==\s*intent\.organizationId/g,
      ) ?? [];

    const evidenceChecks =
      source.match(
        /replacementRead\.replacementEvidenceId\s*!==\s*intent\.replacementEvidenceId/g,
      ) ?? [];

    assert.equal(
      organizationChecks.length,
      2,
    );

    assert.equal(
      evidenceChecks.length,
      2,
    );
  },
);


test(
  "Q14ag33E3D converges into the certified E3C2 execution core exactly once",
  () => {
    const calls =
      source.match(
        /await\s+dependencies\.runPostHydrationExecutionCore\s*\(\s*\{/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /replacementCandidate,/,
    );
  },
);


test(
  "Q14ag33E3D owns no discovery scheduling claim or cycle behavior",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppReconstructionExecutionIntentsV2\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /evaluateHsppReservoirScheduledPairs\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /claimHsppReconstructionExecutionIntent\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /runHsppReconstructionExecutionIntentCycle\s*\(/,
    );
  },
);


test(
  "Q14ag33E3D keeps the legacy public runner legacy-only",
  () => {
    assert.doesNotMatch(
      legacySource,
      /runHsppReconstructionExecutionIntentV2\s*\(/,
    );

    assert.doesNotMatch(
      legacySource,
      /intent\.selectionSource/,
    );

    assert.doesNotMatch(
      legacySource,
      /readHsppScheduledPairReconstructionIntentReplacementCandidate/,
    );
  },
);


test(
  "Q14ag33E3D does not activate successor cycle wiring",
  () => {
    assert.doesNotMatch(
      cycleSource,
      /readHsppReconstructionExecutionIntentsV2/,
    );

    assert.doesNotMatch(
      cycleSource,
      /runHsppReconstructionExecutionIntentV2/,
    );

    assert.doesNotMatch(
      cycleSource,
      /SCHEDULED_PAIR/,
    );

    assert.doesNotMatch(
      cycleSource,
      /selectionSource/,
    );
  },
);


test(
  "Q14ag33E3D exports only producer-neutral E3C1 and E3C2 seams from the legacy runner module",
  () => {
    assert.match(
      legacySource,
      /export\s+type\s+HsppReconstructionExecutionIntentCore\s*=/,
    );

    assert.match(
      legacySource,
      /export\s+async\s+function\s+recoverDurableIntentCore\s*\(/,
    );

    assert.match(
      legacySource,
      /export\s+type\s+HsppReconstructionExecutionPostHydrationCoreResult\s*=/,
    );

    assert.match(
      legacySource,
      /export\s+async\s+function\s+runHsppReconstructionPostHydrationExecutionCore\s*\(/,
    );
  },
);

test(
  "Q14ag33E3D2 dependency seam defaults exactly to certified production dependencies",
  () => {
    assert.match(
      source,
      /const\s+DEFAULT_SUCCESSOR_EXECUTION_DEPENDENCIES[\s\S]*recoverDurableIntentCore,[\s\S]*readB07BReplacementCandidate:\s*readHsppReconstructionIntentReplacementCandidate,[\s\S]*readScheduledPairReplacementCandidate:\s*readHsppScheduledPairReconstructionIntentReplacementCandidate,[\s\S]*runPostHydrationExecutionCore:\s*runHsppReconstructionPostHydrationExecutionCore,/,
    );

    assert.match(
      source,
      /dependencies:\s*HsppReconstructionExecutionIntentV2Dependencies\s*=\s*DEFAULT_SUCCESSOR_EXECUTION_DEPENDENCIES/,
    );
  },
);