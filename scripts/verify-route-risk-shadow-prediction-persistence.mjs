import fs from "node:fs";
import process from "node:process";

const helperPath =
  "lib/fleet/persistRouteRiskShadowPrediction.ts";

const routeSafetyPath =
  "app/api/route-safety/predict/route.ts";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

if (!fs.existsSync(helperPath)) {
  fail("shadow persistence helper does not exist");
}

const helper =
  fs.readFileSync(
    helperPath,
    "utf8"
  );

const requiredFragments = [
  'import "server-only";',
  "SupabaseClient",
  "RouteRiskShadowModelArtifact",
  "RouteRiskLogisticPredictionFeatures",
  "RouteRiskLogisticPrediction",
  "persistRouteRiskShadowPrediction",
  '"route_risk_shadow_predictions"',
  "production_snapshot_id",
  "model_registry_id",
  "training_run_id",
  "feature_schema_version",
  "training_contract_version",
  "label_schema_version",
  "algorithm_version",
  "run_version",
  "dataset_fingerprint",
  "overall_risk_score",
  "threat_risk_score",
  "weather_risk_score",
  "traffic_risk_score",
  "predicted_probability",
  'insertError.code !== "23505"',
  'status: "created"',
  'status: "existing"',
];

for (const fragment of requiredFragments) {
  if (!helper.includes(fragment)) {
    fail(
      `required helper contract fragment missing: ${fragment}`
    );
  }
}

pass(
  "trusted shadow persistence contract present"
);

if (
  helper.includes(
    "SUPABASE_SERVICE_ROLE_KEY"
  ) ||
  helper.includes(
    "createClient("
  ) ||
  helper.includes(
    "supabaseAdmin"
  )
) {
  fail(
    "helper constructs or imports its own trusted client"
  );
}

pass(
  "Supabase client remains caller-injected"
);

if (
  helper.includes(
    "scoreRouteRiskLogisticModel("
  )
) {
  fail(
    "persistence helper performs model scoring"
  );
}

pass(
  "persistence helper performs no model scoring"
);

if (
  helper.includes(
    "route_risk_model_registry"
  ) ||
  helper.includes(
    "lifecycle_status"
  )
) {
  fail(
    "persistence helper mutates or directly queries lifecycle state"
  );
}

pass(
  "persistence helper performs no lifecycle access"
);

const independentlySuppliedVersionFields = [
  "algorithmVersion:",
  "featureSchemaVersion:",
  "trainingContractVersion:",
  "labelSchemaVersion:",
  "runVersion:",
  "datasetFingerprint:",
];

const inputContractStart =
  helper.indexOf(
    "export type PersistRouteRiskShadowPredictionInput"
  );

const inputContractEnd =
  helper.indexOf(
    "export type PersistedRouteRiskShadowPrediction"
  );

if (
  inputContractStart < 0 ||
  inputContractEnd < 0
) {
  fail(
    "could not inspect persistence input contract"
  );
}

const inputContract =
  helper.slice(
    inputContractStart,
    inputContractEnd
  );

for (
  const field of
  independentlySuppliedVersionFields
) {
  if (inputContract.includes(field)) {
    fail(
      `model identity/version field is independently caller-supplied: ${field}`
    );
  }
}

pass(
  "model identity and versions are derived from validated artifact"
);

if (
  !helper.includes(
    ".eq(" +
      '\n        "organization_id"'
  ) ||
  !helper.includes(
    ".eq(" +
      '\n        "production_snapshot_id"'
  ) ||
  !helper.includes(
    ".eq(" +
      '\n        "model_registry_id"'
  )
) {
  fail(
    "duplicate readback is not scoped to logical shadow prediction identity"
  );
}

pass(
  "duplicate readback is organization/snapshot/model scoped"
);

if (!fs.existsSync(routeSafetyPath)) {
  fail(
    "Route Safety prediction route missing"
  );
}

const routeSafety =
  fs.readFileSync(
    routeSafetyPath,
    "utf8"
  );

const forbiddenRouteSafetyFragments = [
  "persistRouteRiskShadowPrediction",
  "route_risk_shadow_predictions",
  "readRouteRiskShadowModelArtifact",
  "scoreRouteRiskLogisticModel",
];

for (
  const fragment of
  forbiddenRouteSafetyFragments
) {
  if (routeSafety.includes(fragment)) {
    fail(
      `Route Safety unexpectedly references ML shadow execution: ${fragment}`
    );
  }
}

pass(
  "Route Safety remains ML shadow disconnected"
);

console.log("");
console.log(
  "C-1E9B5D3 STATIC CONTRACT VERIFICATION PASS"
);
