import type {
  RouteRiskShadowModelArtifact,
} from "@/lib/fleet/readRouteRiskShadowModelArtifact";

import type {
  RouteRiskLogisticPredictionFeatures,
} from "@/lib/fleet/scoreRouteRiskLogisticModel";

export const ROUTE_RISK_SHADOW_EVIDENCE_ASSESSMENT_VERSION =
  "harborguard-route-risk-shadow-evidence-assessment-v1" as const;

export type RouteRiskShadowEvidenceAssessmentState =
  | "UNKNOWN"
  | "INSUFFICIENT_EVIDENCE";

export type AssessRouteRiskShadowEvidenceInput = {
  artifact: RouteRiskShadowModelArtifact;
  features: RouteRiskLogisticPredictionFeatures;
};

export type RouteRiskShadowEvidenceAssessment = {
  assessmentVersion:
    typeof ROUTE_RISK_SHADOW_EVIDENCE_ASSESSMENT_VERSION;
  state: RouteRiskShadowEvidenceAssessmentState;
  probabilitySemantics:
    "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT";
  reasonCodes: string[];
  provenance: {
    trainingRunId: string;
    runVersion: string;
    datasetFingerprint: string;
    trainingRunCreatedAt: string;
    manifestVersion: string | null;
    splitVersion: string | null;
    datasetGeneratedAt: string | null;
  };
  evidence: {
    trainingExamples: {
      total: number;
      positive: number;
      negative: number;
    };
    datasetSplitExamples: {
      total: number | null;
      train: number | null;
      validation: number | null;
      test: number | null;
    };
    evaluationExamples: {
      validation: number | null;
      test: number | null;
    };
    datasetWindow: {
      startOutcomeCompletedAt: string | null;
      endOutcomeCompletedAt: string | null;
    };
    predictionFeatureContract: {
      featureSchemaVersion: string;
      featureOrder: string[];
      valuesPersistedInShadowPredictionColumns: true;
    };
  };
  unavailableEvidence: [
    "CALIBRATION",
    "FEATURE_RANGE_FAMILIARITY",
    "GEOGRAPHIC_COVERAGE",
    "CROWD_INTELLIGENCE",
    "TEMPORAL_FRESHNESS_POLICY",
  ];
};

function validateFeature(
  value: number,
  fieldName: string
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a score between 0 and 100.`
    );
  }
}

/**
 * Describes only evidence already attached to one immutable model artifact.
 * It does not estimate confidence, calibration, or prediction uncertainty.
 */
export function assessRouteRiskShadowEvidence({
  artifact,
  features,
}: AssessRouteRiskShadowEvidenceInput): RouteRiskShadowEvidenceAssessment {
  validateFeature(
    features.overallRiskScore,
    "features.overallRiskScore"
  );
  validateFeature(
    features.threatRiskScore,
    "features.threatRiskScore"
  );
  validateFeature(
    features.weatherRiskScore,
    "features.weatherRiskScore"
  );
  validateFeature(
    features.trafficRiskScore,
    "features.trafficRiskScore"
  );

  const manifest =
    artifact.evidence.datasetManifest;

  const manifestCounts =
    manifest?.counts ?? {
      total: null,
      train: null,
      validation: null,
      test: null,
    };

  const structuralReasons: string[] = [];

  if (!manifest) {
    structuralReasons.push(
      "DATASET_MANIFEST_UNAVAILABLE"
    );
  }

  if (
    Object.values(manifestCounts).some(
      (count) => count === null
    )
  ) {
    structuralReasons.push(
      "DATASET_SPLIT_COUNTS_UNAVAILABLE"
    );
  }

  if (
    manifestCounts.total !== null &&
    manifestCounts.train !== null &&
    manifestCounts.validation !== null &&
    manifestCounts.test !== null &&
    manifestCounts.total !==
      manifestCounts.train +
        manifestCounts.validation +
        manifestCounts.test
  ) {
    structuralReasons.push(
      "DATASET_SPLIT_COUNTS_INCONSISTENT"
    );
  }

  if (
    manifestCounts.train !== null &&
    manifestCounts.train !==
      artifact.model.training.exampleCount
  ) {
    structuralReasons.push(
      "TRAINING_COUNT_MISMATCH"
    );
  }

  if (
    artifact.evidence.validationExampleCount ===
    null
  ) {
    structuralReasons.push(
      "VALIDATION_EVALUATION_COUNT_UNAVAILABLE"
    );
  } else if (
    manifestCounts.validation !== null &&
    artifact.evidence.validationExampleCount !==
      manifestCounts.validation
  ) {
    structuralReasons.push(
      "VALIDATION_COUNT_MISMATCH"
    );
  }

  if (
    artifact.evidence.testExampleCount ===
    null
  ) {
    structuralReasons.push(
      "TEST_EVALUATION_COUNT_UNAVAILABLE"
    );
  } else if (
    manifestCounts.test !== null &&
    artifact.evidence.testExampleCount !==
      manifestCounts.test
  ) {
    structuralReasons.push(
      "TEST_COUNT_MISMATCH"
    );
  }

  if (
    artifact.model.training.exampleCount === 0 ||
    artifact.model.training.positiveCount === 0 ||
    artifact.model.training.negativeCount === 0
  ) {
    structuralReasons.push(
      "TRAINING_LABEL_SUPPORT_INCOMPLETE"
    );
  }

  if (
    artifact.evidence.validationExampleCount === 0 ||
    artifact.evidence.testExampleCount === 0
  ) {
    structuralReasons.push(
      "HELD_OUT_EVIDENCE_EMPTY"
    );
  }

  return {
    assessmentVersion:
      ROUTE_RISK_SHADOW_EVIDENCE_ASSESSMENT_VERSION,
    state:
      structuralReasons.length > 0
        ? "INSUFFICIENT_EVIDENCE"
        : "UNKNOWN",
    probabilitySemantics:
      "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT",
    reasonCodes: [
      ...structuralReasons,
      "CALIBRATION_NOT_ESTABLISHED",
      "REPRESENTATIVENESS_NOT_ESTABLISHED",
    ],
    provenance: {
      trainingRunId:
        artifact.trainingRunId,
      runVersion:
        artifact.runVersion,
      datasetFingerprint:
        artifact.datasetFingerprint,
      trainingRunCreatedAt:
        artifact.trainingRunCreatedAt,
      manifestVersion:
        manifest?.manifestVersion ?? null,
      splitVersion:
        manifest?.splitVersion ?? null,
      datasetGeneratedAt:
        manifest?.generatedAt ?? null,
    },
    evidence: {
      trainingExamples: {
        total:
          artifact.model.training.exampleCount,
        positive:
          artifact.model.training.positiveCount,
        negative:
          artifact.model.training.negativeCount,
      },
      datasetSplitExamples: {
        ...manifestCounts,
      },
      evaluationExamples: {
        validation:
          artifact.evidence.validationExampleCount,
        test:
          artifact.evidence.testExampleCount,
      },
      datasetWindow: {
        startOutcomeCompletedAt:
          manifest?.window.startOutcomeCompletedAt ??
          null,
        endOutcomeCompletedAt:
          manifest?.window.endOutcomeCompletedAt ??
          null,
      },
      predictionFeatureContract: {
        featureSchemaVersion:
          artifact.model.featureSchemaVersion,
        featureOrder: [
          ...artifact.model.featureOrder,
        ],
        valuesPersistedInShadowPredictionColumns:
          true,
      },
    },
    unavailableEvidence: [
      "CALIBRATION",
      "FEATURE_RANGE_FAMILIARITY",
      "GEOGRAPHIC_COVERAGE",
      "CROWD_INTELLIGENCE",
      "TEMPORAL_FRESHNESS_POLICY",
    ],
  };
}
