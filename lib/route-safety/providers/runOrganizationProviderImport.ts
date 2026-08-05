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
  const expiredAlertsTransitioned =
    await expireRouteSafetyAlerts(
      supabase,
      organizationId
    );

  const hereResult =
    await importHereIncidents(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration
    );

  const tomTomResult =
    await importTomTomIncidents(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration
    );

  const reconciliationMetrics =
    await reconcileProviderObservations(
      supabase,
      organizationId,
      getIntelligenceSourceConfiguration,
      staleProviderThresholdHours
    );

  return {
    providerResults: [
      hereResult,
      tomTomResult,
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
