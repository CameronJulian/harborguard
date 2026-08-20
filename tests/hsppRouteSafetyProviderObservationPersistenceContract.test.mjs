import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/persistRouteSafetyProviderObservation.ts",
    "utf8"
  );

test(
  "HSPP-008B6 persists through the dedicated provider-observation table",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_safety_provider_observations"\s*\)/s
    );

    assert.match(
      source,
      /\.insert\(row\)/
    );
  }
);

test(
  "provider observation persistence uses provider-native source identity",
  () => {
    for (const field of [
      "organization_id",
      "provider",
      "source_stream",
      "provider_message_id",
    ]) {
      assert.match(
        source,
        new RegExp(field)
      );
    }
  }
);

test(
  "provider observation persistence stores provider observation time and normalized payload",
  () => {
    assert.match(
      source,
      /observed_at/
    );

    assert.match(
      source,
      /received_at/
    );

    assert.match(
      source,
      /payload_schema_version/
    );

    assert.match(
      source,
      /normalized_payload/
    );
  }
);

test(
  "duplicate provider observation identity is resolved through PostgreSQL 23505",
  () => {
    assert.match(
      source,
      /error\.code !== "23505"/
    );

    assert.match(
      source,
      /\.maybeSingle\(\)/
    );
  }
);

test(
  "duplicate recovery is scoped to the complete provider identity",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"organization_id"/s
    );

    assert.match(
      source,
      /\.eq\(\s*"provider"/s
    );

    assert.match(
      source,
      /\.eq\(\s*"source_stream"/s
    );

    assert.match(
      source,
      /\.eq\(\s*"provider_message_id"/s
    );
  }
);

test(
  "duplicate identity cannot overwrite immutable provider provenance",
  () => {
    assert.doesNotMatch(
      source,
      /\.update\(/
    );

    assert.doesNotMatch(
      source,
      /\.upsert\(/
    );

    assert.match(
      source,
      /assertExistingObservationMatches/
    );
  }
);

test(
  "duplicate observations fail closed when observed time changes",
  () => {
    assert.match(
      source,
      /observedAt does not match the existing immutable observation/
    );
  }
);

test(
  "duplicate observations fail closed when schema changes",
  () => {
    assert.match(
      source,
      /payload schema does not match the existing immutable observation/
    );
  }
);

test(
  "duplicate observations fail closed when normalized payload changes",
  () => {
    assert.match(
      source,
      /normalized payload does not match the existing immutable observation/
    );
  }
);

test(
  "persistence does not touch mutable Route Safety alerts or create HSPP evidence",
  () => {
    assert.doesNotMatch(
      source,
      /route_safety_alerts/
    );

    assert.doesNotMatch(
      source,
      /hspp_evidence/
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidence/
    );
  }
);
