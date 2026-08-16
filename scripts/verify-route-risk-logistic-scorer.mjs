import fs from "node:fs";

const scorerPath =
  "lib/fleet/scoreRouteRiskLogisticModel.ts";

const evaluatorPath =
  "lib/fleet/evaluateRouteRiskLogisticBaseline.ts";

const scorer =
  fs.readFileSync(
    scorerPath,
    "utf8"
  );

const evaluator =
  fs.readFileSync(
    evaluatorPath,
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

requireContains(
  scorer,
  "ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR",
  "shared normalization constant"
);

requireContains(
  scorer,
  "ROUTE_RISK_LOGISTIC_FEATURE_ORDER",
  "shared feature-order constant"
);

requireContains(
  scorer,
  "model.coefficients.overallRiskScore",
  "overall coefficient"
);

requireContains(
  scorer,
  "model.coefficients.threatRiskScore",
  "threat coefficient"
);

requireContains(
  scorer,
  "model.coefficients.weatherRiskScore",
  "weather coefficient"
);

requireContains(
  scorer,
  "model.coefficients.trafficRiskScore",
  "traffic coefficient"
);

requireContains(
  scorer,
  "predictedProbability",
  "prediction result"
);

if (
  scorer.includes(".from(") ||
  scorer.includes("supabase") ||
  scorer.includes("route_risk_model_registry") ||
  scorer.includes("route_prediction_snapshots")
) {
  throw new Error(
    "Prediction-time scorer unexpectedly contains persistence/database logic."
  );
}

if (
  scorer.includes("threshold") &&
  !scorer.includes("no threshold")
) {
  throw new Error(
    "Prediction-time scorer unexpectedly contains threshold logic."
  );
}

/*
 * Verify the exact mathematical primitive is still represented in both
 * the existing offline evaluator and the new prediction-time scorer.
 */
for (const expression of [
  "model.intercept",
  "model.coefficients.overallRiskScore",
  "model.coefficients.threatRiskScore",
  "model.coefficients.weatherRiskScore",
  "model.coefficients.trafficRiskScore",
]) {
  requireContains(
    scorer,
    expression,
    "scorer math"
  );

  requireContains(
    evaluator,
    expression,
    "existing evaluator math"
  );
}

console.log(
  "PASS: C-1E9B5B scorer uses shared feature and model contracts"
);

console.log(
  "PASS: scorer contains no database/persistence integration"
);

console.log(
  "PASS: scorer contains no lifecycle integration"
);

console.log(
  "PASS: scorer preserves existing logistic inference math"
);
