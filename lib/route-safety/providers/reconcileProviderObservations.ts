import type {
  IntelligenceSourceConfigurationLoader,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";

export type ProviderReconciliationMetrics = {
  staleProviderObservations: number;
  alertsWithStaleProviders: number;
  alertsWithAllProvidersStale: number;
  allProvidersStaleAlertsTransitioned: number;
  partiallyReconciledAlerts: number;
  partiallyStaleProvidersRemoved: number;
};

export async function reconcileProviderObservations(
  supabase: any,
  organizationId: string,
  getSourceConfiguration: IntelligenceSourceConfigurationLoader,
  staleThresholdHours = 48
): Promise<ProviderReconciliationMetrics> {
  let staleProviderObservations = 0;
  let alertsWithStaleProviders = 0;
  let alertsWithAllProvidersStale = 0;
  let allProvidersStaleAlertsTransitioned = 0;
  let partiallyReconciledAlerts = 0;
  let partiallyStaleProvidersRemoved = 0;

  const staleBefore = new Date(
    Date.now() - staleThresholdHours * 60 * 60 * 1000
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
        await getSourceConfiguration(
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


  return {
    staleProviderObservations,
    alertsWithStaleProviders,
    alertsWithAllProvidersStale,
    allProvidersStaleAlertsTransitioned,
    partiallyReconciledAlerts,
    partiallyStaleProvidersRemoved,
  };
}
