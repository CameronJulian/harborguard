import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const TRACCAR_PROVIDER = "traccar";
const TRACCAR_POSITION_STREAM = "positions";
const RECENT_FAILURE_LIMIT = 10;

function isMappingFailure(message: string | null) {
  if (!message) return false;

  return (
    message.includes("No vehicle is mapped") ||
    message.includes("Multiple vehicles are mapped")
  );
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const [
      integrationResult,
      syncStateResult,
      processingReceiptsResult,
      failedReceiptsResult,
      oldestProcessingResult,
      recentFailuresResult,
    ] = await Promise.all([
      supabase
        .from("telematics_integrations")
        .select("id, enabled")
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .maybeSingle(),

      supabase
        .from("telematics_sync_state")
        .select(
          "provider, stream, last_successful_sync_at, last_failure_at, last_failure_message, metadata"
        )
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .eq("stream", TRACCAR_POSITION_STREAM)
        .maybeSingle(),

      supabase
        .from("telematics_message_receipts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .eq("processing_status", "processing"),

      supabase
        .from("telematics_message_receipts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .eq("processing_status", "failed"),

      supabase
        .from("telematics_message_receipts")
        .select("provider_message_id, claimed_at, attempt_count, metadata")
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .eq("processing_status", "processing")
        .order("claimed_at", { ascending: true })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("telematics_message_receipts")
        .select(
          "provider_message_id, last_failure_at, last_failure_message, attempt_count, metadata"
        )
        .eq("organization_id", organizationId)
        .eq("provider", TRACCAR_PROVIDER)
        .eq("processing_status", "failed")
        .order("last_failure_at", { ascending: false })
        .limit(RECENT_FAILURE_LIMIT),
    ]);

    if (integrationResult.error) throw integrationResult.error;
    if (syncStateResult.error) throw syncStateResult.error;
    if (processingReceiptsResult.error) throw processingReceiptsResult.error;
    if (failedReceiptsResult.error) throw failedReceiptsResult.error;
    if (oldestProcessingResult.error) throw oldestProcessingResult.error;
    if (recentFailuresResult.error) throw recentFailuresResult.error;

    const integration = integrationResult.data;
    const configured = Boolean(integration);
    const enabled = integration?.enabled ?? false;
    const syncState = syncStateResult.data;
    const lastFailureMessage = syncState?.last_failure_message ?? null;

    let status:
      | "healthy"
      | "warning"
      | "failed"
      | "never_synced"
      | "disabled";

    if (configured && !enabled) {
      status = "disabled";
    } else if (!syncState?.last_successful_sync_at && !syncState?.last_failure_at) {
      status = "never_synced";
    } else if (
      syncState?.last_failure_at &&
      (
        !syncState?.last_successful_sync_at ||
        new Date(syncState.last_failure_at).getTime() >
          new Date(syncState.last_successful_sync_at).getTime()
      )
    ) {
      status = "failed";
    } else if (
      (failedReceiptsResult.count ?? 0) > 0 ||
      (processingReceiptsResult.count ?? 0) > 0
    ) {
      status = "warning";
    } else {
      status = "healthy";
    }

    return NextResponse.json({
      success: true,
      integration: {
        provider: TRACCAR_PROVIDER,
        stream: TRACCAR_POSITION_STREAM,
        configured,
        enabled,
        status,
        lastSuccessfulSyncAt: syncState?.last_successful_sync_at ?? null,
        lastFailureAt: syncState?.last_failure_at ?? null,
        lastFailureMessage,
        mappingFailure: isMappingFailure(lastFailureMessage),
        lastRun: syncState?.metadata ?? null,
        receipts: {
          processing: processingReceiptsResult.count ?? 0,
          failed: failedReceiptsResult.count ?? 0,
          oldestProcessing: oldestProcessingResult.data
            ? {
                providerMessageId:
                  oldestProcessingResult.data.provider_message_id,
                providerDeviceId:
                  typeof oldestProcessingResult.data.metadata?.providerDeviceId === "string"
                    ? oldestProcessingResult.data.metadata.providerDeviceId
                    : null,
                claimedAt: oldestProcessingResult.data.claimed_at,
                attemptCount: oldestProcessingResult.data.attempt_count,
              }
            : null,
          recentFailures: (recentFailuresResult.data ?? []).map(
            (receipt) => ({
              providerMessageId: receipt.provider_message_id,
              providerDeviceId:
                typeof receipt.metadata?.providerDeviceId === "string"
                  ? receipt.metadata.providerDeviceId
                  : null,
              failedAt: receipt.last_failure_at,
              failureMessage: receipt.last_failure_message,
              attemptCount: receipt.attempt_count,
            })
          ),
        },
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load telematics integration health.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
