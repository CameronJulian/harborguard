import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppAssemblyEncounter.ts",
    "utf8",
  );


test(
  "assembly encounter exposes explicit candidate/no-match states and no authority",
  () => {
    assert.match(
      source,
      /"NO_MATCH"/,
    );

    assert.match(
      source,
      /"ENCOUNTER_CANDIDATE"/,
    );

    assert.match(
      source,
      /authority:\s*"NONE"/,
    );
  },
);


test(
  "assembly encounter operates across two distinct assembly identities",
  () => {
    assert.match(
      source,
      /firstAssemblyId/,
    );

    assert.match(
      source,
      /secondAssemblyId/,
    );

    assert.match(
      source,
      /sourceAssemblyId/,
    );

    assert.match(
      source,
      /targetAssemblyId/,
    );

    assert.match(
      source,
      /cannot encounter itself/i,
    );
  },
);


test(
  "assembly encounter requires same organization and verified MATCH members",
  () => {
    assert.match(
      source,
      /same organization/i,
    );

    assert.match(
      source,
      /integrityStatus\s*!==\s*"MATCH"/s,
    );

    assert.match(
      source,
      /lowercase SHA-256/i,
    );
  },
);


test(
  "assembly encounter remains proposal-only and owns no mutation authority",
  () => {
    for (
      const forbidden of
      [
        /SupabaseClient/,
        /\.rpc\s*\(/,
        /\.from\s*\(/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
        /compareAndSwapHsppReservoirPairScanState\s*\(/,
        /runHsppReservoirReconstruction\s*\(/,
        /runHsppReconstructionExecutionIntent\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }

    assert.match(
      source,
      /NO:[\s\S]*database access/i,
    );

    assert.match(
      source,
      /assembly mutation/i,
    );

    assert.match(
      source,
      /reconstruction/i,
    );

    assert.match(
      source,
      /downstream authority transition/i,
    );
  },
);


test(
  "first encounter primitive does not pretend structural absence proves semantic compatibility",
  () => {
    assert.match(
      source,
      /does NOT mean that evidence is compatible/i,
    );

    assert.match(
      source,
      /later HSPP boundary/i,
    );
  },
);