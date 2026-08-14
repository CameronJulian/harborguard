import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  createAnonymousJourneyExposure,
  type AnonymousJourneyExposureResult,
} from "@/lib/fleet/createAnonymousJourneyExposure";

import {
  recordCrowdJourneyPipelineReceipt,
} from "@/lib/fleet/recordCrowdJourneyPipelineReceipt";

type ReplayableTrip = {
  id: string;
  organization_id: string;
  vehicle_id: string;
  actual_arrival: string | null;
};

export type ReprocessCrowdJourneyResult =
  | {
      replayed: true;
      outcome: "accepted";
      reason: null;
      traversalRowCount: number;
    }
  | {
      replayed: true;
      outcome: "skipped";
      reason:
        | "trip_not_delivered"
        | "invalid_trip_time_order"
        | "insufficient_location_points"
        | "no_movement_segments";
      traversalRowCount: 0;
    }
  | {
      replayed: false;
      outcome: "failed";
      reason:
        | "trip_not_found"
        | "processing_error";
      traversalRowCount: 0;
    };

/*
 * C-1D6 Crowd Intelligence replay primitive.
 *
 * Reprocesses one journey through the canonical anonymous
 * exposure pipeline.
 *
 * Existing idempotency guarantees make this safe to invoke
 * repeatedly:
 *
 * - traversal evidence upserts on the anonymous
 *   trip/segment/direction/hour/date key;
 * - exposure aggregates are deterministically recomputed;
 * - pipeline receipts upsert on the anonymous trip token.
 *
 * This helper intentionally does NOT:
 *
 * - mutate vehicle_trips status;
 * - create completed-trip outcomes;
 * - rerun prediction evaluation;
 * - rerun risk detection;
 * - expose raw Crowd identity;
 * - define retry schedules or automatic retry policy.
 */
export async function reprocessCrowdJourney(
  tripId: string
): Promise<ReprocessCrowdJourneyResult> {
  const normalizedTripId =
    tripId.trim();

  if (!normalizedTripId) {
    return {
      replayed: false,
      outcome: "failed",
      reason: "trip_not_found",
      traversalRowCount: 0,
    };
  }

  const {
    data: trip,
    error: tripError,
  } =
    await supabaseAdmin
      .from("vehicle_trips")
      .select(
        "id,organization_id,vehicle_id,actual_arrival"
      )
      .eq(
        "id",
        normalizedTripId
      )
      .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (!trip) {
    return {
      replayed: false,
      outcome: "failed",
      reason: "trip_not_found",
      traversalRowCount: 0,
    };
  }

  const replayableTrip =
    trip as ReplayableTrip;

  const observedAt =
    replayableTrip.actual_arrival ??
    new Date().toISOString();

  try {
    const exposureResult:
      AnonymousJourneyExposureResult =
        await createAnonymousJourneyExposure({
          supabase:
            supabaseAdmin,

          organizationId:
            replayableTrip.organization_id,

          vehicleId:
            replayableTrip.vehicle_id,

          tripId:
            replayableTrip.id,
        });

    if (
      exposureResult.skipped === true
    ) {
      await recordCrowdJourneyPipelineReceipt({
        tripId:
          replayableTrip.id,

        observedAt,

        outcome:
          "skipped",

        reason:
          exposureResult.reason,

        traversalRowCount:
          0,

        throwOnError:
          true,
      });

      return {
        replayed: true,
        outcome: "skipped",
        reason:
          exposureResult.reason,
        traversalRowCount: 0,
      };
    }

    await recordCrowdJourneyPipelineReceipt({
      tripId:
        replayableTrip.id,

      observedAt,

      outcome:
        "accepted",

      reason:
        null,

      traversalRowCount:
        exposureResult.created,

      throwOnError:
        true,
    });

    return {
      replayed: true,
      outcome: "accepted",
      reason: null,
      traversalRowCount:
        exposureResult.created,
    };
  }
  catch (error) {
    console.error(
      "[crowd journey replay]",
      {
        tripId:
          replayableTrip.id,
        error,
      }
    );

    await recordCrowdJourneyPipelineReceipt({
      tripId:
        replayableTrip.id,

      observedAt,

      outcome:
        "failed",

      reason:
        "processing_error",

      traversalRowCount:
        0,

      throwOnError:
        true,
    });

    return {
      replayed: false,
      outcome: "failed",
      reason:
        "processing_error",
      traversalRowCount: 0,
    };
  }
}