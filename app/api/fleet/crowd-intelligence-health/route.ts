import { NextResponse } from "next/server";
import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CrowdHealthStatus =
  | "healthy"
  | "warning"
  | "no_data";

type QualityRow = {
  source: string;
  outcome: string;
  observation_count: number | string | null;
  updated_at: string | null;
};

/*
 * C-1D6 descriptive operational age only.
 *
 * This function does not classify freshness, staleness,
 * reliability, SLA compliance, or scoring eligibility.
 */
function ageMinutes(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const time =
    new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.max(
    0,
    Math.round(
      ((Date.now() - time) / 60000) *
        100
    ) / 100
  );
}

function latestTimestamp(
  values: Array<string | null | undefined>
): string | null {
  const valid = values
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        Number.isFinite(
          new Date(value).getTime()
        )
    )
    .sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    );

  return valid[0] ?? null;
}

export async function GET() {
  try {
    const {
      role,
    } = await requireOrganization();

    /*
     * Crowd Intelligence observability is shared,
     * privacy-separated infrastructure rather than
     * organization-scoped fleet data.
     *
     * Restrict this shared operational health surface
     * to organization owners and admins.
     */
    requireRole(
      role,
      ["owner", "admin"]
    );

    const [
      pipelineTotalResult,
      pipelineAcceptedResult,
      pipelineSkippedResult,
      pipelineFailedResult,
      latestFailureResult,

      skipTripNotDeliveredResult,
      skipInvalidTimeResult,
      skipInsufficientPointsResult,
      skipNoMovementResult,

      latestReceiptResult,

      qualityResult,

      traversalCountResult,
      latestTraversalResult,

      aggregateCountResult,
      latestAggregateResult,
    ] = await Promise.all([
      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "accepted"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "skipped"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "failed"
        ),

      /*
       * C-1D5 deliberately selects only the operational
       * failure reason and processing timestamp.
       *
       * Do not select trip_token or any raw journey,
       * vehicle, organization, user, driver, or
       * coordinate identifier here.
       */
      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "reason,updated_at"
        )
        .eq(
          "outcome",
          "failed"
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "skipped"
        )
        .eq(
          "reason",
          "trip_not_delivered"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "skipped"
        )
        .eq(
          "reason",
          "invalid_trip_time_order"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "skipped"
        )
        .eq(
          "reason",
          "insufficient_location_points"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "observed_date",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "outcome",
          "skipped"
        )
        .eq(
          "reason",
          "no_movement_segments"
        ),

      supabaseAdmin
        .from(
          "crowd_journey_pipeline_receipts"
        )
        .select(
          "updated_at"
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from(
          "crowd_location_quality_stats"
        )
        .select(
          "source,outcome,observation_count,updated_at"
        ),

      supabaseAdmin
        .from(
          "crowd_segment_traversals"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        ),

      supabaseAdmin
        .from(
          "crowd_segment_traversals"
        )
        .select(
          "last_seen_at,created_at"
        )
        .order(
          "last_seen_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from(
          "crowd_segment_exposure_stats"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        ),

      supabaseAdmin
        .from(
          "crowd_segment_exposure_stats"
        )
        .select(
          "updated_at"
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle(),
    ]);

    const results = [
      pipelineTotalResult,
      pipelineAcceptedResult,
      pipelineSkippedResult,
      pipelineFailedResult,
      latestFailureResult,
      skipTripNotDeliveredResult,
      skipInvalidTimeResult,
      skipInsufficientPointsResult,
      skipNoMovementResult,
      latestReceiptResult,
      qualityResult,
      traversalCountResult,
      latestTraversalResult,
      aggregateCountResult,
      latestAggregateResult,
    ];

    const firstError =
      results.find(
        (result) => result.error
      )?.error;

    if (firstError) {
      throw firstError;
    }

    const qualityRows =
      (qualityResult.data ?? []) as QualityRow[];

    const quality = {
      total: 0,
      accepted: 0,
      jitter: 0,
      gpsSpike: 0,
      bySource: {
        mobile: 0,
        hardware: 0,
        manual: 0,
      },
      lastUpdatedAt: null as string | null,
    };

    const qualityTimestamps:
      Array<string | null> = [];

    for (const row of qualityRows) {
      const count =
        Number(
          row.observation_count ?? 0
        );

      quality.total += count;

      if (row.outcome === "accepted") {
        quality.accepted += count;
      } else if (
        row.outcome === "jitter"
      ) {
        quality.jitter += count;
      } else if (
        row.outcome === "gps_spike"
      ) {
        quality.gpsSpike += count;
      }

      if (
        row.source === "mobile" ||
        row.source === "hardware" ||
        row.source === "manual"
      ) {
        quality.bySource[row.source] +=
          count;
      }

      qualityTimestamps.push(
        row.updated_at
      );
    }

    quality.lastUpdatedAt =
      latestTimestamp(
        qualityTimestamps
      );

    const pipelineTotal =
      pipelineTotalResult.count ?? 0;

    const pipelineAccepted =
      pipelineAcceptedResult.count ?? 0;

    const pipelineSkipped =
      pipelineSkippedResult.count ?? 0;

    const pipelineFailed =
      pipelineFailedResult.count ?? 0;

    const latestFailure =
      latestFailureResult.data
        ? {
            reason:
              latestFailureResult.data
                .reason ?? null,

            failedAt:
              latestFailureResult.data
                .updated_at ?? null,
          }
        : null;

    const traversalRows =
      traversalCountResult.count ?? 0;

    const aggregateRows =
      aggregateCountResult.count ?? 0;

    const latestPipelineAt =
      latestReceiptResult.data
        ?.updated_at ?? null;

    const latestTraversalAt =
      latestTimestamp([
        latestTraversalResult.data
          ?.last_seen_at ?? null,
        latestTraversalResult.data
          ?.created_at ?? null,
      ]);

    const latestAggregateAt =
      latestAggregateResult.data
        ?.updated_at ?? null;

    const lastActivityAt =
      latestTimestamp([
        latestPipelineAt,
        quality.lastUpdatedAt,
        latestTraversalAt,
        latestAggregateAt,
      ]);

    /*
     * C-1D6 intentionally reports elapsed age only.
     *
     * No threshold or interpretation is applied here.
     */
    const freshness = {
      lastActivityAgeMinutes:
        ageMinutes(
          lastActivityAt
        ),

      pipelineAgeMinutes:
        ageMinutes(
          latestPipelineAt
        ),

      locationQualityAgeMinutes:
        ageMinutes(
          quality.lastUpdatedAt
        ),

      traversalAgeMinutes:
        ageMinutes(
          latestTraversalAt
        ),

      aggregateAgeMinutes:
        ageMinutes(
          latestAggregateAt
        ),

      latestFailureAgeMinutes:
        ageMinutes(
          latestFailure?.failedAt
        ),
    };

    let status:
      CrowdHealthStatus;

    if (pipelineFailed > 0) {
      status = "warning";
    } else if (
      pipelineTotal === 0 &&
      quality.total === 0
    ) {
      status = "no_data";
    } else {
      status = "healthy";
    }

    return NextResponse.json({
      success: true,

      health: {
        status,

        /*
         * Operational health only.
         *
         * This value must not be interpreted as
         * Crowd Intelligence confidence,
         * statistical sufficiency,
         * road-risk reliability,
         * or Route Safety scoring eligibility.
         */
        scope:
          "shared_privacy_safe",

        lastActivityAt,

        /*
         * Descriptive elapsed ages only.
         *
         * These values intentionally do not define a
         * freshness SLA or stale/stalled classification.
         */
        freshness,

        pipeline: {
          total:
            pipelineTotal,

          accepted:
            pipelineAccepted,

          skipped:
            pipelineSkipped,

          failed:
            pipelineFailed,

          lastProcessedAt:
            latestPipelineAt,

          latestFailure,

          skipReasons: {
            tripNotDelivered:
              skipTripNotDeliveredResult
                .count ?? 0,

            invalidTripTimeOrder:
              skipInvalidTimeResult
                .count ?? 0,

            insufficientLocationPoints:
              skipInsufficientPointsResult
                .count ?? 0,

            noMovementSegments:
              skipNoMovementResult
                .count ?? 0,
          },
        },

        locationQuality:
          quality,

        exposure: {
          traversalRows,
          aggregateRows,
          latestTraversalAt,
          latestAggregateAt,
        },
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Crowd Intelligence operational health.";

    const status =
      message === "Unauthorized"
        ? 401
        : message ===
            "Permission denied"
          ? 403
          : message ===
              "Subscription inactive"
            ? 403
            : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      }
    );
  }
}
