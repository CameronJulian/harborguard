import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const persistence =
  fs.readFileSync(
    "lib/hspp/persistHsppEvidence.ts",
    "utf8"
  );

test(
  "generic HSPP persistence accepts an optional provider observation id",
  () => {
    assert.match(
      persistence,
      /providerObservationId\?: string \| null/
    );
  }
);

test(
  "provider observation linkage defaults to null",
  () => {
    assert.match(
      persistence,
      /providerObservationId = null/
    );
  }
);

test(
  "generic HSPP persistence writes provider_observation_id",
  () => {
    assert.match(
      persistence,
      /provider_observation_id:\s*[\r\n\s]*providerObservationId/
    );
  }
);

test(
  "provider observation linkage remains separate from telematics receipt linkage",
  () => {
    assert.match(
      persistence,
      /provider_observation_id/
    );

    assert.match(
      persistence,
      /telematics_receipt_id/
    );

    assert.match(
      persistence,
      /vehicle_id/
    );

    assert.match(
      persistence,
      /trip_id/
    );
  }
);

test(
  "HSPP-008B8A does not modify HSPP trust or eligibility",
  () => {
    assert.doesNotMatch(
      persistence,
      /crowd_eligible:\s*true/
    );

    assert.doesNotMatch(
      persistence,
      /training_eligible:\s*true/
    );

    assert.doesNotMatch(
      persistence,
      /validation_eligible:\s*true/
    );
  }
);

test(
  "HSPP-008B8A remains generic and does not depend on HERE or TomTom",
  () => {
    assert.doesNotMatch(
      persistence,
      /importHereIncidents/
    );

    assert.doesNotMatch(
      persistence,
      /importTomTomIncidents/
    );

    assert.doesNotMatch(
      persistence,
      /here_traffic/
    );
  }
);
