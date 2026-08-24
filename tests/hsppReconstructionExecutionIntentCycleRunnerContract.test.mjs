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
    "../lib/hspp/runHsppReconstructionExecutionIntentCycle.ts",
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
  "Q14ag31W defines one explicitly versioned isolated consumer cycle",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-execution-intent-cycle-runner-v1/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+runHsppReconstructionExecutionIntentCycle\s*\(/,
    );

    assert.match(
      source,
      /supabase:\s*SupabaseClient/,
    );

    assert.match(
      source,
      /organizationId:\s*string/,
    );

    assert.match(
      source,
      /limit\?:\s*number/,
    );
  },
);


test(
  "Q14ag31W owns exactly one durable-reader call and forces CLAIMED_NOT_PERSISTED",
  () => {
    const calls =
      executableSource.match(
        /\breadHsppReconstructionExecutionIntents\s*\(/g,
      ) ?? [];


    assert.equal(
      calls.length,
      1,
    );


    assert.match(
      executableSource,
      /persistenceStateFilter\s*:\s*"CLAIMED_NOT_PERSISTED"/,
    );


    assert.doesNotMatch(
      executableSource,
      /persistenceStateFilter\s*:\s*"RECONSTRUCTION_PERSISTED"/,
    );
  },
);


test(
  "Q14ag31W reads one bounded page and never paginates itself",
  () => {
    assert.match(
      executableSource,
      /\blimit\s*,/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bbeforeCreatedAt\s*:/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bbeforeIntentId\s*:/,
    );

    const readerCalls =
      executableSource.match(
        /\breadHsppReconstructionExecutionIntents\s*\(/g,
      ) ?? [];


    assert.equal(
      readerCalls.length,
      1,
    );
  },
);


test(
  "Q14ag31W processes the already-read page sequentially and invokes Q14ag31M once per loop body",
  () => {
    assert.match(
      executableSource,
      /for\s*\(\s*const\s+intent\s+of\s+page\.intents\s*\)/,
    );


    const calls =
      executableSource.match(
        /\brunHsppReconstructionExecutionIntent\s*\(/g,
      ) ?? [];


    assert.equal(
      calls.length,
      1,
    );


    const loopIndex =
      executableSource.indexOf(
        "for (",
      );

    const runnerIndex =
      executableSource.indexOf(
        "runHsppReconstructionExecutionIntent({",
      );


    assert.ok(
      loopIndex >=
      0,
    );


    assert.ok(
      runnerIndex >
      loopIndex,
    );


    assert.doesNotMatch(
      executableSource,
      /Promise\.all\s*\(/,
    );


    assert.doesNotMatch(
      executableSource,
      /Promise\.allSettled\s*\(/,
    );
  },
);


test(
  "Q14ag31W isolates each intent failure and preserves identity plus runner result",
  () => {
    assert.match(
      executableSource,
      /try\s*\{/,
    );

    assert.match(
      executableSource,
      /catch\s*\(\s*error\s*\)\s*\{/,
    );

    assert.match(
      executableSource,
      /intentId\s*:\s*intent\.intentId/,
    );

    assert.match(
      executableSource,
      /childAssemblyId\s*:\s*intent\.childAssemblyId/,
    );

    assert.match(
      executableSource,
      /success\s*:\s*true/,
    );

    assert.match(
      executableSource,
      /success\s*:\s*false/,
    );

    assert.match(
      executableSource,
      /\bresult\s*,/,
    );

    assert.match(
      executableSource,
      /errorMessage\s*:\s*normalizeErrorMessage\s*\(/,
    );
  },
);


test(
  "Q14ag31W distinguishes no pending work from a completed bounded cycle",
  () => {
    assert.match(
      executableSource,
      /state\s*:\s*"NO_PENDING_INTENTS"/,
    );

    assert.match(
      executableSource,
      /state\s*:\s*"CYCLE_COMPLETED"/,
    );

    assert.match(
      executableSource,
      /selectedCount\s*:\s*page\.intents\.length/,
    );

    assert.match(
      executableSource,
      /\bsucceededCount\b/,
    );

    assert.match(
      executableSource,
      /\bfailedCount\b/,
    );

    assert.match(
      executableSource,
      /hasMore\s*:\s*page\.nextCursor\s*!==\s*null/,
    );
  },
);


test(
  "Q14ag31W does not claim produce rediscover paginate mutate or schedule",
  () => {
    const forbidden = [
      /\bclaimHsppReconstructionExecutionIntent\s*\(/,
      /\brunHsppReconstructionExecutionIntentClaim\s*\(/,
      /\brunHsppReservoirReevaluation\s*\(/,
      /\breadHsppReservoirCandidates\s*\(/,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
      /\brandomUUID\s*\(/,
      /\bcrypto\.randomUUID\s*\(/,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
      /\brunHsppReservoirReconstruction\s*\(/,
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
