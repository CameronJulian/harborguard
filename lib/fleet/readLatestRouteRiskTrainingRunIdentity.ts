import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RouteRiskPreviousTrainingIdentity,
} from "@/lib/fleet/assessRouteRiskRetrainingReadiness";

export type ReadLatestRouteRiskTrainingRunIdentityInput = {
  supabase: SupabaseClient;

  organizationId: string;
};

type RouteRiskTrainingRunIdentityRow = {
  id: unknown;

  organization_id: unknown;

  dataset_fingerprint: unknown;

  created_at: unknown;
};

export type LatestRouteRiskTrainingRunIdentity =
  Exclude<
    RouteRiskPreviousTrainingIdentity,
    null
  > & {
    createdAt: string;
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

function requireRowString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} must be a nonblank string.`
    );
  }

  return value.trim();
}

function requireSha256Fingerprint(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireRowString(
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

function requireIsoTimestamp(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireRowString(
      value,
      fieldName
    );

  const parsed =
    Date.parse(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`
    );
  }

  return normalized;
}

/**
 * Reads the newest persisted immutable route-risk training-run identity
 * for one exact HarborGuard organization.
 *
 * This helper:
 *
 * - reads route_risk_training_runs only;
 * - scopes the read to one explicit organization;
 * - orders newest persisted training runs first;
 * - uses immutable training-run ID as a deterministic tie-breaker;
 * - returns null when no previous training run exists;
 * - returns only the identity required by retraining readiness.
 *
 * It does NOT:
 *
 * - prepare a dataset;
 * - train or evaluate a model;
 * - insert, update, or delete anything;
 * - register or mutate lifecycle state;
 * - approve, shadow, activate, or retire a model;
 * - alter Route Safety behavior.
 */
export async function readLatestRouteRiskTrainingRunIdentity({
  supabase,
  organizationId,
}: ReadLatestRouteRiskTrainingRunIdentityInput): Promise<
  LatestRouteRiskTrainingRunIdentity | null
> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "route_risk_training_runs"
      )
      .select(
        "id, organization_id, dataset_fingerprint, created_at"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .order(
        "id",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row =
    data as RouteRiskTrainingRunIdentityRow;

  const persistedOrganizationId =
    requireRowString(
      row.organization_id,
      "trainingRun.organization_id"
    );

  if (
    persistedOrganizationId !==
      normalizedOrganizationId
  ) {
    throw new Error(
      "Latest route-risk training run returned the wrong organization."
    );
  }

  const trainingRunId =
    requireRowString(
      row.id,
      "trainingRun.id"
    );

  const datasetFingerprint =
    requireSha256Fingerprint(
      row.dataset_fingerprint,
      "trainingRun.dataset_fingerprint"
    );

  const createdAt =
    requireIsoTimestamp(
      row.created_at,
      "trainingRun.created_at"
    );

  return {
    trainingRunId,

    datasetFingerprint,

    createdAt,
  };
}
