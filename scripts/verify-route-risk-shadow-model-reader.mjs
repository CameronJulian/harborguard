import fs from "node:fs";

const parserPath =
  "lib/fleet/parseRouteRiskLogisticBaselineModel.ts";

const scorerPath =
  "lib/fleet/scoreRouteRiskLogisticModel.ts";

const readerPath =
  "lib/fleet/readRouteRiskShadowModelArtifact.ts";

const parser =
  fs.readFileSync(
    parserPath,
    "utf8"
  );

const scorer =
  fs.readFileSync(
    scorerPath,
    "utf8"
  );

const reader =
  fs.readFileSync(
    readerPath,
    "utf8"
  );

function requireContains(
  text,
  expected,
  label
) {
  if (!text.includes(expected)) {
    throw new Error(
      `Missing ${label}: ${expected}`
    );
  }
}

for (const required of [
  "parseRouteRiskLogisticBaselineModel",
  "ROUTE_RISK_LOGISTIC_BASELINE_VERSION",
  "ROUTE_RISK_TRAINING_CONTRACT_VERSION",
  "ROUTE_RISK_FEATURE_SCHEMA_VERSION",
  "ROUTE_RISK_LABEL_SCHEMA_VERSION",
  "ROUTE_RISK_LOGISTIC_FEATURE_ORDER",
  "ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR",
  "model.training.exampleCount",
  "model.training.positiveCount",
  "model.training.negativeCount",
  "model.training.epochs",
  "model.training.learningRate",
  "model.training.finalLoss",
]) {
  requireContains(
    parser,
    required,
    "persisted model parser contract"
  );
}

requireContains(
  scorer,
  "parseRouteRiskLogisticBaselineModel",
  "shared parser usage in scorer"
);

if (
  scorer.includes(
    "function validateModel("
  )
) {
  throw new Error(
    "Scorer still contains duplicate model validator."
  );
}

for (const required of [
  'import "server-only"',
  "readRouteRiskShadowModelArtifact",
  '"route_risk_model_registry"',
  '"route_risk_training_runs"',
  '"organization_id"',
  '"lifecycle_status"',
  '"shadow"',
  ".limit(2)",
  "registryRows.length === 0",
  "registryRows.length > 1",
  ".maybeSingle()",
  "parseRouteRiskLogisticBaselineModel",
]) {
  requireContains(
    reader,
    required,
    "shadow artifact reader contract"
  );
}

for (const forbidden of [
  ".insert(",
  ".update(",
  ".delete(",
  ".upsert(",
  ".rpc(",
  "scoreRouteRiskLogisticModel(",
  "route_prediction_snapshots",
  "route_prediction_outcomes",
  "route_prediction_evaluations",
]) {
  if (reader.includes(forbidden)) {
    throw new Error(
      `Reader contains forbidden behavior: ${forbidden}`
    );
  }
}

console.log(
  "PASS: persisted model JSON parser contract present"
);

console.log(
  "PASS: scorer reuses persisted model parser"
);

console.log(
  "PASS: shadow reader detects zero/one/multiple registry rows"
);

console.log(
  "PASS: shadow reader scopes registry and training artifact by organization"
);

console.log(
  "PASS: shadow reader is SELECT-only and performs no scoring"
);

console.log(
  "PASS: no Route Safety persistence contract referenced"
);
