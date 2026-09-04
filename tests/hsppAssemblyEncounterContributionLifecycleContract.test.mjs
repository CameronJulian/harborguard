import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppAssemblyEncounterContributionLifecycle.ts",
    "utf8",
  );


test(
  "runner composes existing HSPP authorities rather than replacing them",
  () => {
    for (
      const symbol of [
        "buildHsppEvidence",
        "persistHsppEvidence",
        "verifyHsppEvidenceIntegrity",
        "assessHsppAssemblyEncounterContribution",
        "applyHsppAssessmentDecision",
        "readHsppEvidenceForOperationalUse",
        "readHsppReservoirEligibleEvidenceByIds",
      ]
    ) {
      assert.match(
        source,
        new RegExp(symbol),
      );
    }
  },
);


test(
  "PostgreSQL duplicate recovery is restricted to 23505",
  () => {
    assert.match(
      source,
      /error\?\.code\s*!==\s*"23505"/,
    );

    assert.match(
      source,
      /recoverExistingEncounterContribution/,
    );
  },
);


test(
  "duplicate recovery verifies source identity and immutable fingerprint",
  () => {
    for (
      const field of [
        "source_class",
        "source_provider",
        "source_stream",
        "source_message_id",
        "payload_schema_version",
        "integrity_fingerprint",
      ]
    ) {
      assert.match(
        source,
        new RegExp(field),
      );
    }

    assert.match(
      source,
      /different immutable integrity fingerprint/i,
    );
  },
);


test(
  "runner does not create a new Reservoir or assembly mutation authority",
  () => {
    assert.match(
      source,
      /authority:\s*"NONE"/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /membership_kind\s*:/,
    );

    assert.doesNotMatch(
      source,
      /source_membership_id/,
    );
  },
);


test(
  "runner delegates final eligibility to shared Reservoir reader",
  () => {
    assert.match(
      source,
      /readHsppReservoirEligibleEvidenceByIds/,
    );

    assert.match(
      source,
      /ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE/,
    );

    assert.match(
      source,
      /ENCOUNTER_CONTRIBUTION_NOT_RESERVOIR_ELIGIBLE/,
    );
  },
);