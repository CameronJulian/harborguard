import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/startRouteRiskModelRevalidationShadow.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "helper delegates only to controlled revalidation RPC",
  () => {
    assert.match(
      source,
      /ROUTE_RISK_MODEL_REVALIDATION_SHADOW_RPC/
    );

    assert.match(
      source,
      /"start_route_risk_model_revalidation_shadow"/
    );

    assert.match(
      source,
      /await supabase\.rpc/
    );

    assert.match(
      source,
      /p_registry_id/
    );

    assert.match(
      source,
      /p_rationale/
    );

    assert.doesNotMatch(
      source,
      /\.from\(/
    );

    assert.doesNotMatch(
      source,
      /\.update\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\(/
    );
  }
);

test(
  "helper requires explicit identity and rationale",
  () => {
    assert.match(
      source,
      /requireNonEmptyString\([\s\S]*registryId/
    );

    assert.match(
      source,
      /requireNonEmptyString\([\s\S]*rationale/
    );
  }
);

test(
  "helper validates revalidation registry and evidence-cycle identity",
  () => {
    assert.match(
      source,
      /registry\.lifecycle_status !== "shadow"/
    );

    assert.match(
      source,
      /registry\.activated_at/
    );

    assert.match(
      source,
      /registry\.retired_at/
    );

    assert.match(
      source,
      /evidenceCycle\.cycle_kind !==\s*"revalidation_shadow"/
    );

    assert.match(
      source,
      /evidenceCycle\.cycle_number <= 1/
    );

    assert.match(
      source,
      /evidenceCycle\.model_registry_id !==\s*registry\.id/
    );
  }
);

test(
  "helper preserves non-authoritative recovery boundary",
  () => {
    assert.match(
      source,
      /does not reactivate the model/i
    );

    assert.match(
      source,
      /creates no automatic rollback/i
    );

    assert.match(
      source,
      /does not select another model/i
    );

    assert.match(
      source,
      /does not trigger retraining/i
    );

    assert.match(
      source,
      /does not calculate promotion readiness/i
    );

    assert.match(
      source,
      /does not modify production Route Safety behavior/i
    );

    assert.doesNotMatch(
      source,
      /activateRouteRiskModel/
    );

    assert.doesNotMatch(
      source,
      /readRouteRiskShadowModelArtifact/
    );

    assert.doesNotMatch(
      source,
      /scoreRouteRisk/
    );
  }
);
