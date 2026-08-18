import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPath =
  "lib/fleet/evaluateCompletedTripRouteRiskShadowPredictions.ts";

const source =
  fs.readFileSync(helperPath, "utf8");

test(
  "completed-trip shadow evaluation reads evidence cycle from its source prediction",
  () => {
    assert.match(
      source,
      /\.from\(\s*["']route_risk_shadow_predictions["']\s*\)[\s\S]*?\.select\([\s\S]*?evidence_cycle_id[\s\S]*?\)/,
      "evaluation helper must read evidence_cycle_id from the immutable source prediction"
    );
  }
);

test(
  "completed-trip shadow evaluation persists source prediction evidence cycle",
  () => {
    assert.match(
      source,
      /\.from\(\s*["']route_risk_shadow_evaluations["']\s*\)[\s\S]*?\.insert\(\s*\{[\s\S]*?evidence_cycle_id\s*:\s*[\s\S]*?prediction\.evidence_cycle_id/,
      "evaluation insert must inherit evidence_cycle_id from its source prediction"
    );
  }
);

test(
  "evaluation requires nonblank source prediction evidence cycle identity",
  () => {
    assert.match(
      source,
      /requireNonBlankString\(\s*prediction\.evidence_cycle_id\s*,\s*["']prediction\.evidence_cycle_id["']\s*\)/,
      "new evaluation writes must fail closed when prediction evidence-cycle identity is missing"
    );
  }
);

test(
  "evaluation does not resolve a different open evidence cycle",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*["']route_risk_shadow_evidence_cycles["']\s*\)/,
      "evaluation must inherit cycle provenance from its immutable prediction rather than resolving the currently open cycle"
    );
  }
);

test(
  "evaluation cycle propagation preserves idempotency",
  () => {
    assert.match(
      source,
      /existingPredictionIds/,
      "existing prediction-id idempotency boundary must remain intact"
    );

    assert.match(
      source,
      /insertError\.code\s*===\s*["']23505["']/,
      "PostgreSQL duplicate recovery must remain intact"
    );
  }
);

test(
  "evaluation cycle propagation creates no production Route Safety authority",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*["']route_prediction_snapshots["']\s*\)[\s\S]*?\.update\(/
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*["'][^"']*(?:reroute|escalat)[^"']*["']/i
    );
  }
);
