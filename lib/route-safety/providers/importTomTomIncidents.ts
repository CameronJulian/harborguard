import type {
  IntelligenceSourceConfigurationLoader,
  ProviderResult,
} from "@/lib/route-safety/providers/importHereIncidents";
import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { insertNewProviderAlerts } from "@/lib/route-safety/upsertRouteSafetyAlerts";

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

export async function importTomTomIncidents(
  supabase: any,
  organizationId: string,
  getSourceConfiguration: IntelligenceSourceConfigurationLoader
): Promise<ProviderResult> {
  const sourceLookup =
    await getSourceConfiguration(
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
