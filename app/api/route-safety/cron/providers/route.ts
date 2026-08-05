import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  importHereIncidents as importHereIncidentsShared,
} from "@/lib/route-safety/providers/importHereIncidents";
import {
  importTomTomIncidents as importTomTomIncidentsShared,
} from "@/lib/route-safety/providers/importTomTomIncidents";
import {
  getIntelligenceSourceConfiguration as getIntelligenceSourceConfigurationShared,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";
import type { ProviderResult } from "@/lib/route-safety/providers/types";
import {
  reconcileProviderObservations as reconcileProviderObservationsShared,
} from "@/lib/route-safety/providers/reconcileProviderObservations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;














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
          getIntelligenceSourceConfigurationShared
        );

      const tomTomResult =
        await importTomTomIncidentsShared(
          supabase,
          organizationId,
          getIntelligenceSourceConfigurationShared
        );

      results.push(hereResult, tomTomResult);

      const reconciliationMetrics =
        await reconcileProviderObservationsShared(
          supabase,
          organizationId,
          getIntelligenceSourceConfigurationShared,
          48
        );

      staleProviderObservations +=
        reconciliationMetrics.staleProviderObservations;

      alertsWithStaleProviders +=
        reconciliationMetrics.alertsWithStaleProviders;

      alertsWithAllProvidersStale +=
        reconciliationMetrics.alertsWithAllProvidersStale;

      allProvidersStaleAlertsTransitioned +=
        reconciliationMetrics.allProvidersStaleAlertsTransitioned;

      partiallyReconciledAlerts +=
        reconciliationMetrics.partiallyReconciledAlerts;

      partiallyStaleProvidersRemoved +=
        reconciliationMetrics.partiallyStaleProvidersRemoved;
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
