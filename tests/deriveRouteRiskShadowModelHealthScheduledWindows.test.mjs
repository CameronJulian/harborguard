import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPath =
  "lib/fleet/deriveRouteRiskShadowModelHealthScheduledWindows.ts";

const source =
  fs.readFileSync(
    helperPath,
    "utf8"
  );

test(
  "scheduled model-health windows require explicit versioned configuration",
  () => {
    assert.match(
      source,
      /ROUTE_RISK_MODEL_HEALTH_WINDOW_POLICY_VERSION/
    );

    assert.match(
      source,
      /ROUTE_RISK_MODEL_HEALTH_REFERENCE_WINDOW_DAYS/
    );

    assert.match(
      source,
      /ROUTE_RISK_MODEL_HEALTH_RECENT_WINDOW_DAYS/
    );

    assert.match(
      source,
      /function requireConfiguredValue/
    );

    assert.match(
      source,
      /function parsePositiveInteger/
    );

    assert.doesNotMatch(
      source,
      /referenceWindowDays:\s*\d/
    );

    assert.doesNotMatch(
      source,
      /recentWindowDays:\s*\d/
    );
  }
);

test(
  "window policy derives from completed UTC days rather than rolling invocation time",
  () => {
    assert.match(
      source,
      /function startOfUtcDay/
    );

    assert.match(
      source,
      /Date\.UTC\(/
    );

    assert.match(
      source,
      /anchorUtcDayStart/
    );

    assert.match(
      source,
      /recentEnd[\s\S]*anchorUtcDayStart\.getTime\(\) - 1/
    );
  }
);

test(
  "reference and recent windows are contiguous in time without inclusive overlap",
  () => {
    assert.match(
      source,
      /recentStart[\s\S]*anchorUtcDayStart\.getTime\(\)[\s\S]*recentWindowDays/
    );

    assert.match(
      source,
      /referenceEnd[\s\S]*recentStart\.getTime\(\) - 1/
    );

    assert.match(
      source,
      /referenceStart[\s\S]*recentStart\.getTime\(\)[\s\S]*referenceWindowDays/
    );
  }
);

test(
  "window derivation accepts an injected clock boundary for deterministic verification",
  () => {
    assert.match(
      source,
      /now = new Date\(\)/
    );

    assert.match(
      source,
      /requireValidDate\(\s*now,\s*"now"\s*\)/
    );
  }
);

test(
  "same UTC day yields stable immutable observation identity",
  () => {
    assert.match(
      source,
      /Every invocation during the same UTC day derives identical timestamps/
    );

    assert.match(
      source,
      /preserving immutable observation retry identity/
    );
  }
);

test(
  "scheduled window policy creates no statistical lifecycle retraining or Route Safety authority",
  () => {
    assert.match(
      source,
      /does NOT:[\s\S]*define statistical sufficiency/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*define promotion thresholds/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*classify drift or degradation/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*trigger retraining/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*mutate model lifecycle state/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*modify production Route Safety/i
    );

    assert.doesNotMatch(
      source,
      /route_risk_model_registry/
    );

    assert.doesNotMatch(
      source,
      /persistRouteRiskShadowModelHealthObservation/
    );
  }
);
