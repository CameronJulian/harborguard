import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const policyPath =
  "lib/hspp/evaluateHsppAssemblyMembership.ts";

const source =
  fs.readFileSync(policyPath, "utf8");

test(
  "B11A2 defines an explicitly versioned membership policy",
  () => {
    assert.match(
      source,
      /HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION/
    );

    assert.match(
      source,
      /hspp-assembly-membership-v1/
    );
  }
);

test(
  "membership decision is pure and performs no database writes",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\s*\(/
    );
  }
);

test(
  "membership requires tenant identity compatibility",
  () => {
    assert.match(
      source,
      /ORGANIZATION_MISMATCH/
    );

    assert.match(
      source,
      /firstOrganizationId\s*!==\s*secondOrganizationId/
    );
  }
);

test(
  "membership rejects the same immutable evidence identity",
  () => {
    assert.match(
      source,
      /SAME_EVIDENCE/
    );

    assert.match(
      source,
      /firstEvidenceId\s*===\s*secondEvidenceId/
    );
  }
);

test(
  "membership verifies lowercase SHA-256 fingerprints",
  () => {
    assert.match(
      source,
      /\^\[0-9a-f\]\{64\}\$/
    );

    assert.match(
      source,
      /INVALID_FINGERPRINT/
    );
  }
);

test(
  "membership requires compatible source classes",
  () => {
    assert.match(
      source,
      /SOURCE_CLASS_MISMATCH/
    );

    assert.match(
      source,
      /firstSourceClass\s*!==\s*secondSourceClass/
    );
  }
);

test(
  "membership fails closed on blank organization or evidence identity",
  () => {
    assert.match(
      source,
      /INVALID_ORGANIZATION_ID/
    );

    assert.match(
      source,
      /INVALID_EVIDENCE_ID/
    );

    assert.match(
      source,
      /organizationId\.trim\(\)/
    );

    assert.match(
      source,
      /evidenceId\.trim\(\)/
    );
  }
);

test(
  "membership cannot infer distinct providers when provider identity is missing",
  () => {
    assert.match(
      source,
      /MISSING_PROVIDER/
    );

    assert.match(
      source,
      /!firstProvider\s*\|\|\s*!secondProvider/
    );
  }
);
test(
  "membership v1 prevents same-provider corroboration candidates",
  () => {
    assert.match(
      source,
      /SAME_PROVIDER/
    );

    assert.match(
      source,
      /firstProvider\s*===\s*secondProvider/
    );
  }
);

test(
  "membership uses provider observation time rather than ingestion time",
  () => {
    assert.match(
      source,
      /observedAt/
    );

    assert.doesNotMatch(
      source,
      /receivedAt/
    );

    assert.doesNotMatch(
      source,
      /createdAt/
    );
  }
);

test(
  "membership has an explicit bounded temporal window",
  () => {
    assert.match(
      source,
      /HSPP_ASSEMBLY_MAX_TIME_DELTA_MS/
    );

    assert.match(
      source,
      /TIME_WINDOW_EXCEEDED/
    );
  }
);

test(
  "membership reuses the canonical geographic distance primitive",
  () => {
    assert.match(
      source,
      /getDistanceMeters/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_MAX_DISTANCE_METERS/
    );

    assert.match(
      source,
      /DISTANCE_EXCEEDED/
    );
  }
);

test(
  "membership requires normalized event-type compatibility",
  () => {
    assert.match(
      source,
      /EVENT_TYPE_MISMATCH/
    );

    assert.match(
      source,
      /firstEventType\s*!==\s*secondEventType/
    );
  }
);

test(
  "eligible means assembly candidate only and grants no downstream authority",
  () => {
    assert.match(
      source,
      /ELIGIBLE does NOT mean/
    );

    assert.match(
      source,
      /same physical-world event has been proven/
    );

    assert.match(
      source,
      /corroborates the other/
    );

    assert.match(
      source,
      /Crowd Intelligence is authorized/
    );

    assert.match(
      source,
      /ML training or validation is authorized/
    );
  }
);
