import { NextResponse } from "next/server";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

const HSPP_RECOVERY_WORKER_KEY =
  "hspp-recovery";

export async function GET() {
  try {
    const {
      supabase,
      organizationId,
      role,
    } = await requireOrganization();

    /*
     * Scheduled-worker operational state may expose internal
     * execution/failure diagnostics. Restrict this surface to
     * organization owners and administrators.
     */
    requireRole(
      role,
      ["owner", "admin"]
    );

    const {
      data: workerState,
      error,
    } =
      await supabase
        .from(
          "scheduled_worker_state"
        )
        .select(
          "worker_key,last_started_at,last_successful_at,last_failure_at,last_failure_message,metadata,updated_at"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "worker_key",
          HSPP_RECOVERY_WORKER_KEY
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    /*
     * This first health-reader milestone deliberately exposes
     * durable execution evidence only.
     *
     * It does NOT classify the worker as stale, overdue,
     * healthy, unhealthy, or SLA-compliant. Those semantics
     * require an explicit schedule-derived policy.
     */
    return NextResponse.json({
      success: true,

      worker: {
        key:
          HSPP_RECOVERY_WORKER_KEY,

        stateRecorded:
          Boolean(workerState),

        lastStartedAt:
          workerState?.last_started_at ??
          null,

        lastSuccessfulAt:
          workerState?.last_successful_at ??
          null,

        lastFailureAt:
          workerState?.last_failure_at ??
          null,

        lastFailureMessage:
          workerState?.last_failure_message ??
          null,

        metadata:
          workerState?.metadata ??
          null,

        updatedAt:
          workerState?.updated_at ??
          null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load HSPP worker health.";

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
