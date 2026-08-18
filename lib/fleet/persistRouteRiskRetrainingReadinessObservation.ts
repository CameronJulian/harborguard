import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskPreviousTrainingIdentity,
  RouteRiskRetrainingReadinessAssessment,
  RouteRiskRetrainingReadinessState,
} from "@/lib/fleet/assessRouteRiskRetrainingReadiness";

export type PersistRouteRiskRetrainingReadinessObservationInput = {
  supabase: SupabaseClient;

  organizationId: string;

  datasetGeneratedAt: string;

  previousTraining:
    RouteRiskPreviousTrainingIdentity;

  assessment:
    RouteRiskRetrainingReadinessAssessment;
};

export type PersistedRouteRiskRetrainingReadinessObservation = {
  id: string;

  organizationId: string;

  datasetFingerprint: string;

  datasetGeneratedAt: string;

  previousTrainingRunId:
    string | null;

  assessmentVersion: string;

  policyVersion: string;

  readinessState:
    RouteRiskRetrainingReadinessState;

  assessment:
    RouteRiskRetrainingReadinessAssessment;

  createdAt: string;
};

export type PersistRouteRiskRetrainingReadinessObservationResult = {
  status:
    | "created"
    | "existing";

  observation:
    PersistedRouteRiskRetrainingReadinessObservation;
};

type PersistedObservationRow = {
  id: unknown;

  organization_id: unknown;

  dataset_fingerprint: unknown;

  dataset_generated_at: unknown;

  previous_training_run_id: unknown;

  assessment_version: unknown;

  policy_version: unknown;

  readiness_state: unknown;

  assessment: unknown;

  created_at: unknown;
};

const RETRAINING_READINESS_OBSERVATION_SELECT =
  "id, organization_id, dataset_fingerprint, dataset_generated_at, previous_training_run_id, assessment_version, policy_version, readiness_state, assessment, created_at";

function requireNonBlankString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-blank string.`
    );
  }

  return value.trim();
}

function requireSha256Fingerprint(
  value: unknown,
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
      `Invalid ${fieldName}: expected a lowercase SHA-256 hexadecimal fingerprint.`
    );
  }

  return normalized;
}

function requireTimestamp(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName
    );

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid timestamp.`
    );
  }

  return parsed.toISOString();
}

function requireNullableString(
  value: unknown,
  fieldName: string
): string | null {
  if (value === null) {
    return null;
  }

  return requireNonBlankString(
    value,
    fieldName
  );
}

function requireReadinessState(
  value: unknown
): RouteRiskRetrainingReadinessState {
  if (
    value !== "NOT_READY_FOR_TRAINING" &&
    value !== "READY_FOR_TRAINING"
  ) {
    throw new Error(
      "Invalid persisted retraining readiness state."
    );
  }

  return value;
}

function requireAssessment(
  value: unknown
): RouteRiskRetrainingReadinessAssessment {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid retraining readiness assessment: expected an object."
    );
  }

  return value as
    RouteRiskRetrainingReadinessAssessment;
}

function parsePersistedRow(
  value: unknown
): PersistedRouteRiskRetrainingReadinessObservation {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid persisted route-risk retraining-readiness observation response."
    );
  }

  const row =
    value as PersistedObservationRow;

  return {
    id:
      requireNonBlankString(
        row.id,
        "persisted observation id"
      ),

    organizationId:
      requireNonBlankString(
        row.organization_id,
        "persisted observation organization_id"
      ),

    datasetFingerprint:
      requireSha256Fingerprint(
        row.dataset_fingerprint,
        "persisted observation dataset_fingerprint"
      ),

    datasetGeneratedAt:
      requireTimestamp(
        row.dataset_generated_at,
        "persisted observation dataset_generated_at"
      ),

    previousTrainingRunId:
      requireNullableString(
        row.previous_training_run_id,
        "persisted observation previous_training_run_id"
      ),

    assessmentVersion:
      requireNonBlankString(
        row.assessment_version,
        "persisted observation assessment_version"
      ),

    policyVersion:
      requireNonBlankString(
        row.policy_version,
        "persisted observation policy_version"
      ),

    readinessState:
      requireReadinessState(
        row.readiness_state
      ),

    assessment:
      requireAssessment(
        row.assessment
      ),

    createdAt:
      requireTimestamp(
        row.created_at,
        "persisted observation created_at"
      ),
  };
}

function assertPersistedIdentity(
  persisted:
    PersistedRouteRiskRetrainingReadinessObservation,
  expected: {
    organizationId: string;

    datasetFingerprint: string;

    datasetGeneratedAt: string;

    previousTrainingRunId:
      string | null;

    assessmentVersion: string;

    policyVersion: string;

    readinessState:
      RouteRiskRetrainingReadinessState;
  }
) {
  const mismatches = [
    [
      persisted.organizationId,
      expected.organizationId,
      "organization identity",
    ],

    [
      persisted.datasetFingerprint,
      expected.datasetFingerprint,
      "dataset fingerprint",
    ],

    [
      persisted.datasetGeneratedAt,
      expected.datasetGeneratedAt,
      "dataset generation timestamp",
    ],

    [
      persisted.previousTrainingRunId,
      expected.previousTrainingRunId,
      "previous training-run identity",
    ],

    [
      persisted.assessmentVersion,
      expected.assessmentVersion,
      "assessment version",
    ],

    [
      persisted.policyVersion,
      expected.policyVersion,
      "policy version",
    ],

    [
      persisted.readinessState,
      expected.readinessState,
      "readiness state",
    ],
  ] as const;

  for (
    const [
      actual,
      expectedValue,
      label,
    ] of mismatches
  ) {
    if (actual !== expectedValue) {
      throw new Error(
        `Persisted route-risk retraining-readiness observation ${label} mismatch.`
      );
    }
  }
}

/**
 * Persists one exact immutable route-risk retraining-readiness assessment.
 *
 * Important boundaries:
 *
 * - The caller supplies the trusted Supabase client.
 * - The caller supplies one explicit organization identity.
 * - Dataset identity is derived from the supplied readiness assessment.
 * - Assessment/policy versions are derived from the supplied readiness result.
 * - The optional prior training-run identity is persisted exactly.
 * - The complete versioned readiness assessment is persisted without
 *   recalculation or interpretation.
 * - Duplicate observation identity is recovered idempotently.
 *
 * This helper does NOT:
 *
 * - assess retraining readiness;
 * - establish statistical sufficiency;
 * - prepare training data;
 * - train or evaluate a model;
 * - persist a training run;
 * - register or decide a candidate;
 * - enter shadow mode;
 * - activate or retire a model;
 * - reroute or escalate anything;
 * - modify production Route Safety behavior.
 */
export async function persistRouteRiskRetrainingReadinessObservation({
  supabase,
  organizationId,
  datasetGeneratedAt,
  previousTraining,
  assessment,
}: PersistRouteRiskRetrainingReadinessObservationInput): Promise<
  PersistRouteRiskRetrainingReadinessObservationResult
> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const normalizedDatasetGeneratedAt =
    requireTimestamp(
      datasetGeneratedAt,
      "datasetGeneratedAt"
    );

  const normalizedAssessment =
    requireAssessment(
      assessment
    );

  const datasetFingerprint =
    requireSha256Fingerprint(
      normalizedAssessment
        .checks
        .datasetChanged
        .currentDatasetFingerprint,
      "assessment.checks.datasetChanged.currentDatasetFingerprint"
    );

  const assessmentVersion =
    requireNonBlankString(
      normalizedAssessment
        .assessmentVersion,
      "assessment.assessmentVersion"
    );

  const policyVersion =
    requireNonBlankString(
      normalizedAssessment
        .policyVersion,
      "assessment.policyVersion"
    );

  const readinessState =
    requireReadinessState(
      normalizedAssessment.state
    );

  const previousDatasetFingerprint =
    normalizedAssessment
      .checks
      .datasetChanged
      .previousDatasetFingerprint;

  const previousTrainingRunId =
    previousTraining === null
      ? null
      : requireNonBlankString(
          previousTraining.trainingRunId,
          "previousTraining.trainingRunId"
        );

  if (previousTraining === null) {
    if (
      previousDatasetFingerprint !==
        null
    ) {
      throw new Error(
        "Retraining readiness assessment previous dataset identity does not match the absence of previous training."
      );
    }
  } else {
    const normalizedPreviousDatasetFingerprint =
      requireSha256Fingerprint(
        previousTraining.datasetFingerprint,
        "previousTraining.datasetFingerprint"
      );

    if (
      previousDatasetFingerprint !==
        normalizedPreviousDatasetFingerprint
    ) {
      throw new Error(
        "Retraining readiness assessment previous dataset identity does not match previousTraining."
      );
    }
  }

  const expectedIdentity = {
    organizationId:
      normalizedOrganizationId,

    datasetFingerprint,

    datasetGeneratedAt:
      normalizedDatasetGeneratedAt,

    previousTrainingRunId,

    assessmentVersion,

    policyVersion,

    readinessState,
  };

  const {
    data: insertedRow,
    error: insertError,
  } =
    await supabase
      .from(
        "route_risk_retraining_readiness_observations"
      )
      .insert({
        organization_id:
          normalizedOrganizationId,

        dataset_fingerprint:
          datasetFingerprint,

        dataset_generated_at:
          normalizedDatasetGeneratedAt,

        previous_training_run_id:
          previousTrainingRunId,

        assessment_version:
          assessmentVersion,

        policy_version:
          policyVersion,

        readiness_state:
          readinessState,

        assessment:
          normalizedAssessment,
      })
      .select(
        RETRAINING_READINESS_OBSERVATION_SELECT
      )
      .single();

  if (!insertError) {
    const persisted =
      parsePersistedRow(
        insertedRow
      );

    assertPersistedIdentity(
      persisted,
      expectedIdentity
    );

    return {
      status:
        "created",

      observation:
        persisted,
    };
  }

  if (insertError.code !== "23505") {
    throw new Error(
      "Failed to persist route-risk retraining-readiness observation: " +
        insertError.message
    );
  }

  let existingQuery =
    supabase
      .from(
        "route_risk_retraining_readiness_observations"
      )
      .select(
        RETRAINING_READINESS_OBSERVATION_SELECT
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "dataset_fingerprint",
        datasetFingerprint
      )
      .eq(
        "dataset_generated_at",
        normalizedDatasetGeneratedAt
      )
      .eq(
        "assessment_version",
        assessmentVersion
      )
      .eq(
        "policy_version",
        policyVersion
      );

  existingQuery =
    previousTrainingRunId === null
      ? existingQuery.is(
          "previous_training_run_id",
          null
        )
      : existingQuery.eq(
          "previous_training_run_id",
          previousTrainingRunId
        );

  const {
    data: existingRow,
    error: existingError,
  } =
    await existingQuery
      .maybeSingle();

  if (existingError) {
    throw new Error(
      "Failed to read existing route-risk retraining-readiness observation after duplicate insert: " +
        existingError.message
    );
  }

  if (!existingRow) {
    throw new Error(
      "Route-risk retraining-readiness observation duplicate was reported but the existing row could not be found."
    );
  }

  const persisted =
    parsePersistedRow(
      existingRow
    );

  assertPersistedIdentity(
    persisted,
    expectedIdentity
  );

  return {
    status:
      "existing",

    observation:
      persisted,
  };
}
