export const ROUTE_RISK_TRAINING_CONTRACT_VERSION =
  "harborguard-route-risk-training-v1" as const;

export const ROUTE_RISK_FEATURE_SCHEMA_VERSION =
  "route-risk-features-v1" as const;

export const ROUTE_RISK_LABEL_SCHEMA_VERSION =
  "route-adverse-event-v1" as const;

export type RouteRiskTrainingExampleInput = {
  organizationId: string;
  vehicleId: string | null;
  tripId: string;
  snapshotId: string;
  outcomeId: string;

  predictionCreatedAt: string;
  outcomeCompletedAt: string;

  overallRiskScore: number;
  threatRiskScore: number;
  weatherRiskScore: number;
  trafficRiskScore: number;

  observedAdverseEvent: boolean;
};

export type RouteRiskTrainingExample = {
  contractVersion:
    typeof ROUTE_RISK_TRAINING_CONTRACT_VERSION;

  featureSchemaVersion:
    typeof ROUTE_RISK_FEATURE_SCHEMA_VERSION;

  labelSchemaVersion:
    typeof ROUTE_RISK_LABEL_SCHEMA_VERSION;

  provenance: {
    organizationId: string;
    vehicleId: string | null;
    tripId: string;
    snapshotId: string;
    outcomeId: string;
    predictionCreatedAt: string;
    outcomeCompletedAt: string;
  };

  features: {
    overallRiskScore: number;
    threatRiskScore: number;
    weatherRiskScore: number;
    trafficRiskScore: number;
  };

  label: {
    observedAdverseEvent: boolean;
  };
};

function parseTimestamp(
  value: string,
  fieldName: string
) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid timestamp.`
    );
  }

  return timestamp;
}

function validateRiskScore(
  value: number,
  fieldName: string
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite score between 0 and 100.`
    );
  }

  return value;
}

/**
 * Builds one deterministic supervised-learning example from the
 * already-persisted HarborGuard prediction/outcome relationship.
 *
 * Important contract boundaries:
 *
 * - Only prediction-time risk values become ML features.
 * - Post-journey outcome data becomes the label only.
 * - Identifiers remain provenance and are not feature values.
 * - Future-information leakage is rejected.
 * - No model training, persistence, scoring, or production activation
 *   occurs in this helper.
 */
export function buildRouteRiskTrainingExample(
  input: RouteRiskTrainingExampleInput
): RouteRiskTrainingExample {
  const predictionTimestamp =
    parseTimestamp(
      input.predictionCreatedAt,
      "predictionCreatedAt"
    );

  const outcomeTimestamp =
    parseTimestamp(
      input.outcomeCompletedAt,
      "outcomeCompletedAt"
    );

  if (predictionTimestamp > outcomeTimestamp) {
    throw new Error(
      "Invalid training example: predictionCreatedAt cannot be after outcomeCompletedAt."
    );
  }

  return {
    contractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    provenance: {
      organizationId:
        input.organizationId,

      vehicleId:
        input.vehicleId,

      tripId:
        input.tripId,

      snapshotId:
        input.snapshotId,

      outcomeId:
        input.outcomeId,

      predictionCreatedAt:
        input.predictionCreatedAt,

      outcomeCompletedAt:
        input.outcomeCompletedAt,
    },

    features: {
      overallRiskScore:
        validateRiskScore(
          input.overallRiskScore,
          "overallRiskScore"
        ),

      threatRiskScore:
        validateRiskScore(
          input.threatRiskScore,
          "threatRiskScore"
        ),

      weatherRiskScore:
        validateRiskScore(
          input.weatherRiskScore,
          "weatherRiskScore"
        ),

      trafficRiskScore:
        validateRiskScore(
          input.trafficRiskScore,
          "trafficRiskScore"
        ),
    },

    label: {
      observedAdverseEvent:
        Boolean(
          input.observedAdverseEvent
        ),
    },
  };
}
