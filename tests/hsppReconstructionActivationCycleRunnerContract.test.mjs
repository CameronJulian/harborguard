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
    "../lib/hspp/runHsppReconstructionActivationCycle.ts",
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
  "Q14ag32B defines one explicitly versioned dormant outer activation cycle",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-activation-cycle-runner-v1/,
    );


    assert.match(
      executableSource,
      /export\s+async\s+function\s+runHsppReconstructionActivationCycle\s*\(/,
    );
  },
);


test(
  "Q14ag32B accepts only the four audited outer inputs",
  () => {
    const input =
      executableSource.match(
        /export\s+type\s+RunHsppReconstructionActivationCycleInput\s*=\s*\{([\s\S]*?)\};/,
      );


    assert.ok(
      input,
    );


    for (
      const field of
      [
        "supabase",
        "organizationId",
        "reevaluationResult",
        "proposedChildAssemblyId",
      ]
    ) {
      assert.match(
        input[1],
        new RegExp(
          `\\b${field}\\b`,
        ),
      );
    }


    assert.doesNotMatch(
      input[1],
      /\breconstructionPolicyVersion\b/,
    );


    assert.doesNotMatch(
      input[1],
      /\breconstructionReason\b/,
    );


    assert.doesNotMatch(
      input[1],
      /\blimit\b/,
    );
  },
);


test(
  "Q14ag32B resolves Q14ag31Z exactly once then attempts Q14ag31U exactly once",
  () => {
    const policyCalls =
      executableSource.match(
        /\bresolveHsppReconstructionActivationPolicy\s*\(/g,
      ) ?? [];


    const producerCalls =
      executableSource.match(
        /\brunHsppReconstructionExecutionIntentClaim\s*\(/g,
      ) ?? [];


    assert.equal(
      policyCalls.length,
      1,
    );


    assert.equal(
      producerCalls.length,
      1,
    );


    const policyIndex =
      executableSource.indexOf(
        "resolveHsppReconstructionActivationPolicy()",
      );


    const producerIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentClaim({",
      );


    assert.ok(
      policyIndex >=
      0,
    );


    assert.ok(
      producerIndex >
      policyIndex,
    );
  },
);


test(
  "Q14ag32B maps the supplied snapshot child and canonical policy into Q14ag31U",
  () => {
    assert.match(
      executableSource,
      /\breevaluationResult\s*,/,
    );


    assert.match(
      executableSource,
      /\bproposedChildAssemblyId\s*,/,
    );


    assert.match(
      executableSource,
      /reconstructionPolicyVersion\s*:\s*activationPolicy\.reconstructionPolicyVersion/,
    );


    assert.match(
      executableSource,
      /reconstructionReason\s*:\s*activationPolicy\.reconstructionReason/,
    );
  },
);


test(
  "Q14ag32B isolates producer failure before exactly one unconditional consumer drain",
  () => {
    const consumerCalls =
      executableSource.match(
        /\brunHsppReconstructionExecutionIntentCycle\s*\(/g,
      ) ?? [];


    assert.equal(
      consumerCalls.length,
      1,
    );


    assert.match(
      executableSource,
      /try\s*\{/,
    );


    assert.match(
      executableSource,
      /catch\s*\(\s*error\s*\)\s*\{/,
    );


    const producerIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentClaim({",
      );


    const catchIndex =
      executableSource.indexOf(
        "catch (error)",
      );


    const consumerIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentCycle({",
      );


    assert.ok(
      producerIndex >=
      0,
    );


    assert.ok(
      catchIndex >
      producerIndex,
    );


    assert.ok(
      consumerIndex >
      catchIndex,
    );


    assert.match(
      executableSource,
      /producer\s*=\s*\{\s*success\s*:\s*false/,
    );


    assert.match(
      executableSource,
      /errorMessage\s*:\s*normalizeErrorMessage\s*\(/,
    );
  },
);


test(
  "Q14ag32B returns policy producer outcome and consumer result",
  () => {
    assert.match(
      executableSource,
      /state\s*:\s*"ACTIVATION_CYCLE_COMPLETED"/,
    );


    assert.match(
      executableSource,
      /\borganizationId\s*,/,
    );


    assert.match(
      executableSource,
      /\bproposedChildAssemblyId\s*,/,
    );


    assert.match(
      executableSource,
      /\bactivationPolicy\s*,/,
    );


    assert.match(
      executableSource,
      /\bproducer\s*,/,
    );


    assert.match(
      executableSource,
      /\bconsumer\s*,/,
    );
  },
);


test(
  "Q14ag32B does not rediscover rerank claim directly consume directly mutate generate UUIDs or schedule",
  () => {
    const forbidden = [
      /\brunHsppReservoirReevaluation\s*\(/,
      /\breadHsppReservoirCandidates\s*\(/,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
      /\bassemblyCandidates\b/,
      /\.sort\s*\(/,
      /\brandomUUID\s*\(/,
      /\bcrypto\.randomUUID\s*\(/,
      /\bMath\.random\s*\(/,
      /\bclaimHsppReconstructionExecutionIntent\s*\(/,
      /\breadHsppReconstructionExecutionIntents\s*\(/,
      /\brunHsppReconstructionExecutionIntent\s*\(/,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
      /\.rpc\s*\(/,
      /\.from\s*\(/,
      /\.insert\s*\(/,
      /\.update\s*\(/,
      /\.delete\s*\(/,
      /\.upsert\s*\(/,
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
  "Q14ag33E3E4 integrates the successor cycle exactly once after the legacy consumer",
  () => {
    const successorCalls =
      executableSource.match(
        /\brunHsppReconstructionExecutionIntentCycleV2\s*\(/g,
      ) ?? [];

    assert.equal(
      successorCalls.length,
      1,
    );

    const legacyIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentCycle({",
      );

    const successorIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentCycleV2({",
      );

    const returnIndex =
      executableSource.indexOf(
        "return {",
        successorIndex,
      );

    assert.ok(
      legacyIndex >= 0,
    );

    assert.ok(
      successorIndex > legacyIndex,
    );

    assert.ok(
      returnIndex > successorIndex,
    );
  },
);


test(
  "Q14ag33E3E4 preserves consumer and exposes successorConsumer separately",
  () => {
    assert.match(
      executableSource,
      /\bconsumer\s*:\s*RunHsppReconstructionExecutionIntentCycleResult/,
    );

    assert.match(
      executableSource,
      /\bsuccessorConsumer\s*:\s*RunHsppReconstructionExecutionIntentCycleV2Result/,
    );

    assert.match(
      executableSource,
      /\bconsumer\s*,/,
    );

    assert.match(
      executableSource,
      /\bsuccessorConsumer\s*,/,
    );
  },
);


test(
  "Q14ag33E3E4 passes only Supabase and organization identity into the successor cycle",
  () => {
    const call =
      executableSource.match(
        /runHsppReconstructionExecutionIntentCycleV2\s*\(\s*\{([\s\S]*?)\}\s*\)/,
      );

    assert.ok(
      call,
    );

    assert.match(
      call[1],
      /\bsupabase\b/,
    );

    assert.match(
      call[1],
      /\borganizationId\b/,
    );

    assert.doesNotMatch(
      call[1],
      /\breevaluationResult\b/,
    );

    assert.doesNotMatch(
      call[1],
      /\bproposedChildAssemblyId\b/,
    );

    assert.doesNotMatch(
      call[1],
      /\blimit\b/,
    );
  },
);


test(
  "Q14ag33E3E4 does not add a catch around successor execution",
  () => {
    const successorIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntentCycleV2({",
      );

    const returnIndex =
      executableSource.indexOf(
        "return {",
        successorIndex,
      );

    assert.ok(
      successorIndex >= 0,
    );

    assert.ok(
      returnIndex > successorIndex,
    );

    const window =
      executableSource.slice(
        successorIndex,
        returnIndex,
      );

    assert.doesNotMatch(
      window,
      /\btry\s*\{/,
    );

    assert.doesNotMatch(
      window,
      /\bcatch\s*\(/,
    );
  },
);
