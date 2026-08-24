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
    "../lib/hspp/resolveHsppReconstructionActivationPolicy.ts",
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
  "Q14ag31Z defines one explicitly versioned zero-input policy resolver",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-activation-policy-resolver-v1/,
    );


    assert.match(
      executableSource,
      /export\s+function\s+resolveHsppReconstructionActivationPolicy\s*\(\s*\)\s*:/,
    );
  },
);


test(
  "Q14ag31Z canonically assigns the durable lifecycle policy",
  () => {
    assert.match(
      executableSource,
      /HSPP_RECONSTRUCTION_ACTIVATION_POLICY_VERSION\s*=\s*"hspp-reconstruction-policy-v1"/,
    );


    assert.doesNotMatch(
      executableSource,
      /hspp-reconstruction-test-v1/,
    );
  },
);


test(
  "Q14ag31Z canonically assigns the durable lifecycle reason",
  () => {
    assert.match(
      executableSource,
      /HSPP_RECONSTRUCTION_ACTIVATION_REASON\s*=\s*"REPLACE_UNSUITABLE_MEMBER"/,
    );


    assert.doesNotMatch(
      executableSource,
      /POST_POSITIVE_MEMBER_REPLACEMENT/,
    );
  },
);


test(
  "Q14ag31Z returns an immutable deterministic authority object",
  () => {
    assert.match(
      executableSource,
      /Object\.freeze\s*\(\s*\{/,
    );


    assert.match(
      executableSource,
      /reconstructionPolicyVersion\s*:\s*HSPP_RECONSTRUCTION_ACTIVATION_POLICY_VERSION/,
    );


    assert.match(
      executableSource,
      /reconstructionReason\s*:\s*HSPP_RECONSTRUCTION_ACTIVATION_REASON/,
    );


    assert.match(
      executableSource,
      /return\s+HSPP_RECONSTRUCTION_ACTIVATION_POLICY\s*;/,
    );
  },
);


test(
  "Q14ag31Z owns no runtime I/O orchestration mutation or randomness",
  () => {
    const forbidden = [
      /\bSupabaseClient\b/,
      /\.rpc\s*\(/,
      /\.from\s*\(/,
      /\.insert\s*\(/,
      /\.update\s*\(/,
      /\.delete\s*\(/,
      /\.upsert\s*\(/,
      /\brunHsppReservoirReevaluation\s*\(/,
      /\breadHsppReservoirCandidates\s*\(/,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
      /\brandomUUID\s*\(/,
      /\bcrypto\.randomUUID\s*\(/,
      /\bMath\.random\s*\(/,
      /\bDate\.now\s*\(/,
      /\brunHsppReconstructionExecutionIntentClaim\s*\(/,
      /\brunHsppReconstructionExecutionIntentCycle\s*\(/,
      /\brunHsppReconstructionExecutionIntent\s*\(/,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
      /\brunHsppReservoirReconstruction\s*\(/,
      /\bNextRequest\b/,
      /\bNextResponse\b/,
      /\bschedule\s*\(/,
    ];


    for (
      const pattern of
      forbidden
    ) {
      assert.doesNotMatch(
        executableSource,
        pattern,
      );
    }
  },
);


test(
  "Q14ag31Z does not accept organization evidence child or policy inputs",
  () => {
    const declaration =
      executableSource.match(
        /export\s+function\s+resolveHsppReconstructionActivationPolicy\s*\(([\s\S]*?)\)\s*:/,
      );


    assert.ok(
      declaration,
    );


    assert.equal(
      declaration[1].trim(),
      "",
    );
  },
);
