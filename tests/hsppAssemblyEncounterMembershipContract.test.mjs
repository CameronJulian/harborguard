import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppAssemblyEncounterMembership.ts",
    "utf8",
  );


test(
  "encounter membership bridge reuses existing B11A2 authority",
  () => {
    assert.match(
      source,
      /evaluateHsppAssemblyMembership/,
    );

    assert.match(
      source,
      /PAIR_MEMBERSHIP_ELIGIBLE/,
    );

    assert.match(
      source,
      /PAIR_MEMBERSHIP_DENIED/,
    );
  },
);


test(
  "encounter membership bridge remains pair-level rather than inventing multi-member semantics",
  () => {
    assert.match(
      source,
      /pair-oriented/i,
    );

    assert.match(
      source,
      /explicitly identified member of the target assembly/i,
    );

    assert.doesNotMatch(
      source,
      /\.every\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.some\s*\(/,
    );
  },
);


test(
  "encounter membership bridge binds candidate and target anchor to structural provenance",
  () => {
    assert.match(
      source,
      /candidate\.targetAssemblyId/,
    );

    assert.match(
      source,
      /targetAssembly\.assemblyId/,
    );

    assert.match(
      source,
      /targetAssembly\.members\.find/,
    );

    assert.match(
      source,
      /integrityFingerprint/,
    );
  },
);


test(
  "encounter membership bridge grants no authority and owns no mutation",
  () => {
    assert.match(
      source,
      /authority:\s*"NONE"/,
    );

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
        /runHsppReservoirReconstruction\s*\(/,
        /runHsppReconstructionExecutionIntent\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }
  },
);


test(
  "positive pair membership does not claim transfer reconstruction or whole-assembly admission",
  () => {
    assert.match(
      source,
      /does NOT establish that a candidate may be inserted/i,
    );

    assert.match(
      source,
      /positive result remains proposal-only/i,
    );
  },
);