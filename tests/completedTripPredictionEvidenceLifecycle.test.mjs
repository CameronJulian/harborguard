import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const lifecycleSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/runPostLocationUpdateLifecycle.ts",
      import.meta.url
    ),
    "utf8"
  );

const processorSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/processVehicleLocationUpdate.ts",
      import.meta.url
    ),
    "utf8"
  );

const updaterSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/updateActiveTripFromLocation.ts",
      import.meta.url
    ),
    "utf8"
  );

const outcomeSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/createCompletedTripOutcome.ts",
      import.meta.url
    ),
    "utf8"
  );

const evaluationSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/evaluateCompletedTripPrediction.ts",
      import.meta.url
    ),
    "utf8"
  );

test("delivered transition creates completed-trip outcome before prediction evaluation", () => {
  assert.match(
    lifecycleSource,
    /tripUpdate\.previousStatus\s*!==\s*"delivered"/
  );

  assert.match(
    lifecycleSource,
    /tripUpdate\.nextStatus\s*===\s*"delivered"/
  );

  const outcomeCallIndex =
    lifecycleSource.indexOf(
      "await createCompletedTripOutcome"
    );

  const evaluationCallIndex =
    lifecycleSource.indexOf(
      "await evaluateCompletedTripPrediction"
    );

  assert.ok(
    outcomeCallIndex >= 0,
    "completed-trip outcome call must exist"
  );

  assert.ok(
    evaluationCallIndex >= 0,
    "prediction evaluation call must exist"
  );

  assert.ok(
    outcomeCallIndex < evaluationCallIndex,
    "outcome must be created before prediction evaluation"
  );
});

test("prediction evaluation only runs after non-skipped completed-trip outcome processing", () => {
  assert.match(
    lifecycleSource,
    /if\s*\(\s*outcomeResult\.skipped\s*===\s*true\s*\)/
  );

  assert.match(
    lifecycleSource,
    /else\s*\{[\s\S]*?await evaluateCompletedTripPrediction\(\{/
  );
});

test("telemetry-skipped delivered updates still execute trip status lifecycle", () => {
  assert.match(
    processorSource,
    /if\s*\(\s*telemetryAnalysis\.skipped\s*\)/
  );

  assert.match(
    processorSource,
    /if\s*\(\s*requestedStatus\s*===\s*"delivered"\s*\)/
  );

  assert.match(
    processorSource,
    /await runTripStatusLifecycle\(\{[\s\S]*?requestedStatus,[\s\S]*?occurredAt/
  );
});

test("normal accepted location updates execute the full post-location lifecycle", () => {
  assert.match(
    processorSource,
    /await runPostLocationUpdateLifecycle\(\{/
  );

  assert.match(
    processorSource,
    /requestedStatus,/
  );

  assert.match(
    processorSource,
    /activeTripId,/
  );
});

test("trip completion persists delivered status and actual arrival", () => {
  assert.match(
    updaterSource,
    /requestedStatus\s*===\s*"delivered"/
  );

  assert.match(
    updaterSource,
    /Trip cannot be completed before actual departure is recorded/
  );

  assert.match(
    updaterSource,
    /updates\.actual_arrival\s*=\s*occurredAt/
  );

  assert.match(
    updaterSource,
    /\.from\(\s*"vehicle_trips"\s*\)[\s\S]*?\.update\(updates\)/
  );
});

test("completed-trip outcome derives adverse-event truth from trip-linked operational alerts", () => {
  assert.match(
    outcomeSource,
    /\.from\(\s*"vehicle_alerts"\s*\)/
  );

  assert.match(
    outcomeSource,
    /\.eq\(\s*"trip_id",\s*tripId\s*\)/
  );

  assert.match(
    outcomeSource,
    /\.gte\(\s*"created_at",\s*observationStartedAt\s*\)/
  );

  assert.match(
    outcomeSource,
    /\.lte\(\s*"created_at",\s*observationEndedAt\s*\)/
  );

  assert.match(
    outcomeSource,
    /adverse_event_occurred:\s*observedAlerts\.length\s*>\s*0/
  );
});

test("completed-trip prediction evaluation persists immutable labeled evidence", () => {
  assert.match(
    evaluationSource,
    /\.from\(\s*"route_prediction_outcomes"\s*\)/
  );

  assert.match(
    evaluationSource,
    /\.from\(\s*"route_prediction_snapshots"\s*\)/
  );

  assert.match(
    evaluationSource,
    /observedAdverseEvent\s*=\s*Boolean\(outcome\.adverse_event_occurred\)/
  );

  assert.match(
    evaluationSource,
    /\.from\(\s*"route_prediction_evaluations"\s*\)[\s\S]*?\.insert\(\{/
  );

  assert.match(
    evaluationSource,
    /observed_adverse_event:\s*observedAdverseEvent/
  );

  assert.match(
    evaluationSource,
    /snapshot_id:\s*snapshot\.id/
  );

  assert.match(
    evaluationSource,
    /outcome_id:\s*outcome\.id/
  );
});

test("completed-trip evidence persistence is idempotent rather than repeatedly relabeling journeys", () => {
  assert.match(
    outcomeSource,
    /\.from\(\s*"route_prediction_outcomes"\s*\)[\s\S]*?\.eq\(\s*"trip_id",\s*tripId\s*\)[\s\S]*?\.maybeSingle\(\)/
  );

  assert.match(
    evaluationSource,
    /\.from\(\s*"route_prediction_evaluations"\s*\)[\s\S]*?\.eq\(\s*"trip_id",\s*tripId\s*\)[\s\S]*?\.maybeSingle\(\)/
  );

  assert.match(
    outcomeSource,
    /insertError\.code\s*===\s*"23505"/
  );

  assert.match(
    evaluationSource,
    /insertError\.code\s*===\s*"23505"/
  );

  assert.doesNotMatch(
    evaluationSource,
    /\.update\(/
  );

  assert.doesNotMatch(
    evaluationSource,
    /\.delete\(/
  );
});
