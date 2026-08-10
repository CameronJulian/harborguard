import {
  loadTraccarLatestPositions,
  normalizeTraccarPosition,
  type TraccarConfiguration,
} from "@/lib/telematics/providers/traccar";

import {
  processTelematicsPosition,
  type ProcessTelematicsPositionResult,
} from "@/lib/telematics/processTelematicsPosition";

const TRACCAR_PROVIDER = "traccar";
const TRACCAR_POSITION_STREAM = "positions";

export type RunTraccarPositionSyncInput = {
  supabase: any;
  organizationId: string;
  configuration?: TraccarConfiguration;
};

export type TraccarPositionSyncSummary = {
  received: number;
  processed: number;
  duplicates: number;
  alreadyProcessing: number;
  jitterSkipped: number;
  gpsSpikeSkipped: number;
};

export type RunTraccarPositionSyncResult = {
  ok: true;
  summary: TraccarPositionSyncSummary;
};

function errorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Traccar position sync failed.";
}

function createSummary(): TraccarPositionSyncSummary {
  return {
    received: 0,
    processed: 0,
    duplicates: 0,
    alreadyProcessing: 0,
    jitterSkipped: 0,
    gpsSpikeSkipped: 0,
  };
}

function recordPositionResult(
  summary: TraccarPositionSyncSummary,
  result: ProcessTelematicsPositionResult
): void {
  if (!result.ok) {
    throw new Error(
      `${result.errorType}: ${result.error}`
    );
  }

  if (result.skipped === "duplicate") {
    summary.duplicates += 1;
    return;
  }

  if (result.skipped === "processing") {
    summary.alreadyProcessing += 1;
    return;
  }

  if (result.skipped === "jitter") {
    summary.jitterSkipped += 1;
    return;
  }

  if (result.skipped === "gps_spike") {
    summary.gpsSpikeSkipped += 1;
    return;
  }

  summary.processed += 1;
}

async function recordSuccessfulSync({
  supabase,
  organizationId,
  summary,
}: {
  supabase: any;
  organizationId: string;
  summary: TraccarPositionSyncSummary;
}): Promise<void> {
  const now = new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("telematics_sync_state")
    .upsert(
      {
        organization_id: organizationId,
        provider: TRACCAR_PROVIDER,
        stream: TRACCAR_POSITION_STREAM,
        last_successful_sync_at: now,
        last_failure_at: null,
        last_failure_message: null,
        metadata: {
          received: summary.received,
          processed: summary.processed,
          duplicates: summary.duplicates,
          alreadyProcessing:
            summary.alreadyProcessing,
          jitterSkipped:
            summary.jitterSkipped,
          gpsSpikeSkipped:
            summary.gpsSpikeSkipped,
        },
        updated_at: now,
      },
      {
        onConflict:
          "organization_id,provider,stream",
      }
    );

  if (error) {
    throw error;
  }
}

async function recordFailedSync({
  supabase,
  organizationId,
  summary,
  failureMessage,
}: {
  supabase: any;
  organizationId: string;
  summary: TraccarPositionSyncSummary;
  failureMessage: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("telematics_sync_state")
    .upsert(
      {
        organization_id: organizationId,
        provider: TRACCAR_PROVIDER,
        stream: TRACCAR_POSITION_STREAM,
        last_failure_at: now,
        last_failure_message:
          failureMessage,
        metadata: {
          received: summary.received,
          processed: summary.processed,
          duplicates: summary.duplicates,
          alreadyProcessing:
            summary.alreadyProcessing,
          jitterSkipped:
            summary.jitterSkipped,
          gpsSpikeSkipped:
            summary.gpsSpikeSkipped,
          failed: true,
        },
        updated_at: now,
      },
      {
        onConflict:
          "organization_id,provider,stream",
      }
    );

  if (error) {
    throw error;
  }
}

export async function runTraccarPositionSync({
  supabase,
  organizationId,
  configuration,
}: RunTraccarPositionSyncInput): Promise<RunTraccarPositionSyncResult> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "organizationId is required for Traccar position sync."
    );
  }

  const summary =
    createSummary();

  try {
    const positions =
      await loadTraccarLatestPositions(
        configuration
      );

    summary.received =
      positions.length;

    for (const rawPosition of positions) {
      const normalizedPosition =
        normalizeTraccarPosition(
          rawPosition
        );

      const result =
        await processTelematicsPosition({
          supabase,
          organizationId:
            normalizedOrganizationId,
          provider:
            TRACCAR_PROVIDER,
          stream:
            TRACCAR_POSITION_STREAM,
          position:
            normalizedPosition,
        });

      recordPositionResult(
        summary,
        result
      );
    }

    await recordSuccessfulSync({
      supabase,
      organizationId:
        normalizedOrganizationId,
      summary,
    });

    return {
      ok: true,
      summary,
    };
  }
  catch (error) {
    const message =
      errorMessage(error);

    try {
      await recordFailedSync({
        supabase,
        organizationId:
          normalizedOrganizationId,
        summary,
        failureMessage:
          message,
      });
    }
    catch (syncStateError) {
      throw new AggregateError(
        [
          error,
          syncStateError,
        ],
        "Traccar position sync failed and sync-state failure could not be recorded."
      );
    }

    throw error;
  }
}