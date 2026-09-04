import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/assessHsppAssemblyEncounterContribution.ts",
    "utf8",
  );


test(
  "assessment is lineage-aware and parent-operational-aware",
  () => {
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
      /HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_TYPE/,
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_ENCOUNTER_DERIVATION_VERSION/,
    );

    assert.match(
      source,
      /parentOperationalUseDecision/,
    );

    assert.match(
      source,
      /operational_use_allowed/,
    );
  },
);


test(
  "encounter assessor may grant at most PLAUSIBLE trust",
  () => {
    assert.match(
      source,
      /trustState:[\s\S]*"PLAUSIBLE"/,
    );

    assert.doesNotMatch(
      source,
      /trustState\s*:\s*"CORROBORATED"/,
    );

    assert.doesNotMatch(
      source,
      /trustState\s*:\s*"VERIFIED"/,
    );
  },
);


test(
  "encounter assessor grants no downstream authority classes",
  () => {
    assert.match(
      source,
      /crowdEligible:[\s\S]*false/,
    );

    assert.match(
      source,
      /trainingEligible:[\s\S]*false/,
    );

    assert.match(
      source,
      /validationEligible:[\s\S]*false/,
    );
  },
);


test(
  "encounter assessment remains pure",
  () => {
    for (
      const forbidden of [
        /SupabaseClient/,
        /\.from\s*\(/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /\.rpc\s*\(/,
        /persistHsppEvidence\s*\(/,
        /applyHsppAssessmentDecision\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
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
  "assessment requires prepared contribution authority NONE",
  () => {
    assert.match(
      source,
      /ENCOUNTER_CONTRIBUTION_PREPARED/,
    );

    assert.match(
      source,
      /contribution\.authority[\s\S]*"NONE"/,
    );
  },
);