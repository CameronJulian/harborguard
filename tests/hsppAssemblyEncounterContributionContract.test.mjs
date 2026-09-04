import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/prepareHsppAssemblyEncounterContribution.ts",
    "utf8",
  );


test(
  "encounter contribution reuses existing HSPP derivation lineage",
  () => {
    assert.match(
      source,
      /BuildHsppEvidenceInput/,
    );

    assert.match(
      source,
      /parentEvidenceId/,
    );

    assert.match(
      source,
      /parentIntegrityFingerprint/,
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION/,
    );

    assert.match(
      source,
      /derivationVersion/,
    );
  },
);


test(
  "only positive B11A2 encounter membership may prepare contribution",
  () => {
    assert.match(
      source,
      /PAIR_MEMBERSHIP_ELIGIBLE/,
    );

    assert.match(
      source,
      /authority !==[\s\S]*"NONE"/,
    );
  },
);


test(
  "contribution primitive does not invent implicit parent-payload copying",
  () => {
    assert.match(
      source,
      /caller supplies normalizedPayload explicitly/i,
    );

    assert.match(
      source,
      /no general rule saying that encounter-derived[\s\S]*automatically copies/i,
    );
  },
);


test(
  "contribution primitive owns no persistence membership reconstruction or authority",
  () => {
    assert.match(
      source,
      /authority:\s*"NONE"/,
    );

    for (
      const forbidden of [
        /SupabaseClient/,
        /\.from\s*\(/,
        /\.rpc\s*\(/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /persistHsppEvidence\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
        /runHsppReservoirReconstruction\s*\(/,
        /source_membership_id/,
        /membership_kind\s*:/,
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
  "contribution does not use RETAINED membership as encounter sharing",
  () => {
    assert.match(
      source,
      /create RETAINED membership/i,
    );

    assert.match(
      source,
      /move evidence between assemblies/i,
    );
  },
);