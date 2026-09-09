import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const readerPath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "readHsppReconstructionExecutionIntentsV2.ts",
  );

const source =
  fs.readFileSync(
    readerPath,
    "utf8",
  );


test(
  "Q14ag33D defines a distinct v2 reader RPC boundary",
  () => {
    assert.match(
      source,
      /HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC\s*=\s*"read_hspp_reconstruction_execution_intents_v2"/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+readHsppReconstructionExecutionIntentsV2\s*\(/,
    );
  },
);


test(
  "Q14ag33D models B07B and scheduled-pair provenance as a discriminated union",
  () => {
    assert.match(
      source,
      /selectionSource:\s*"B07B_DISCOVERY"[\s\S]*?discoveryPolicyVersion:\s*string[\s\S]*?pairSchedulingVersion:\s*null/,
    );

    assert.match(
      source,
      /selectionSource:\s*"SCHEDULED_PAIR"[\s\S]*?discoveryPolicyVersion:\s*null[\s\S]*?pairSchedulingVersion:\s*string/,
    );
  },
);


test(
  "Q14ag33D carries producer-neutral B06A provenance for both sources",
  () => {
    assert.match(
      source,
      /reservoirEligibilityPolicyVersion:[\s\S]*?typeof\s+HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION/,
    );

    assert.match(
      source,
      /HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION\s*=\s*"hspp-reservoir-eligibility-v1"/,
    );
  },
);


test(
  "Q14ag33D distrusts all new RPC provenance fields as unknown",
  () => {
    for (const token of [
      "selection_source?:",
      "discovery_policy_version?:",
      "pair_scheduling_version?:",
      "reservoir_eligibility_policy_version?:",
    ]) {
      assert.ok(
        source.includes(token),
        `missing raw unknown successor field ${token}`,
      );
    }
  },
);


test(
  "Q14ag33D forbids fabricated discovery provenance for scheduled pairs",
  () => {
    assert.match(
      source,
      /selectionSource\s*===\s*"SCHEDULED_PAIR"[\s\S]*?row\.discovery_policy_version\s*!==\s*null[\s\S]*?SCHEDULED_PAIR must not expose fabricated discovery provenance/,
    );
  },
);


test(
  "Q14ag33D requires discovery and forbids pair scheduling provenance for B07B",
  () => {
    assert.match(
      source,
      /selectionSource\s*===\s*"B07B_DISCOVERY"[\s\S]*?requireBoundedPolicyVersion\s*\(\s*row\.discovery_policy_version/i,
    );

    assert.match(
      source,
      /B07B_DISCOVERY must not expose pair scheduling provenance/,
    );
  },
);


test(
  "Q14ag33D calls exactly one successor RPC and performs no direct table access",
  () => {
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
      /await\s+supabase\.rpc\s*\(\s*HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC/,
    );

    assert.doesNotMatch(
      source,
      /supabase\.from\s*\(/,
    );
  },
);


test(
  "Q14ag33D preserves canonical five-argument pagination and persistence filter mapping",
  () => {
    for (const token of [
      "p_organization_id:",
      "p_limit:",
      "p_before_created_at:",
      "p_before_intent_id:",
      "p_persistence_state:",
    ]) {
      assert.ok(
        source.includes(token),
        `missing canonical successor RPC argument ${token}`,
      );
    }
  },
);


test(
  "Q14ag33D preserves persistence-state and page fail-closed validation",
  () => {
    assert.match(
      source,
      /CLAIMED_NOT_PERSISTED state must not expose persisted child\/reconstruction state/,
    );

    assert.match(
      source,
      /OPEN state must have null sealed_at/,
    );

    assert.match(
      source,
      /not ordered by created_at descending/,
    );

    assert.match(
      source,
      /Duplicate reconstruction execution-intent identity/,
    );
  },
);


test(
  "Q14ag33D does not import or invoke reconstruction hydration or scheduler authority",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppReconstructionIntentReplacementCandidate/,
    );

    assert.doesNotMatch(
      source,
      /runHsppReconstructionExecutionIntent/,
    );

    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppReservoirPair/,
    );
  },
);