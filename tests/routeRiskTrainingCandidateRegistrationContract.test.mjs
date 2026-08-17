import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/cron/route-risk-training/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test("training cron registers only after immutable training-run persistence", () => {
  const persistIndex =
    source.indexOf(
      "await persistRouteRiskTrainingRun"
    );

  const registerIndex =
    source.indexOf(
      "await registerRouteRiskModelCandidate"
    );

  assert.ok(
    persistIndex >= 0,
    "training-run persistence must exist"
  );

  assert.ok(
    registerIndex >= 0,
    "candidate registration must exist"
  );

  assert.ok(
    persistIndex < registerIndex,
    "candidate registration must happen after immutable persistence"
  );
});

test("training cron registers the persisted training run for the server-controlled organization", () => {
  assert.match(
    source,
    /registerRouteRiskModelCandidate\(\{\s*supabase,\s*organizationId,\s*trainingRunId:\s*persisted\.id,\s*\}\)/
  );
});

test("training cron returns candidate lifecycle identity", () => {
  assert.match(
    source,
    /trainingRunId:\s*persisted\.id/
  );

  assert.match(
    source,
    /registryId:\s*registered\.registryId/
  );

  assert.match(
    source,
    /lifecycleStatus:\s*registered\.lifecycleStatus/
  );
});

test("training cron documents registration without lifecycle decision authority", () => {
  assert.match(
    source,
    /registers the persisted artifact as a lifecycle candidate/
  );

  assert.match(
    source,
    /does not approve or reject a candidate/
  );

  assert.match(
    source,
    /does not enter shadow mode/
  );

  assert.match(
    source,
    /does not activate or retire a model/
  );

  assert.match(
    source,
    /does not select a threshold/
  );

  assert.match(
    source,
    /does not modify live route-risk scoring/
  );
});

test("training cron creates no direct model-registry or lifecycle mutation authority", () => {
  assert.doesNotMatch(
    source,
    /\.from\(\s*"route_risk_model_registry"\s*\)/
  );

  assert.doesNotMatch(
    source,
    /\.insert\(/
  );

  assert.doesNotMatch(
    source,
    /\.update\(/
  );

  assert.doesNotMatch(
    source,
    /\.delete\(/
  );

  assert.doesNotMatch(
    source,
    /approved_at|rejected_at|shadow_started_at|activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /retrainingDecision|activationDecision|rolloutReady/
  );
});
