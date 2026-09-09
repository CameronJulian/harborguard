import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const filePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntent.ts",
  );

const source =
  fs.readFileSync(
    filePath,
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
  "Q14ag33E3C1 defines a producer-neutral durable execution core type",
  () => {
    const core =
      between(
        "export type HsppReconstructionExecutionIntentCore = {",
        "type HsppReconstructionExecutionRecoveryCoreResult = {",
      );

    assert.match(
      core,
      /organizationId:\s*string/,
    );

    assert.match(
      core,
      /childAssemblyId:\s*string/,
    );

    assert.match(
      core,
      /historicalEvidenceIntegrityFingerprint:\s*string/,
    );

    assert.match(
      core,
      /replacementEvidenceIntegrityFingerprint:\s*string/,
    );

    assert.match(
      core,
      /membershipPolicyVersion:\s*string/,
    );

    assert.match(
      core,
      /reconstructionPolicyVersion:\s*string/,
    );

    assert.match(
      core,
      /reconstructionReason:\s*string/,
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
  "Q14ag33E3C1 explicitly projects the legacy intent into the producer-neutral core",
  () => {
    const projection =
      between(
        "function toExecutionIntentCore(",
        "function makeCommonResult(",
      );

    assert.match(
      projection,
      /HsppReconstructionExecutionIntentCore/,
    );

    assert.doesNotMatch(
      projection,
      /discoveryPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E3C1 recovery core accepts only the producer-neutral intent",
  () => {
    const core =
      between(
        "async function recoverDurableIntentCore({",
        "/**\n * Q14ag33E3C1 legacy result adapter.",
      );

    assert.match(
      core,
      /intent:\s*HsppReconstructionExecutionIntentCore/,
    );

    assert.doesNotMatch(
      core,
      /HsppReconstructionExecutionIntent;/,
    );
  },
);


test(
  "Q14ag33E3C1 recovery core owns no producer provenance or legacy result decoration",
  () => {
    const core =
      between(
        "async function recoverDurableIntentCore({",
        "/**\n * Q14ag33E3C1 legacy result adapter.",
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

    assert.doesNotMatch(
      core,
      /makeCommonResult\s*\(/,
    );

    assert.doesNotMatch(
      core,
      /RECONSTRUCTION_RECOVERED/,
    );
  },
);


test(
  "Q14ag33E3C1 legacy recovery adapter preserves the existing public recovered result",
  () => {
    const adapter =
      between(
        "async function recoverDurableIntent({",
        "/**\n * Q14ag31M isolated durable reconstruction-intent execution runner.",
      );

    assert.match(
      adapter,
      /await\s+recoverDurableIntentCore\s*\(/,
    );

    assert.match(
      adapter,
      /toExecutionIntentCore\s*\(/,
    );

    assert.match(
      adapter,
      /\.\.\.makeCommonResult\s*\(/,
    );

    assert.match(
      adapter,
      /state:\s*"RECONSTRUCTION_RECOVERED"/,
    );

    assert.match(
      adapter,
      /idempotentRecovery:\s*null/,
    );
  },
);


test(
  "Q14ag33E3C1 leaves the legacy public runner input B07B-shaped",
  () => {
    assert.match(
      source,
      /intent:\s*HsppReconstructionExecutionIntent;/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*string;/,
    );
  },
);


test(
  "Q14ag33E3C1 leaves legacy B07B replacement hydration unchanged",
  () => {
    assert.match(
      source,
      /await\s+readHsppReconstructionIntentReplacementCandidate\s*\(\s*\{/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*intent\.discoveryPolicyVersion/,
    );

    assert.doesNotMatch(
      source,
      /readHsppScheduledPairReconstructionIntentReplacementCandidate/,
    );
  },
);


test(
  "Q14ag33E3C1 preserves recovery-before-hydration ordering",
  () => {
    const mainStart =
      source.indexOf(
        "export async function runHsppReconstructionExecutionIntent",
      );

    const recovery =
      source.indexOf(
        "const initialRecovery",
        mainStart,
      );

    const hydration =
      source.indexOf(
        "const replacementRead",
        mainStart,
      );

    assert.ok(
      mainStart >= 0,
    );

    assert.ok(
      recovery > mainStart,
    );

    assert.ok(
      hydration > recovery,
    );
  },
);


test(
  "Q14ag33E3C1 adds no successor routing or scheduled-pair execution",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppReconstructionExecutionIntentsV2/,
    );

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