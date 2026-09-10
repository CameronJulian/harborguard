import {
  expireRouteSafetyAlerts,
} from "@/lib/route-safety/providers/expireRouteSafetyAlerts";
import {
  getIntelligenceSourceConfiguration,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";
import {
  importHereIncidents,
} from "@/lib/route-safety/providers/importHereIncidents";
import {
  importTomTomIncidents,
} from "@/lib/route-safety/providers/importTomTomIncidents";
import {
  importAzureMapsIncidents,
} from "@/lib/route-safety/providers/importAzureMapsIncidents";
import {
  reconcileProviderObservations,
} from "@/lib/route-safety/providers/reconcileProviderObservations";
import type {
  ProviderResult,
} from "@/lib/route-safety/providers/types";

export type OrganizationProviderImportResult = {
  providerResults: ProviderResult[];
  expiredAlertsTransitioned: number;
  staleProviderObservations: number;
  alertsWithStaleProviders: number;
  alertsWithAllProvidersStale: number;
  allProvidersStaleAlertsTransitioned: number;
  partiallyReconciledAlerts: number;
  partiallyStaleProvidersRemoved: number;
};

export async function runOrganizationProviderImport(
  supabase: any,
  organizationId: string,
  staleProviderThresholdHours = 48
): Promise<OrganizationProviderImportResult> {
  const logStageTiming = (
    stage: string,
    startedAt: number
  ): void => {
    console.info(
      "[Route Safety provider timing]",
      {
        stage,
        durationMs:
          Date.now() - startedAt,
      }
    );
  };

  const overallStartedAt =
    Date.now();
  const expireAlertsStartedAt =
    Date.now();

  const expiredAlertsTransitioned =
    await expireRouteSafetyAlerts(
      supabase,
      organizationId
    );

  logStageTiming(
    "expire-alerts",
    expireAlertsStartedAt
  );

  const hereStartedAt =
    Date.now();

  const hereResult =
    await importHereIncidents(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration
    );

  logStageTiming(
    "here",
    hereStartedAt
  );

  const tomTomStartedAt =
    Date.now();

  const tomTomResult =
    await importTomTomIncidents(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration
    );

  logStageTiming(
    "tomtom",
    tomTomStartedAt
  );

  const azureMapsStartedAt =
    Date.now();

  const azureMapsResult =
    await importAzureMapsIncidents(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration
    );

  logStageTiming(
    "azure-maps",
    azureMapsStartedAt
  );

  const reconciliationStartedAt =
    Date.now();

  const reconciliationMetrics =
    await reconcileProviderObservations(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration,
      staleProviderThresholdHours
    );

  logStageTiming(
    "reconciliation",
    reconciliationStartedAt
  );

  logStageTiming(
    "total",
    overallStartedAt
  );

  return {
    providerResults: [
      hereResult,
      tomTomResult,
      azureMapsResult,
    ],
    expiredAlertsTransitioned,
    staleProviderObservations:
      reconciliationMetrics.staleProviderObservations,
    alertsWithStaleProviders:
      reconciliationMetrics.alertsWithStaleProviders,
    alertsWithAllProvidersStale:
      reconciliationMetrics.alertsWithAllProvidersStale,
    allProvidersStaleAlertsTransitioned:
      reconciliationMetrics.allProvidersStaleAlertsTransitioned,
    partiallyReconciledAlerts:
      reconciliationMetrics.partiallyReconciledAlerts,
    partiallyStaleProvidersRemoved:
      reconciliationMetrics.partiallyStaleProvidersRemoved,
  };
}
