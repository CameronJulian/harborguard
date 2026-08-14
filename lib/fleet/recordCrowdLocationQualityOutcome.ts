import { supabaseAdmin } from "@/lib/supabase-admin";

type CrowdLocationQualitySource =
  | "mobile"
  | "hardware"
  | "manual";

type CrowdLocationQualityOutcome =
  | "accepted"
  | "jitter"
  | "gps_spike";

type RecordCrowdLocationQualityOutcomeInput = {
  source: CrowdLocationQualitySource;
  outcome: CrowdLocationQualityOutcome;
  occurredAt: string;
};

export async function recordCrowdLocationQualityOutcome({
  source,
  outcome,
  occurredAt,
}: RecordCrowdLocationQualityOutcomeInput): Promise<void> {
  const observedDate =
    new Date(occurredAt)
      .toISOString()
      .slice(0, 10);

  const { error } =
    await supabaseAdmin.rpc(
      "increment_crowd_location_quality_stat",
      {
        p_observed_date: observedDate,
        p_source: source,
        p_outcome: outcome,
      }
    );

  if (error) {
    console.error(
      "[crowd location quality observability]",
      {
        observedDate,
        source,
        outcome,
        error,
      }
    );
  }
}
