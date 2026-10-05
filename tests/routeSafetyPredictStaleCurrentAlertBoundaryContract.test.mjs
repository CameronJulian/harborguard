import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/api/route-safety/predict/route.ts",
  "utf8",
);

function currentAlertBlock() {
  const currentStart = source.indexOf(
    "const currentAlertThreatInputs =",
  );

  const mergeStart = source.indexOf(
    "const threatInputs = [",
    currentStart,
  );

  assert.ok(currentStart >= 0);
  assert.ok(mergeStart > currentStart);

  return source.slice(currentStart, mergeStart);
}

test("stale current route-safety alerts are excluded before provenance merge", () => {
  const block = currentAlertBlock();

  assert.match(block, /route_safety_alert_id/);
  assert.match(block, /classifyIntelligenceFreshness/);
  assert.match(block, /last_provider_confirmation_at/);
  assert.match(block, /created_at/);
  assert.match(block, /verification_count/);
  assert.match(block, /!== "stale"/);
});

test("needs-verification current alerts remain eligible", () => {
  const block = currentAlertBlock();

  assert.doesNotMatch(
    block,
    /!== "needs_verification"/,
  );

  assert.doesNotMatch(
    block,
    /=== "fresh"/,
  );
});

test("historical intelligence remains outside the stale current-alert filter", () => {
  const historicalStart = source.indexOf(
    "const historicalThreatInputs =",
  );

  const currentStart = source.indexOf(
    "const currentAlertThreatInputs =",
    historicalStart,
  );

  assert.ok(historicalStart >= 0);
  assert.ok(currentStart > historicalStart);

  const block = source.slice(
    historicalStart,
    currentStart,
  );

  assert.doesNotMatch(
    block,
    /!== "stale"/,
  );
});

test("current and historical threat provenance still merge separately", () => {
  const mergeStart = source.indexOf(
    "const threatInputs = [",
  );

  const candidateStart = source.indexOf(
    "const candidateRouteThreats",
    mergeStart,
  );

  assert.ok(mergeStart >= 0);
  assert.ok(candidateStart > mergeStart);

  const block = source.slice(
    mergeStart,
    candidateStart,
  );

  assert.match(block, /\.\.\.currentAlertThreatInputs/);
  assert.match(block, /\.\.\.historicalThreatInputs/);
});

test("existing active-status and expiry database boundary remains intact", () => {
  assert.match(
    source,
    /\.eq\("status", "active"\)/,
  );

  assert.match(
    source,
    /expires_at\.is\.null,expires_at\.gt/,
  );
});
