import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reader = fs.readFileSync(
  "lib/hspp/readAndVerifyHsppEvidence.ts",
  "utf8"
);

const decision = fs.readFileSync(
  "lib/hspp/decideHsppOperationalUse.ts",
  "utf8"
);

test("persisted HSPP read includes operational eligibility", () => {
  assert.match(
    reader,
    /"operational_eligible"/
  );

  assert.match(
    reader,
    /operationalEligible:/
  );
});

test("persisted HSPP read includes assessment provenance", () => {
  assert.match(
    reader,
    /"assessment_policy_version"/
  );

  assert.match(
    reader,
    /"assessment_reason"/
  );

  assert.match(
    reader,
    /"assessed_at"/
  );
});

test("operational use requires integrity MATCH", () => {
  assert.match(
    decision,
    /verification\.status !== "MATCH"/
  );
});

test("operational use requires validated evidence", () => {
  assert.match(
    decision,
    /validationState !==\s*"VALIDATED"/
  );
});

test("operational use requires assessment provenance", () => {
  assert.match(
    decision,
    /assessmentPolicyVersion/
  );

  assert.match(
    decision,
    /assessmentReason/
  );

  assert.match(
    decision,
    /assessedAt/
  );
});

test("operational use requires an operational trust state", () => {
  assert.match(decision, /"PLAUSIBLE"/);
  assert.match(decision, /"CORROBORATED"/);
  assert.match(decision, /"VERIFIED"/);
});

test("operational use explicitly requires operational eligibility true", () => {
  assert.match(
    decision,
    /operationalEligible !==\s*true/
  );
});

test("HSPP-007A performs no database writes", () => {
  assert.doesNotMatch(
    decision,
    /\.insert\(/
  );

  assert.doesNotMatch(
    decision,
    /\.update\(/
  );

  assert.doesNotMatch(
    decision,
    /\.upsert\(/
  );

  assert.doesNotMatch(
    decision,
    /supabase/
  );
});
