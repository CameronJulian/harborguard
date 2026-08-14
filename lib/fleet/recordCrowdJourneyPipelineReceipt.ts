import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCrowdAnonymousTripToken,
} from "@/lib/fleet/createCrowdAnonymousTripToken";

type CrowdJourneyPipelineOutcome =
  | "accepted"
  | "skipped"
  | "failed";

type CrowdJourneyPipelineReason =
  | "trip_not_delivered"
  | "invalid_trip_time_order"
  | "insufficient_location_points"
  | "no_movement_segments"
  | "processing_error";

type RecordCrowdJourneyPipelineReceiptInput = {
  tripId: string;
  observedAt: string;
  outcome: CrowdJourneyPipelineOutcome;
  reason: CrowdJourneyPipelineReason | null;
  traversalRowCount: number;
};

export async function recordCrowdJourneyPipelineReceipt({
  tripId,
  observedAt,
  outcome,
  reason,
  traversalRowCount,
}: RecordCrowdJourneyPipelineReceiptInput): Promise<void> {
  const observedDate =
    new Date(observedAt)
      .toISOString()
      .slice(0, 10);

  const tripToken =
    createCrowdAnonymousTripToken(tripId);

  const { error } =
    await supabaseAdmin.rpc(
      "upsert_crowd_journey_pipeline_receipt",
      {
        p_trip_token: tripToken,
        p_observed_date: observedDate,
        p_outcome: outcome,
        p_reason: reason,
        p_traversal_row_count: traversalRowCount,
      }
    );

  if (error) {
    console.error(
      "[crowd journey pipeline observability]",
      {
        observedDate,
        outcome,
        reason,
        traversalRowCount,
        error,
      }
    );
  }
}
