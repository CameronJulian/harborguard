import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type ScheduledWorkerStateEvent =
  | "started"
  | "succeeded"
  | "failed";

export type ScheduledWorkerStateMetadata =
  Record<
    string,
    string | number | boolean | null
  >;

export type RecordScheduledWorkerStateInput = {
  supabase: SupabaseClient;
  organizationId: string;
  workerKey: string;
  event: ScheduledWorkerStateEvent;
  failureMessage?: string | null;
  metadata?: ScheduledWorkerStateMetadata;
  occurredAt?: string;
};

function requireNonBlank(
  value: string,
  label: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${label} is required.`
    );
  }

  return normalized;
}

function normalizeFailureMessage(
  value: string | null | undefined
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

/**
 * Records the latest trusted operational state for one scheduled
 * worker without introducing lifecycle, lease, retry, or queue state.
 *
 * This helper only updates the durable current-state boundary used by
 * worker-health evaluation. It must not be used as HSPP processing
 * authority or as an execution-lock primitive.
 */
export async function recordScheduledWorkerState({
  supabase,
  organizationId,
  workerKey,
  event,
  failureMessage,
  metadata = {},
  occurredAt,
}: RecordScheduledWorkerStateInput): Promise<void> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedWorkerKey =
    requireNonBlank(
      workerKey,
      "workerKey"
    );

  const now =
    occurredAt?.trim() ||
    new Date().toISOString();

  const row: {
    organization_id: string;
    worker_key: string;
    last_started_at?: string;
    last_successful_at?: string;
    last_failure_at?: string | null;
    last_failure_message?: string | null;
    metadata: ScheduledWorkerStateMetadata;
    updated_at: string;
  } = {
    organization_id:
      normalizedOrganizationId,
    worker_key:
      normalizedWorkerKey,
    metadata,
    updated_at:
      now,
  };

  if (event === "started") {
    row.last_started_at =
      now;
  }
  else if (event === "succeeded") {
    row.last_successful_at =
      now;

    row.last_failure_at =
      null;

    row.last_failure_message =
      null;
  }
  else {
    const normalizedFailureMessage =
      normalizeFailureMessage(
        failureMessage
      );

    if (!normalizedFailureMessage) {
      throw new Error(
        "failureMessage is required for failed scheduled-worker state."
      );
    }

    row.last_failure_at =
      now;

    row.last_failure_message =
      normalizedFailureMessage;
  }

  const {
    error,
  } = await supabase
    .from(
      "scheduled_worker_state"
    )
    .upsert(
      row,
      {
        onConflict:
          "organization_id,worker_key",
      }
    );

  if (error) {
    throw error;
  }
}