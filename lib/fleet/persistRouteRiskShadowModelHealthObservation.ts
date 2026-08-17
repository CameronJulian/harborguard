import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskShadowModelHealthComparison,
} from "@/lib/fleet/analyzeRouteRiskShadowModelHealth";

import type {
  RouteRiskShadowModelHealthEvidenceAssessment,
} from "@/lib/fleet/assessRouteRiskShadowModelHealthEvidence";

export type PersistRouteRiskShadowModelHealthObservationInput = {
  supabase: SupabaseClient;

  organizationId: string;
  modelRegistryId: string;
  trainingRunId: string;

  referenceStart: Date;
  referenceEnd: Date;

  recentStart: Date;
  recentEnd: Date;

  modelHealth:
    RouteRiskShadowModelHealthComparison;

  evidenceAssessment:
    RouteRiskShadowModelHealthEvidenceAssessment;
};

export type PersistedRouteRiskShadowModelHealthObservation = {
  id: string;

  organizationId: string;
  modelRegistryId: string;
  trainingRunId: string;

  referenceStart: string;
  referenceEnd: string;

  recentStart: string;
  recentEnd: string;

  analysisVersion: string;
  evidenceAssessmentVersion: string;

  modelHealth:
    RouteRiskShadowModelHealthComparison;

  evidenceAssessment:
    RouteRiskShadowModelHealthEvidenceAssessment;

  createdAt: string;
};

export type PersistRouteRiskShadowModelHealthObservationResult = {
  status:
    | "created"
    | "existing";

  observation:
    PersistedRouteRiskShadowModelHealthObservation;
};

type PersistedObservationRow = {
  id: unknown;

  organization_id: unknown;
  model_registry_id: unknown;
  training_run_id: unknown;

  reference_start: unknown;
  reference_end: unknown;

  recent_start: unknown;
  recent_end: unknown;

  analysis_version: unknown;
  evidence_assessment_version: unknown;

  model_health: unknown;
  evidence_assessment: unknown;

  created_at: unknown;
};

const MODEL_HEALTH_OBSERVATION_SELECT =
  "id, organization_id, model_registry_id, training_run_id, reference_start, reference_end, recent_start, recent_end, analysis_version, evidence_assessment_version, model_health, evidence_assessment, created_at";

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

  return value;
}

function requireValidDate(
  value: Date,
  fieldName: string
): Date {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid Date.`
    );
  }

  return value;
}

function requireObject(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected an object.`
    );
  }

  return value as Record<string, unknown>;
}

function parsePersistedRow(
  value: unknown
): PersistedRouteRiskShadowModelHealthObservation {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid persisted route-risk shadow model-health observation response."
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

    modelRegistryId:
      requireNonBlankString(
        row.model_registry_id,
        "persisted observation model_registry_id"
      ),

    trainingRunId:
      requireNonBlankString(
        row.training_run_id,
        "persisted observation training_run_id"
      ),

    referenceStart:
      requireNonBlankString(
        row.reference_start,
        "persisted observation reference_start"
      ),

    referenceEnd:
      requireNonBlankString(
        row.reference_end,
        "persisted observation reference_end"
      ),

    recentStart:
      requireNonBlankString(
        row.recent_start,
        "persisted observation recent_start"
      ),

    recentEnd:
      requireNonBlankString(
        row.recent_end,
        "persisted observation recent_end"
      ),

    analysisVersion:
      requireNonBlankString(
        row.analysis_version,
        "persisted observation analysis_version"
      ),

    evidenceAssessmentVersion:
      requireNonBlankString(
        row.evidence_assessment_version,
        "persisted observation evidence_assessment_version"
      ),

    modelHealth:
      requireObject(
        row.model_health,
        "persisted observation model_health"
      ) as RouteRiskShadowModelHealthComparison,

    evidenceAssessment:
      requireObject(
        row.evidence_assessment,
        "persisted observation evidence_assessment"
      ) as RouteRiskShadowModelHealthEvidenceAssessment,

    createdAt:
      requireNonBlankString(
        row.created_at,
        "persisted observation created_at"
      ),
  };
}

function assertPersistedIdentity(
  persisted:
    PersistedRouteRiskShadowModelHealthObservation,
  expected: {
    organizationId: string;
    modelRegistryId: string;
    trainingRunId: string;

    referenceStart: string;
    referenceEnd: string;

    recentStart: string;
    recentEnd: string;

    analysisVersion: string;
    evidenceAssessmentVersion: string;
  }
) {
  const mismatches = [
    [
      persisted.organizationId,
      expected.organizationId,
      "organization identity",
    ],

    [
      persisted.modelRegistryId,
      expected.modelRegistryId,
      "model-registry identity",
    ],

    [
      persisted.trainingRunId,
      expected.trainingRunId,
      "training-run identity",
    ],

    [
      persisted.referenceStart,
      expected.referenceStart,
      "reference start",
    ],

    [
      persisted.referenceEnd,
      expected.referenceEnd,
      "reference end",
    ],

    [
      persisted.recentStart,
      expected.recentStart,
      "recent start",
    ],

    [
      persisted.recentEnd,
      expected.recentEnd,
      "recent end",
    ],

    [
      persisted.analysisVersion,
      expected.analysisVersion,
      "analysis version",
    ],

    [
      persisted.evidenceAssessmentVersion,
      expected.evidenceAssessmentVersion,
      "evidence-assessment version",
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
        `Persisted route-risk shadow model-health observation ${label} mismatch.`
      );
    }
  }
}

/**
 * Persists one immutable descriptive shadow model-health observation.
 *
 * Important boundaries:
 *
 * - The caller supplies the trusted Supabase client.
 * - The caller supplies one explicit organization/model/training-run identity.
 * - Analysis/evidence versions come from the supplied versioned result objects.
 * - The exact reference/recent evidence windows are persisted.
 * - The full descriptive model-health and structural evidence objects are
 *   persisted without interpretation.
 * - This helper does not calculate model health.
 * - This helper does not establish statistical sufficiency.
 * - This helper does not classify drift/degradation.
 * - This helper does not trigger retraining.
 * - This helper does not mutate model lifecycle state.
 * - This helper does not affect production Route Safety.
 * - Duplicate observation identity is idempotent.
 */
export async function persistRouteRiskShadowModelHealthObservation({
  supabase,

  organizationId,
  modelRegistryId,
  trainingRunId,

  referenceStart,
  referenceEnd,

  recentStart,
  recentEnd,

  modelHealth,
  evidenceAssessment,
}: PersistRouteRiskShadowModelHealthObservationInput): Promise<
  PersistRouteRiskShadowModelHealthObservationResult
> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const normalizedModelRegistryId =
    requireNonBlankString(
      modelRegistryId,
      "modelRegistryId"
    );

  const normalizedTrainingRunId =
    requireNonBlankString(
      trainingRunId,
      "trainingRunId"
    );

  const referenceStartIso =
    requireValidDate(
      referenceStart,
      "referenceStart"
    ).toISOString();

  const referenceEndIso =
    requireValidDate(
      referenceEnd,
      "referenceEnd"
    ).toISOString();

  const recentStartIso =
    requireValidDate(
      recentStart,
      "recentStart"
    ).toISOString();

  const recentEndIso =
    requireValidDate(
      recentEnd,
      "recentEnd"
    ).toISOString();

  if (referenceStartIso > referenceEndIso) {
    throw new Error(
      "referenceStart must be earlier than or equal to referenceEnd."
    );
  }

  if (recentStartIso > recentEndIso) {
    throw new Error(
      "recentStart must be earlier than or equal to recentEnd."
    );
  }

  if (referenceEndIso > recentStartIso) {
    throw new Error(
      "referenceEnd must be earlier than or equal to recentStart."
    );
  }

  const normalizedModelHealth =
    requireObject(
      modelHealth,
      "modelHealth"
    ) as RouteRiskShadowModelHealthComparison;

  const normalizedEvidenceAssessment =
    requireObject(
      evidenceAssessment,
      "evidenceAssessment"
    ) as RouteRiskShadowModelHealthEvidenceAssessment;

  const analysisVersion =
    requireNonBlankString(
      normalizedModelHealth.analysisVersion,
      "modelHealth.analysisVersion"
    );

  const evidenceAssessmentVersion =
    requireNonBlankString(
      normalizedEvidenceAssessment.assessmentVersion,
      "evidenceAssessment.assessmentVersion"
    );

  const expectedIdentity = {
    organizationId:
      normalizedOrganizationId,

    modelRegistryId:
      normalizedModelRegistryId,

    trainingRunId:
      normalizedTrainingRunId,

    referenceStart:
      referenceStartIso,

    referenceEnd:
      referenceEndIso,

    recentStart:
      recentStartIso,

    recentEnd:
      recentEndIso,

    analysisVersion,

    evidenceAssessmentVersion,
  };

  const {
    data: insertedRow,
    error: insertError,
  } =
    await supabase
      .from(
        "route_risk_shadow_model_health_observations"
      )
      .insert({
        organization_id:
          normalizedOrganizationId,

        model_registry_id:
          normalizedModelRegistryId,

        training_run_id:
          normalizedTrainingRunId,

        reference_start:
          referenceStartIso,

        reference_end:
          referenceEndIso,

        recent_start:
          recentStartIso,

        recent_end:
          recentEndIso,

        analysis_version:
          analysisVersion,

        evidence_assessment_version:
          evidenceAssessmentVersion,

        model_health:
          normalizedModelHealth,

        evidence_assessment:
          normalizedEvidenceAssessment,
      })
      .select(
        MODEL_HEALTH_OBSERVATION_SELECT
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
      status: "created",
      observation:
        persisted,
    };
  }

  if (insertError.code !== "23505") {
    throw new Error(
      "Failed to persist route-risk shadow model-health observation: " +
        insertError.message
    );
  }

  const {
    data: existingRow,
    error: existingError,
  } =
    await supabase
      .from(
        "route_risk_shadow_model_health_observations"
      )
      .select(
        MODEL_HEALTH_OBSERVATION_SELECT
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "model_registry_id",
        normalizedModelRegistryId
      )
      .eq(
        "training_run_id",
        normalizedTrainingRunId
      )
      .eq(
        "reference_start",
        referenceStartIso
      )
      .eq(
        "reference_end",
        referenceEndIso
      )
      .eq(
        "recent_start",
        recentStartIso
      )
      .eq(
        "recent_end",
        recentEndIso
      )
      .eq(
        "analysis_version",
        analysisVersion
      )
      .eq(
        "evidence_assessment_version",
        evidenceAssessmentVersion
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      "Failed to read existing route-risk shadow model-health observation after duplicate insert: " +
        existingError.message
    );
  }

  if (!existingRow) {
    throw new Error(
      "Route-risk shadow model-health observation duplicate was reported but the existing row could not be found."
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
    status: "existing",
    observation:
      persisted,
  };
}
