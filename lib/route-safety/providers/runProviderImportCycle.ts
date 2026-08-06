import {
  buildProviderImportCycleResult,
} from "@/lib/route-safety/providers/buildProviderImportCycleResult";
import type {
  ProviderImportCycleResult,
} from "@/lib/route-safety/providers/buildProviderImportCycleResult";
import {
  runOrganizationProviderImport,
} from "@/lib/route-safety/providers/runOrganizationProviderImport";
import type {
  ProviderResult,
} from "@/lib/route-safety/providers/types";

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

  return buildProviderImportCycleResult({
    organizationCount: organizationIds.length,
    staleProviderThresholdHours,
    expiredAlertsTransitioned,
    staleProviderObservations,
    alertsWithStaleProviders,
    alertsWithAllProvidersStale,
    allProvidersStaleAlertsTransitioned,
    partiallyReconciledAlerts,
    partiallyStaleProvidersRemoved,
    results,
  });
}
