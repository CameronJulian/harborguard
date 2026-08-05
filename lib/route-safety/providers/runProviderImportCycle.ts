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

export type ProviderImportCycleResult = {
  success: boolean;
  generatedAt: string;
  organizationsProcessed: number;
  providerRuns: number;
  expiredAlertsTransitioned: number;
  staleProviderThresholdHours: number;
  staleProviderObservations: number;
  alertsWithStaleProviders: number;
  alertsWithAllProvidersStale: number;
  allProvidersStaleAlertsTransitioned: number;
  partiallyReconciledAlerts: number;
  partiallyStaleProvidersRemoved: number;
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  failedProviders: number;
  results: ProviderResult[];
};

export async function runProviderImportCycle(
  supabase: any,
  organizationIds: string[],
  staleProviderThresholdHours = 48
): Promise<ProviderImportCycleResult> {
  const results: ProviderResult[] = [];

  let expiredAlertsTransitioned = 0;
  let staleProviderObservations = 0;
  let alertsWithStaleProviders = 0;
  let alertsWithAllProvidersStale = 0;
  let allProvidersStaleAlertsTransitioned = 0;
  let partiallyReconciledAlerts = 0;
  let partiallyStaleProvidersRemoved = 0;

  for (const organizationId of organizationIds) {
    expiredAlertsTransitioned +=
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

    results.push(
      hereResult,
      tomTomResult
    );

    const reconciliationMetrics =
      await reconcileProviderObservations(
        supabase,
        organizationId,
        getIntelligenceSourceConfiguration,
        staleProviderThresholdHours
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
    (total, result) =>
      total + result.imported,
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

  return {
    success: failedProviders === 0,
    generatedAt: new Date().toISOString(),
    organizationsProcessed: organizationIds.length,
    providerRuns: results.length,
    expiredAlertsTransitioned,
    staleProviderThresholdHours,
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
  };
}
