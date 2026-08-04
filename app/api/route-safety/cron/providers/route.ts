import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  importHereIncidents as importHereIncidentsShared,
} from "@/lib/route-safety/providers/importHereIncidents";
import {
  importTomTomIncidents as importTomTomIncidentsShared,
} from "@/lib/route-safety/providers/importTomTomIncidents";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProviderResult = {
  provider: "here" | "tomtom";
  organizationId: string;
  success: boolean;
  rawCount: number;
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  error: string | null;
};

type IntelligenceSourceConfiguration = {
  sourceKey: string;
  enabled: boolean;
  approvedForIngestion: boolean;
  baseConfidence: number;
};

type IntelligenceSourceConfigurationResult = {
  configuration: IntelligenceSourceConfiguration | null;
  error: string | null;
};








async function getIntelligenceSourceConfiguration(
  supabase: any,
  sourceKey: string
): Promise<IntelligenceSourceConfigurationResult> {
  const { data, error } = await supabase
    .from("intelligence_sources")
    .select(`
      source_key,
      enabled,
      approved_for_ingestion,
      base_confidence
    `)
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (error) {
    return {
      configuration: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      configuration: null,
      error:
        `Intelligence source configuration was not found: ${sourceKey}`,
    };
  }

  const rawBaseConfidence = Number(
    data.base_confidence
  );

  const baseConfidence = Math.min(
    100,
    Math.max(
      0,
      Number.isFinite(rawBaseConfidence)
        ? rawBaseConfidence
        : 0
    )
  );

  return {
    configuration: {
      sourceKey: String(data.source_key),
      enabled: Boolean(data.enabled),
      approvedForIngestion: Boolean(
        data.approved_for_ingestion
      ),
      baseConfidence,
    },
    error: null,
  };
}



export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error: "Unauthorized cron request.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Supabase service-role configuration is incomplete.",
        },
        {
          status: 500,
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const trafficOrganizationId =
      process.env.TRAFFIC_IMPORT_ORGANIZATION_ID?.trim();

    if (!trafficOrganizationId) {
      return NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const { data: organization, error: organizationError } =
      await supabase
        .from("organizations")
        .select("id")
        .eq("id", trafficOrganizationId)
        .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      return NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID does not match an organization.",
        },
        {
          status: 500,
        }
      );
    }

    const organizationIds = [trafficOrganizationId];

    const results: ProviderResult[] = [];
    let expiredAlertsTransitioned = 0;
    let staleProviderObservations = 0;
    let alertsWithStaleProviders = 0;
    let alertsWithAllProvidersStale = 0;
    let allProvidersStaleAlertsTransitioned = 0;
    let partiallyReconciledAlerts = 0;
    let partiallyStaleProvidersRemoved = 0;

    for (const organizationId of organizationIds) {
      const expiredAt = new Date().toISOString();

      const {
        data: expiredAlerts,
        error: expiredAlertsError,
      } = await supabase
        .from("route_safety_alerts")
        .update({
          status: "expired",
        })
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .lt("expires_at", expiredAt)
        .select("id");

      if (expiredAlertsError) {
        throw expiredAlertsError;
      }

      expiredAlertsTransitioned +=
        expiredAlerts?.length || 0;

      const hereResult =
        await importHereIncidentsShared(
          supabase,
          organizationId,
          getIntelligenceSourceConfiguration
        );

      const tomTomResult =
        await importTomTomIncidentsShared(
          supabase,
          organizationId,
          getIntelligenceSourceConfiguration
        );

      results.push(hereResult, tomTomResult);

      const staleBefore = new Date(
        Date.now() - 48 * 60 * 60 * 1000
      ).toISOString();

      const {
        data: providerObservationAlerts,
        error: providerObservationError,
      } = await supabase
        .from("route_safety_alerts")
        .select(
          "id, source, provider_sources, provider_last_seen"
        )
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (providerObservationError) {
        throw providerObservationError;
      }

      const allProvidersStaleAlertIds: string[] = [];

      const partiallyStaleAlertUpdates: Array<{
        id: string;
        source: string;
        providerSources: string[];
        providerLastSeen: Record<string, string>;
        providerConfirmationCount: number;
        providerConfidence: number;
      }> = [];

      for (const alert of providerObservationAlerts || []) {
        const providerLastSeen =
          alert.provider_last_seen &&
          typeof alert.provider_last_seen === "object"
            ? alert.provider_last_seen
            : {};

        const providerEntries = Object.entries(
          providerLastSeen
        );

        const staleProviderEntries = providerEntries.filter(
          ([, value]) => {
            const timestamp = new Date(
              String(value)
            ).getTime();

            return (
              Number.isFinite(timestamp) &&
              timestamp < new Date(staleBefore).getTime()
            );
          }
        );

        const freshProviderEntries = providerEntries.filter(
          ([, value]) => {
            const timestamp = new Date(
              String(value)
            ).getTime();

            return (
              Number.isFinite(timestamp) &&
              timestamp >= new Date(staleBefore).getTime()
            );
          }
        );

        const providerTimestamps = providerEntries.map(
          ([, value]) => value
        );

        const staleCount =
          staleProviderEntries.length;

        staleProviderObservations += staleCount;

        if (staleCount > 0) {
          alertsWithStaleProviders += 1;
        }

        if (
          providerTimestamps.length > 0 &&
          staleCount === providerTimestamps.length
        ) {
          alertsWithAllProvidersStale += 1;
          allProvidersStaleAlertIds.push(
            String(alert.id)
          );
        } else if (
          staleProviderEntries.length > 0 &&
          freshProviderEntries.length > 0
        ) {
          const freshProviderLastSeen =
            Object.fromEntries(
              freshProviderEntries.map(
                ([provider, value]) => [
                  provider,
                  String(value),
                ]
              )
            );

          const freshProviderSources = Array.from(
            new Set(
              freshProviderEntries
                .map(([provider]) =>
                  String(provider)
                )
                .filter(Boolean)
            )
          );

          if (freshProviderSources.length === 0) {
            continue;
          }

          const existingSource =
            String(alert.source || "");

          const primarySource =
            freshProviderSources.includes(existingSource)
              ? existingSource
              : freshProviderSources[0];

          const providerConfirmationCount =
            freshProviderSources.length;

          const sourceConfigurationResult =
            await getIntelligenceSourceConfiguration(
              supabase,
              primarySource
            );

          if (!sourceConfigurationResult.configuration) {
            throw new Error(
              sourceConfigurationResult.error ||
                `Provider configuration was not found: ${primarySource}`
            );
          }

          const providerConfidence =
            providerConfirmationCount === 1
              ? sourceConfigurationResult.configuration
                  .baseConfidence
              : Math.min(
                  100,
                  60 +
                    Math.max(
                      0,
                      providerConfirmationCount - 1
                    ) *
                      20
                );

          partiallyStaleAlertUpdates.push({
            id: String(alert.id),
            source: primarySource,
            providerSources: freshProviderSources,
            providerLastSeen: freshProviderLastSeen,
            providerConfirmationCount,
            providerConfidence,
          });

          partiallyStaleProvidersRemoved +=
            staleProviderEntries.length;
        }
      }

      for (const update of partiallyStaleAlertUpdates) {
        const {
          data: partiallyReconciledAlert,
          error: partialReconciliationError,
        } = await supabase
          .from("route_safety_alerts")
          .update({
            source: update.source,
            provider_sources:
              update.providerSources,
            provider_confirmation_count:
              update.providerConfirmationCount,
            provider_confidence:
              update.providerConfidence,
            provider_last_seen:
              update.providerLastSeen,
          })
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .eq("id", update.id)
          .select("id")
          .maybeSingle();

        if (partialReconciliationError) {
          throw partialReconciliationError;
        }

        if (partiallyReconciledAlert) {
          partiallyReconciledAlerts += 1;
        }
      }

      if (allProvidersStaleAlertIds.length > 0) {
        const {
          data: allProvidersStaleAlerts,
          error: allProvidersStaleAlertsError,
        } = await supabase
          .from("route_safety_alerts")
          .update({
            status: "expired",
          })
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .in("id", allProvidersStaleAlertIds)
          .select("id");

        if (allProvidersStaleAlertsError) {
          throw allProvidersStaleAlertsError;
        }

        allProvidersStaleAlertsTransitioned +=
          allProvidersStaleAlerts?.length || 0;
      }
    }

    const imported = results.reduce(
      (total, result) => total + result.imported,
      0
    );

    const refreshedExisting = results.reduce(
      (total, result) =>
        total + result.refreshedExisting,
      0
    );

    const skippedDuplicates = results.reduce(
      (total, result) =>
        total + result.skippedDuplicates,
      0
    );

    const mergedDuplicates = results.reduce(
      (total, result) =>
        total + result.mergedDuplicates,
      0
    );

    const failedProviders = results.filter(
      (result) => !result.success
    ).length;

    return NextResponse.json({
      success: failedProviders === 0,
      generatedAt: new Date().toISOString(),
      organizationsProcessed: organizationIds.length,
      providerRuns: results.length,
      expiredAlertsTransitioned,
      staleProviderThresholdHours: 48,
      staleProviderObservations,
      alertsWithStaleProviders,
      alertsWithAllProvidersStale,
      allProvidersStaleAlertsTransitioned,
      partiallyReconciledAlerts,
      partiallyStaleProvidersRemoved,
      imported,
      refreshedExisting,
      skippedDuplicates,
      mergedDuplicates,
      failedProviders,
      results,
    });
  } catch (error: unknown) {
    console.error(
      "[route-safety provider cron]",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error || "External provider cron failed.");

    return NextResponse.json(
      {
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}
