export const ROUTE_RISK_RETRAINING_READINESS_ASSESSMENT_VERSION =
  "harborguard-route-risk-retraining-readiness-v1" as const;

export type RouteRiskRetrainingReadinessState =
  | "NOT_READY_FOR_TRAINING"
  | "READY_FOR_TRAINING";

export type RouteRiskRetrainingReadinessPolicy = {
  policyVersion: string;

  minimumTotalExamples: number;

  minimumTrainingExamples: number;

  minimumValidationExamples: number;

  minimumTestExamples: number;

  minimumTrainingPositiveExamples: number;

  minimumTrainingNegativeExamples: number;
};

export type RouteRiskRetrainingDatasetEvidence = {
  datasetFingerprint: string;

  counts: {
    total: number;
    train: number;
    validation: number;
    test: number;
  };

  trainingClassCounts: {
    positive: number;
    negative: number;
  };
};

export type RouteRiskPreviousTrainingIdentity = {
  trainingRunId: string;
  datasetFingerprint: string;
} | null;

export type AssessRouteRiskRetrainingReadinessInput = {
  dataset:
    RouteRiskRetrainingDatasetEvidence;

  previousTraining:
    RouteRiskPreviousTrainingIdentity;

  policy:
    RouteRiskRetrainingReadinessPolicy;
};

export type RouteRiskRetrainingReadinessAssessment = {
  assessmentVersion:
    typeof ROUTE_RISK_RETRAINING_READINESS_ASSESSMENT_VERSION;

  policyVersion: string;

  state:
    RouteRiskRetrainingReadinessState;

  semantics:
    "TRAINING_EXECUTION_INPUT_ONLY_NO_LIFECYCLE_OR_PRODUCTION_AUTHORITY";

  reasonCodes: string[];

  checks: {
    datasetChanged: {
      currentDatasetFingerprint: string;

      previousDatasetFingerprint:
        string | null;

      satisfied: boolean;
    };

    totalExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    trainingExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    validationExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    testExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    trainingPositiveExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    trainingNegativeExamples: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };
  };
};

function requireNonBlankString(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireSha256Fingerprint(
  value: string,
  fieldName: string
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized
    )
  ) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 hexadecimal fingerprint.`
    );
  }

  return normalized;
}

function requireNonNegativeInteger(
  value: number,
  fieldName: string
): number {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer.`
    );
  }

  return value;
}

/**
 * Evaluates whether an already-derived deterministic route-risk dataset
 * contains enough structurally usable and genuinely new evidence to justify
 * executing another offline training run.
 *
 * This is a pre-training policy boundary only.
 *
 * It:
 *
 * - consumes deterministic dataset identity and split counts;
 * - consumes explicit training-class counts;
 * - compares the dataset fingerprint with the previous training run;
 * - evaluates only caller-supplied structural minimums;
 * - produces deterministic reason codes.
 *
 * It does NOT:
 *
 * - read or write the database;
 * - train a model;
 * - persist a training run;
 * - register a candidate;
 * - approve or reject a candidate;
 * - enter shadow mode;
 * - calculate promotion readiness;
 * - activate or retire a model;
 * - classify model health or drift;
 * - choose production thresholds;
 * - modify Route Safety behavior.
 */
export function assessRouteRiskRetrainingReadiness({
  dataset,
  previousTraining,
  policy,
}: AssessRouteRiskRetrainingReadinessInput): RouteRiskRetrainingReadinessAssessment {
  const policyVersion =
    requireNonBlankString(
      policy.policyVersion,
      "policy.policyVersion"
    );

  const currentDatasetFingerprint =
    requireSha256Fingerprint(
      dataset.datasetFingerprint,
      "dataset.datasetFingerprint"
    );

  const previousDatasetFingerprint =
    previousTraining === null
      ? null
      : requireSha256Fingerprint(
          previousTraining.datasetFingerprint,
          "previousTraining.datasetFingerprint"
        );

  if (previousTraining !== null) {
    requireNonBlankString(
      previousTraining.trainingRunId,
      "previousTraining.trainingRunId"
    );
  }

  const totalExamples =
    requireNonNegativeInteger(
      dataset.counts.total,
      "dataset.counts.total"
    );

  const trainingExamples =
    requireNonNegativeInteger(
      dataset.counts.train,
      "dataset.counts.train"
    );

  const validationExamples =
    requireNonNegativeInteger(
      dataset.counts.validation,
      "dataset.counts.validation"
    );

  const testExamples =
    requireNonNegativeInteger(
      dataset.counts.test,
      "dataset.counts.test"
    );

  const trainingPositiveExamples =
    requireNonNegativeInteger(
      dataset.trainingClassCounts.positive,
      "dataset.trainingClassCounts.positive"
    );

  const trainingNegativeExamples =
    requireNonNegativeInteger(
      dataset.trainingClassCounts.negative,
      "dataset.trainingClassCounts.negative"
    );

  if (
    trainingExamples +
      validationExamples +
      testExamples !==
    totalExamples
  ) {
    throw new Error(
      "Dataset split counts must equal dataset.counts.total."
    );
  }

  if (
    trainingPositiveExamples +
      trainingNegativeExamples !==
    trainingExamples
  ) {
    throw new Error(
      "Training class counts must equal dataset.counts.train."
    );
  }

  const minimumTotalExamples =
    requireNonNegativeInteger(
      policy.minimumTotalExamples,
      "policy.minimumTotalExamples"
    );

  const minimumTrainingExamples =
    requireNonNegativeInteger(
      policy.minimumTrainingExamples,
      "policy.minimumTrainingExamples"
    );

  const minimumValidationExamples =
    requireNonNegativeInteger(
      policy.minimumValidationExamples,
      "policy.minimumValidationExamples"
    );

  const minimumTestExamples =
    requireNonNegativeInteger(
      policy.minimumTestExamples,
      "policy.minimumTestExamples"
    );

  const minimumTrainingPositiveExamples =
    requireNonNegativeInteger(
      policy.minimumTrainingPositiveExamples,
      "policy.minimumTrainingPositiveExamples"
    );

  const minimumTrainingNegativeExamples =
    requireNonNegativeInteger(
      policy.minimumTrainingNegativeExamples,
      "policy.minimumTrainingNegativeExamples"
    );

  const datasetChanged =
    previousDatasetFingerprint === null ||
    previousDatasetFingerprint !==
      currentDatasetFingerprint;

  const totalExamplesSatisfied =
    totalExamples >=
      minimumTotalExamples;

  const trainingExamplesSatisfied =
    trainingExamples >=
      minimumTrainingExamples;

  const validationExamplesSatisfied =
    validationExamples >=
      minimumValidationExamples;

  const testExamplesSatisfied =
    testExamples >=
      minimumTestExamples;

  const trainingPositiveExamplesSatisfied =
    trainingPositiveExamples >=
      minimumTrainingPositiveExamples;

  const trainingNegativeExamplesSatisfied =
    trainingNegativeExamples >=
      minimumTrainingNegativeExamples;

  const reasonCodes: string[] = [];

  if (!datasetChanged) {
    reasonCodes.push(
      "DATASET_UNCHANGED_SINCE_PREVIOUS_TRAINING"
    );
  }

  if (!totalExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_TOTAL_EXAMPLES_NOT_MET"
    );
  }

  if (!trainingExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_TRAINING_EXAMPLES_NOT_MET"
    );
  }

  if (!validationExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_VALIDATION_EXAMPLES_NOT_MET"
    );
  }

  if (!testExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_TEST_EXAMPLES_NOT_MET"
    );
  }

  if (!trainingPositiveExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_TRAINING_POSITIVE_EXAMPLES_NOT_MET"
    );
  }

  if (!trainingNegativeExamplesSatisfied) {
    reasonCodes.push(
      "MINIMUM_TRAINING_NEGATIVE_EXAMPLES_NOT_MET"
    );
  }

  const readyForTraining =
    datasetChanged &&
    totalExamplesSatisfied &&
    trainingExamplesSatisfied &&
    validationExamplesSatisfied &&
    testExamplesSatisfied &&
    trainingPositiveExamplesSatisfied &&
    trainingNegativeExamplesSatisfied;

  return {
    assessmentVersion:
      ROUTE_RISK_RETRAINING_READINESS_ASSESSMENT_VERSION,

    policyVersion,

    state:
      readyForTraining
        ? "READY_FOR_TRAINING"
        : "NOT_READY_FOR_TRAINING",

    semantics:
      "TRAINING_EXECUTION_INPUT_ONLY_NO_LIFECYCLE_OR_PRODUCTION_AUTHORITY",

    reasonCodes,

    checks: {
      datasetChanged: {
        currentDatasetFingerprint,

        previousDatasetFingerprint,

        satisfied:
          datasetChanged,
      },

      totalExamples: {
        observed:
          totalExamples,

        requiredMinimum:
          minimumTotalExamples,

        satisfied:
          totalExamplesSatisfied,
      },

      trainingExamples: {
        observed:
          trainingExamples,

        requiredMinimum:
          minimumTrainingExamples,

        satisfied:
          trainingExamplesSatisfied,
      },

      validationExamples: {
        observed:
          validationExamples,

        requiredMinimum:
          minimumValidationExamples,

        satisfied:
          validationExamplesSatisfied,
      },

      testExamples: {
        observed:
          testExamples,

        requiredMinimum:
          minimumTestExamples,

        satisfied:
          testExamplesSatisfied,
      },

      trainingPositiveExamples: {
        observed:
          trainingPositiveExamples,

        requiredMinimum:
          minimumTrainingPositiveExamples,

        satisfied:
          trainingPositiveExamplesSatisfied,
      },

      trainingNegativeExamples: {
        observed:
          trainingNegativeExamples,

        requiredMinimum:
          minimumTrainingNegativeExamples,

        satisfied:
          trainingNegativeExamplesSatisfied,
      },
    },
  };
}
