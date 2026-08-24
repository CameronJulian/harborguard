import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";


const sourcePath =
  "lib/hspp/readHsppReconstructionExecutionIntents.ts";


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
  "Q14ag31F exports exactly the typed Q14ag31E reader boundary",
  () => {
    assert.match(
      source,
      /export async function readHsppReconstructionExecutionIntents/,
    );

    assert.match(
      source,
      /hspp-reconstruction-execution-intent-reader-v1/,
    );

    assert.match(
      source,
      /read_hspp_reconstruction_execution_intents/,
    );
  },
);


test(
  "Q14ag31F calls exactly one RPC and performs no direct table access",
  () => {
    const rpcCalls =
      executableSource.match(
        /\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      rpcCalls.length,
      1,
    );

    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(/,
    );
  },
);


test(
  "Q14ag31F maps organization limit and paired keyset cursor arguments exactly",
  () => {
    for (
      const field of [
        "p_organization_id",
        "p_limit",
        "p_before_created_at",
        "p_before_intent_id",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `\\b${field}\\b`,
        ),
      );
    }

    assert.match(
      source,
      /beforeCreatedAt and beforeIntentId must be provided together/,
    );

    assert.match(
      source,
      /integer between 1 and \$\{MAX_LIMIT\}/,
    );
  },
);


test(
  "Q14ag31F distrusts generated nullability and validates raw row fields as unknown",
  () => {
    for (
      const field of [
        "reconstruction_id",
        "parent_assembly_id",
        "assembly_state",
        "sealed_at",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `${field}\\?: unknown`,
        ),
      );
    }
  },
);


test(
  "Q14ag31F exposes the required persistence-state discriminated union",
  () => {
    assert.match(
      source,
      /CLAIMED_NOT_PERSISTED/,
    );

    assert.match(
      source,
      /RECONSTRUCTION_PERSISTED/,
    );

    assert.match(
      source,
      /assemblyState:[\s\S]*?"OPEN"/,
    );

    assert.match(
      source,
      /assemblyState:[\s\S]*?"SEALED"/,
    );

    assert.match(
      source,
      /sealedAt:[\s\S]*?null/,
    );
  },
);


test(
  "Q14ag31F validates immutable evidence and policy provenance",
  () => {
    assert.match(
      source,
      /selected pair must contain exactly the historical and replacement evidence identities/,
    );

    assert.match(
      source,
      /lowercase SHA-256 fingerprint/,
    );

    assert.match(
      source,
      /unsupported reconstruction execution-intent version/,
    );

    assert.match(
      source,
      /organization does not match the requested organization/,
    );
  },
);


test(
  "Q14ag31F validates OPEN SEALED and claimed null-state consistency",
  () => {
    assert.match(
      source,
      /CLAIMED_NOT_PERSISTED state must not expose persisted child\/reconstruction state/,
    );

    assert.match(
      source,
      /OPEN reconstruction must have sealed_at = null/,
    );

    assert.match(
      source,
      /persisted assembly_state must be OPEN or SEALED/,
    );
  },
);


test(
  "Q14ag31F validates bounded deterministic page ordering",
  () => {
    assert.match(
      source,
      /data\.length > limit/,
    );

    assert.match(
      source,
      /assertDeterministicPageOrder/,
    );

    assert.match(
      source,
      /created_at DESC ordering/,
    );

    assert.match(
      source,
      /intent_id DESC ordering/,
    );

    assert.match(
      source,
      /duplicate intent identity/,
    );

    assert.match(
      source,
      /duplicate canonical child identity/,
    );
  },
);


test(
  "Q14ag31F preserves exact returned timestamp text for the next keyset cursor",
  () => {
    assert.match(
      source,
      /return normalized;/,
    );

    assert.match(
      source,
      /finalIntent\.createdAt/,
    );

    assert.match(
      source,
      /finalIntent\.intentId/,
    );
  },
);


test(
  "Q14ag31F owns no reconstruction execution or downstream mutation authority",
  () => {
    for (
      const forbiddenCall of [
        /claimHsppReconstructionExecutionIntent\s*\(/,
        /runHsppReservoirReconstruction\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
        /readHsppHistoricalReconstructionContexts\s*\(/,
        /readHsppEvidenceAssemblyReconstructionRecovery\s*\(/,
        /sealHsppEvidenceAssembly\s*\(/,
        /assessment[A-Za-z0-9_]*\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        executableSource,
        forbiddenCall,
      );
    }

    assert.doesNotMatch(
      executableSource,
      /randomUUID\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /crypto\.randomUUID\s*\(/,
    );
  },
);


test(
  "Q14ag31O exposes one optional server-side persistence-state filter",
  () => {
    assert.match(
      source,
      /persistenceStateFilter\?\s*:/,
    );

    assert.match(
      source,
      /HsppReconstructionExecutionIntent\["persistenceState"\]/,
    );

    assert.match(
      source,
      /normalizePersistenceStateFilter\s*\(/,
    );

    assert.match(
      source,
      /p_persistence_state\s*:/,
    );
  },
);


test(
  "Q14ag31O preserves null as generic both-state discovery",
  () => {
    assert.match(
      source,
      /value\s*===\s*undefined[\s\S]*?value\s*===\s*null[\s\S]*?return\s+null/,
    );

    assert.match(
      source,
      /"CLAIMED_NOT_PERSISTED"/,
    );

    assert.match(
      source,
      /"RECONSTRUCTION_PERSISTED"/,
    );
  },
);


test(
  "Q14ag31O distrusts the filtered RPC result and verifies every returned lifecycle state",
  () => {
    assert.match(
      executableSource,
      /intents\[index\]\.persistenceState\s*!==\s*persistenceStateFilter/,
    );

    assert.match(
      source,
      /does not match requested persistence-state filter/,
    );
  },
);


test(
  "Q14ag31O still owns no claim execution table mutation or activation authority",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\bclaimHsppReconstructionExecutionIntent\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\brunHsppReconstructionExecutionIntent\s*\(/,
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
      /\brandomUUID\s*\(/,
    );
  },
);