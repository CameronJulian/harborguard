import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  reprocessCrowdJourney,
} from "@/lib/fleet/reprocessCrowdJourney";

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 500;

type HistoricalTripRow = {
  id: string;
  actual_arrival: string;
};

export type ReprocessCrowdJourneyHistoryInput = {
  startDate?: string | null;
  endDate?: string | null;
  limit?: number | null;
};

export type ReprocessCrowdJourneyHistoryResult = {
  selected: number;
  processed: number;
  accepted: number;
  skipped: number;
  failed: number;
  truncated: boolean;
};

function normalizeOptionalDate(
  value: string | null | undefined,
  fieldName: "startDate" | "endDate"
): string | null {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date.`
    );
  }

  return parsed.toISOString();
}

function normalizeLimit(
  value: number | null | undefined
): number {
  if (value == null) {
    return DEFAULT_HISTORY_LIMIT;
  }

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "limit must be a positive integer."
    );
  }

  return Math.min(
    value,
    MAX_HISTORY_LIMIT
  );
}

/*
 * C-1D8 historical Crowd Intelligence recomputation primitive.
 *
 * Enumerates eligible delivered journeys and routes every selected
 * journey through the canonical C-1D6 replay primitive.
 *
 * The function intentionally:
 *
 * - processes journeys sequentially;
 * - supports optional actual-arrival date bounds;
 * - limits each execution to a conservative bounded batch;
 * - returns aggregate processing counts only;
 * - does not expose trip IDs, trip tokens, vehicles, organizations,
 *   users, drivers, coordinates, or route geometry;
 * - does not mutate vehicle-trip lifecycle state;
 * - does not rerun completed-trip outcomes, predictions, risk
 *   detection, or unrelated location-update lifecycle behavior.
 *
 * Repeat execution is safe because reprocessCrowdJourney() uses the
 * idempotent anonymous traversal / aggregate / receipt pipeline.
 */
export async function reprocessCrowdJourneyHistory(
  input: ReprocessCrowdJourneyHistoryInput = {}
): Promise<ReprocessCrowdJourneyHistoryResult> {
  const startDate =
    normalizeOptionalDate(
      input.startDate,
      "startDate"
    );

  const endDate =
    normalizeOptionalDate(
      input.endDate,
      "endDate"
    );

  if (
    startDate &&
    endDate &&
    new Date(startDate).getTime() >
      new Date(endDate).getTime()
  ) {
    throw new Error(
      "startDate must be earlier than or equal to endDate."
    );
  }

  const limit =
    normalizeLimit(
      input.limit
    );

  let query =
    supabaseAdmin
      .from("vehicle_trips")
      .select(
        "id,actual_arrival"
      )
      .eq(
        "status",
        "delivered"
      )
      .not(
        "actual_departure",
        "is",
        null
      )
      .not(
        "actual_arrival",
        "is",
        null
      )
      .order(
        "actual_arrival",
        {
          ascending: true,
        }
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .limit(
        limit + 1
      );

  if (startDate) {
    query =
      query.gte(
        "actual_arrival",
        startDate
      );
  }

  if (endDate) {
    query =
      query.lte(
        "actual_arrival",
        endDate
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw error;
  }

  const availableTrips =
    (data ?? []) as HistoricalTripRow[];

  const truncated =
    availableTrips.length > limit;

  const selectedTrips =
    availableTrips.slice(
      0,
      limit
    );

  let processed = 0;
  let accepted = 0;
  let skipped = 0;
  let failed = 0;

  for (const trip of selectedTrips) {
    try {
      const result =
        await reprocessCrowdJourney(
          trip.id
        );

      processed += 1;

      if (
        result.outcome ===
        "accepted"
      ) {
        accepted += 1;
        continue;
      }

      if (
        result.outcome ===
        "skipped"
      ) {
        skipped += 1;
        continue;
      }

      failed += 1;
    }
    catch (error) {
      processed += 1;
      failed += 1;

      console.error(
        "[crowd historical rebuild]",
        {
          actualArrival:
            trip.actual_arrival,
          error,
        }
      );
    }
  }

  return {
    selected:
      selectedTrips.length,

    processed,

    accepted,

    skipped,

    failed,

    truncated,
  };
}