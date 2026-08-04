import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { insertNewProviderAlerts } from "@/lib/route-safety/upsertRouteSafetyAlerts";

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



function mapHereSeverity(criticality?: string) {
  const value = String(criticality || "").toLowerCase();

  if (value.includes("critical") || value.includes("major")) {
    return "critical";
  }

  if (value.includes("high")) {
    return "high";
  }

  if (value.includes("medium")) {
    return "medium";
  }

  return "low";
}

function mapHereType(description: string) {
  const text = description.toLowerCase();

  if (text.includes("traffic light") || text.includes("signal")) {
    return "traffic_light_outage";
  }

  if (
    text.includes("accident") ||
    text.includes("crash") ||
    text.includes("collision")
  ) {
    return "accident";
  }

  if (text.includes("protest")) {
    return "protest";
  }

  if (
    text.includes("road construction") ||
    text.includes("roadworks") ||
    text.includes("road works")
  ) {
    return "roadworks";
  }

  if (
    text.includes("backed-up traffic") ||
    text.includes("traffic congestion") ||
    text.includes("stationary traffic") ||
    text.includes("queuing traffic") ||
    text.includes("slow traffic")
  ) {
    return "congestion";
  }

  if (
    text.includes("road closed") ||
    text.includes("closed ahead") ||
    text.includes("closed") ||
    text.includes("closure")
  ) {
    return "road_closure";
  }

  if (text.includes("roadblock")) {
    return "roadblock";
  }

  return "road_hazard";
}

function getHereLatLng(incident: any) {
  const shapePoint =
    incident?.location?.shape?.links?.[0]?.points?.[0];

  if (
    Number.isFinite(Number(shapePoint?.lat)) &&
    Number.isFinite(Number(shapePoint?.lng))
  ) {
    return {
      latitude: Number(shapePoint.lat),
      longitude: Number(shapePoint.lng),
    };
  }

  const polylinePoint =
    incident?.location?.polyline?.points?.[0];

  if (
    Number.isFinite(Number(polylinePoint?.lat)) &&
    Number.isFinite(Number(polylinePoint?.lng))
  ) {
    return {
      latitude: Number(polylinePoint.lat),
      longitude: Number(polylinePoint.lng),
    };
  }

  return null;
}

function mapTomTomType(
  category: number | string | null,
  description: string
) {
  const text = description.toLowerCase();
const value = String(category || "");

if (
  text.includes("road construction") ||
  text.includes("roadworks") ||
  text.includes("road works")
) {
  return "roadworks";
}

if (
  text.includes("road closed") ||
  text.includes("closed ahead") ||
  text.includes("closed") ||
  text.includes("closure")
) {
  return "road_closure";
}

if (
  text.includes("backed-up traffic") ||
  text.includes("traffic congestion") ||
  text.includes("stationary traffic") ||
  text.includes("queuing traffic") ||
  text.includes("slow traffic")
) {
  return "congestion";
}

  if (value === "1") return "accident";
  if (value === "2") return "weather_hazard";
  if (value === "3") return "road_hazard";
  if (value === "4") return "weather_hazard";
  if (value === "5") return "weather_hazard";
  if (value === "6") return "congestion";
  if (value === "7") return "lane_closure";
  if (value === "8") return "road_closure";
  if (value === "9") return "roadworks";
  if (value === "10") return "weather_hazard";
  if (value === "11") return "flooding";
  if (value === "14") return "vehicle_breakdown";

  return "road_hazard";
}

function mapTomTomSeverity(magnitude: number | string | null) {
  const value = Number(magnitude || 0);

  if (value >= 4) {
    return "critical";
  }

  if (value >= 3) {
    return "high";
  }

  if (value >= 2) {
    return "medium";
  }

  return "low";
}

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

async function importHereIncidents(
  supabase: any,
  organizationId: string
): Promise<ProviderResult> {
  const sourceLookup =
    await getIntelligenceSourceConfiguration(
      supabase,
      "here_traffic"
    );

  if (!sourceLookup.configuration) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        sourceLookup.error ||
        "HERE source configuration could not be loaded.",
    };
  }

  const sourceConfiguration =
    sourceLookup.configuration;

  if (
    !sourceConfiguration.enabled ||
    !sourceConfiguration.approvedForIngestion
  ) {
    console.info(
      "[HERE provider ingestion] Skipped by intelligence source registry."
    );

    return {
      provider: "here",
      organizationId,
      success: true,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: null,
    };
  }

  if (!process.env.HERE_API_KEY) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: "HERE_API_KEY is not configured.",
    };
  }

  try {
    const latitude = Number(
      process.env.TRAFFIC_CENTER_LATITUDE || -33.9249
    );

    const longitude = Number(
      process.env.TRAFFIC_CENTER_LONGITUDE || 18.4241
    );

    const radiusMeters = Number(
      process.env.TRAFFIC_IMPORT_RADIUS_METERS || 25000
    );

    const url =
      "https://data.traffic.hereapi.com/v7/incidents" +
      `?in=circle:${latitude},${longitude};r=${radiusMeters}` +
      "&locationReferencing=shape" +
      `&apikey=${process.env.HERE_API_KEY}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.title ||
          data?.error ||
          "HERE Traffic request failed."
      );
    }

    const incidents = Array.isArray(data?.results)
      ? data.results
      : [];

    const rows = incidents
      .map((incident: any): RouteSafetyAlertRow | null => {
        const details = incident?.incidentDetails || {};

        const description = String(
          details?.description?.value ||
            details?.summary?.value ||
            details?.type ||
            "HERE traffic incident"
        );

        const coordinates = getHereLatLng(incident);

        if (!coordinates) {
          return null;
        }
		
		const firstLink =
  incident?.location?.shape?.links?.[0] ??
  incident?.location?.polyline?.links?.[0];

const roadName =
  firstLink?.name ??
  firstLink?.roadName ??
  details?.roadName ??
  null;

        return {
          organization_id: organizationId,
          type: mapHereType(description),
          title: description.slice(0, 120),
          description,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radius_meters: 1000,
          severity: mapHereSeverity(details?.criticality),
          source: "here_traffic",
          status: "active",
          expires_at: details?.endTime || null,
verified_at: new Date().toISOString(),

road_name: roadName,
road_from: null,
road_to: null,
provider_geometry:
  incident?.location?.shape ??
  incident?.location?.polyline ??
  null,
        };
      })
      .filter((row: RouteSafetyAlertRow | null): row is RouteSafetyAlertRow => row !== null);

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "here_traffic",
      sourceConfiguration.baseConfidence,
      rows
    );

    return {
      provider: "here",
      organizationId,
      success: true,
      rawCount: incidents.length,
      imported: result.imported,
      refreshedExisting: result.refreshedExisting,
      skippedDuplicates: result.skippedDuplicates,
      mergedDuplicates: result.mergedDuplicates,
      error: null,
    };
  } catch (error: unknown) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        error instanceof Error
          ? error.message
          : "HERE incident ingestion failed.",
    };
  }
}

async function importTomTomIncidents(
  supabase: any,
  organizationId: string
): Promise<ProviderResult> {
  const sourceLookup =
    await getIntelligenceSourceConfiguration(
      supabase,
      "tomtom"
    );

  if (!sourceLookup.configuration) {
    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        sourceLookup.error ||
        "TomTom source configuration could not be loaded.",
    };
  }

  const sourceConfiguration =
    sourceLookup.configuration;

  if (
    !sourceConfiguration.enabled ||
    !sourceConfiguration.approvedForIngestion
  ) {
    console.info(
      "[TomTom provider ingestion] Skipped by intelligence source registry."
    );

    return {
      provider: "tomtom",
      organizationId,
      success: true,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: null,
    };
  }

  if (!process.env.TOMTOM_API_KEY) {
    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: "TOMTOM_API_KEY is not configured.",
    };
  }

  try {
    const bbox =
      process.env.TOMTOM_TRAFFIC_BBOX ||
      "18.20,-34.10,19.10,-33.60";

    const fields =
      "{incidents{type,geometry{type,coordinates}," +
      "properties{iconCategory,magnitudeOfDelay," +
      "events{description,code},from,to,length,delay}}}";

    const url =
      "https://api.tomtom.com/traffic/services/5/incidentDetails" +
      `?bbox=${encodeURIComponent(bbox)}` +
      `&fields=${encodeURIComponent(fields)}` +
      "&language=en-GB" +
      "&timeValidityFilter=present" +
      `&key=${process.env.TOMTOM_API_KEY}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detailedError?.message ||
          data?.error?.description ||
          "TomTom Traffic request failed."
      );
    }

    const incidents = Array.isArray(data?.incidents)
      ? data.incidents
      : [];

    const rows = incidents
      .map((incident: any): RouteSafetyAlertRow | null => {
        const coordinates = incident?.geometry?.coordinates;

        const firstPoint = Array.isArray(coordinates?.[0])
          ? coordinates[0]
          : coordinates;

        const longitude = Number(firstPoint?.[0]);
        const latitude = Number(firstPoint?.[1]);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        const properties = incident?.properties || {};

        const eventDescription = String(
          properties?.events?.[0]?.description ||
            properties?.from ||
            "Traffic incident reported"
        );

        return {
          organization_id: organizationId,
          type: mapTomTomType(
            properties?.iconCategory,
            eventDescription
          ),
          title: eventDescription.slice(0, 120),
          description:
            "Automatically imported from TomTom Traffic. " +
            `Delay: ${properties?.delay || 0}s. ` +
            `Length: ${properties?.length || 0}m.`,
          latitude,
          longitude,
          radius_meters: 1200,
          severity: mapTomTomSeverity(
            properties?.magnitudeOfDelay
          ),
           source: "tomtom",
  status: "active",
  expires_at: new Date(
    Date.now() + 2 * 60 * 60 * 1000
  ).toISOString(),
  verified_at: new Date().toISOString(),

  road_name:
    properties?.from ??
    properties?.to ??
    null,

  road_from:
    properties?.from ??
    null,

  road_to:
    properties?.to ??
    null,

  provider_geometry:
    incident?.geometry ??
    null,
};
      })
      .filter((row: RouteSafetyAlertRow | null): row is RouteSafetyAlertRow => row !== null);

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "tomtom",
      sourceConfiguration.baseConfidence,
      rows
    );

    return {
      provider: "tomtom",
      organizationId,
      success: true,
      rawCount: incidents.length,
      imported: result.imported,
      refreshedExisting: result.refreshedExisting,
      skippedDuplicates: result.skippedDuplicates,
      mergedDuplicates: result.mergedDuplicates,
      error: null,
    };
  } catch (error: unknown) {
    console.error("[TomTom provider ingestion]", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error || "TomTom incident ingestion failed.");

    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: errorMessage,
    };
  }
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

      const hereResult = await importHereIncidents(
        supabase,
        organizationId
      );

      const tomTomResult = await importTomTomIncidents(
        supabase,
        organizationId
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
