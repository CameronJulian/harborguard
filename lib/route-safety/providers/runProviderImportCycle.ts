import {
  buildProviderImportSummary,
} from "@/lib/route-safety/providers/buildProviderImportSummary";
import {
  runOrganizationProviderImport,
} from "@/lib/route-safety/providers/runOrganizationProviderImport";
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
    const organizationResult =
      await runOrganizationProviderImport(
        supabase,
        organizationId,
        staleProviderThresholdHours
      );

    results.push(
      ...organizationResult.providerResults
    );

    expiredAlertsTransitioned +=
      organizationResult.expiredAlertsTransitioned;

    staleProviderObservations +=
      organizationResult.staleProviderObservations;

    alertsWithStaleProviders +=
      organizationResult.alertsWithStaleProviders;

    alertsWithAllProvidersStale +=
      organizationResult.alertsWithAllProvidersStale;

    allProvidersStaleAlertsTransitioned +=
      organizationResult.allProvidersStaleAlertsTransitioned;

    partiallyReconciledAlerts +=
      organizationResult.partiallyReconciledAlerts;

    partiallyStaleProvidersRemoved +=
      organizationResult.partiallyStaleProvidersRemoved;
  }

  const {
    providerRuns,
    imported,
    refreshedExisting,
    skippedDuplicates,
    mergedDuplicates,
    failedProviders,
  } = buildProviderImportSummary(results);

  return {
    success: failedProviders === 0,
    generatedAt: new Date().toISOString(),
    organizationsProcessed: organizationIds.length,
    providerRuns,
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
