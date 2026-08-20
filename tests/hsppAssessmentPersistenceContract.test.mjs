import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260820123000_add_hspp_assessment_provenance.sql",
  "utf8"
);

const helper = fs.readFileSync(
  "lib/hspp/applyHsppAssessmentDecision.ts",
  "utf8"
);

const pipeline = fs.readFileSync(
  "lib/telematics/processTelematicsPosition.ts",
  "utf8"
);

test("HSPP assessment provenance is stored explicitly", () => {
  assert.match(
    migration,
    /assessment_policy_version/
  );

  assert.match(
    migration,
    /assessment_reason/
  );

  assert.match(
    migration,
    /assessed_at/
  );
});

test("HSPP assessment provenance is all-or-nothing", () => {
  assert.match(
    migration,
    /num_nonnulls\([\s\S]*assessment_policy_version[\s\S]*assessment_reason[\s\S]*assessed_at[\s\S]*\)\s+in\s+\(0,\s*3\)/
  );
});

test("HSPP assessment update is tenant and integrity scoped", () => {
  assert.match(
    helper,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
  );

  assert.match(
    helper,
    /\.eq\(\s*"id",\s*normalizedEvidenceId\s*\)/
  );

  assert.match(
    helper,
    /\.eq\(\s*"integrity_fingerprint",\s*normalizedFingerprint\s*\)/
  );
});

test("HSPP assessment update persists policy provenance", () => {
  assert.match(
    helper,
    /assessment_policy_version:\s*assessment\.policyVersion/
  );

  assert.match(
    helper,
    /assessment_reason:\s*assessment\.reason/
  );

  assert.match(
    helper,
    /assessed_at:\s*normalizedAssessedAt/
  );
});

test("Traccar pipeline applies assessment after location processing", () => {
  const processingIndex =
    pipeline.indexOf(
      "await processVehicleLocationUpdate({"
    );

  const assessmentIndex =
    pipeline.indexOf(
      "assessHsppTraccarEvidence({"
    );

  const applyIndex =
    pipeline.indexOf(
      "await applyHsppAssessmentDecision({"
    );

  assert.ok(processingIndex >= 0);
  assert.ok(assessmentIndex > processingIndex);
  assert.ok(applyIndex > assessmentIndex);
});

test("Traccar pipeline applies assessment before receipt completion", () => {
  const applyIndex =
    pipeline.indexOf(
      "await applyHsppAssessmentDecision({"
    );

  const completeIndex =
    pipeline.indexOf(
      "await completeTelematicsMessage({"
    );

  assert.ok(applyIndex >= 0);
  assert.ok(completeIndex > applyIndex);
});

test("HSPP-006B never hard-codes Crowd or ML eligibility true", () => {
  assert.doesNotMatch(
    helper,
    /crowd_eligible:\s*true/
  );

  assert.doesNotMatch(
    helper,
    /training_eligible:\s*true/
  );

  assert.doesNotMatch(
    pipeline,
    /crowdEligible:\s*true/
  );

  assert.doesNotMatch(
    pipeline,
    /trainingEligible:\s*true/
  );
});
