import {
  buildProviderImportSummary,
} from "@/lib/route-safety/providers/buildProviderImportSummary";
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

export type BuildProviderImportCycleResultInput = {
  organizationCount: number;
  staleProviderThresholdHours: number;
  expiredAlertsTransitioned: number;
  staleProviderObservations: number;
  alertsWithStaleProviders: number;
  alertsWithAllProvidersStale: number;
  allProvidersStaleAlertsTransitioned: number;
  partiallyReconciledAlerts: number;
  partiallyStaleProvidersRemoved: number;
  results: ProviderResult[];
  generatedAt?: string;
};

export function buildProviderImportCycleResult(
  input: BuildProviderImportCycleResultInput
): ProviderImportCycleResult {
  const {
    organizationCount,
    staleProviderThresholdHours,
    expiredAlertsTransitioned,
    staleProviderObservations,
    alertsWithStaleProviders,
    alertsWithAllProvidersStale,
    allProvidersStaleAlertsTransitioned,
    partiallyReconciledAlerts,
    partiallyStaleProvidersRemoved,
    results,
    generatedAt = new Date().toISOString(),
  } = input;

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
    generatedAt,
    organizationsProcessed: organizationCount,
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
