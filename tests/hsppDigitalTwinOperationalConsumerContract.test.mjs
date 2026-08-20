import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const wrapper = fs.readFileSync(
  "lib/hspp/readHsppEvidenceForOperationalUse.ts",
  "utf8"
);

const digitalTwin = fs.readFileSync(
  "app/api/fleet/digital-twin/route.ts",
  "utf8"
);

test("operational-read wrapper uses persisted HSPP verification", () => {
  assert.match(
    wrapper,
    /readAndVerifyHsppEvidence/
  );
});

test("operational-read wrapper applies HSPP operational policy", () => {
  assert.match(
    wrapper,
    /decideHsppOperationalUse/
  );
});

test("Digital Twin reads HSPP evidence linkage", () => {
  assert.match(
    digitalTwin,
    /hspp_evidence_id/
  );
});

test("Digital Twin invokes the HSPP operational-read boundary", () => {
  assert.match(
    digitalTwin,
    /readHsppEvidenceForOperationalUse/
  );
});

test("Digital Twin preserves unlinked location behavior", () => {
  assert.match(
    digitalTwin,
    /if\s*\(\s*!evidenceId\s*\)\s*\{\s*continue;/
  );
});

test("Digital Twin rejects linked evidence denied by HSPP", () => {
  assert.match(
    digitalTwin,
    /if\s*\(\s*!operationalRead\.decision\.allowed\s*\)/
  );

  assert.match(
    digitalTwin,
    /deniedHsppVehicleIds\.add/
  );
});

test("HSPP-007C does not mutate HSPP evidence", () => {
  assert.doesNotMatch(
    wrapper,
    /\.insert\(/
  );

  assert.doesNotMatch(
    wrapper,
    /\.update\(/
  );

  assert.doesNotMatch(
    wrapper,
    /\.upsert\(/
  );
});

test("HSPP-007C does not gate Fleet Live or Dispatch Tracking", () => {
  assert.doesNotMatch(
    digitalTwin,
    /api\/fleet\/live/
  );

  assert.doesNotMatch(
    digitalTwin,
    /dispatch\/tracking/
  );
});
