import type {
  IntelligenceSourceConfigurationLoader,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";
import type { ProviderResult } from "@/lib/route-safety/providers/types";
import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { insertNewProviderAlerts } from "@/lib/route-safety/upsertRouteSafetyAlerts";
import { enrichRouteSafetyAlertsWithRoadContext } from "@/lib/route-safety/enrichRouteSafetyAlertsWithRoadContext";
import { resolveRoadContext } from "@/lib/road-context/provider";
import { persistRouteSafetyProviderObservation } from "@/lib/hspp/persistRouteSafetyProviderObservation";
import { HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION } from "@/lib/hspp/assessHsppExternalIntelligenceEvidence";



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

export async function importHereIncidents(
  supabase: any,
  organizationId: string,
  getSourceConfiguration: IntelligenceSourceConfigurationLoader
): Promise<ProviderResult> {
  const sourceLookup =
    await getSourceConfiguration(
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

    const normalizedIncidents = incidents
      .map((incident: any) => {
        const details =
          incident?.incidentDetails || {};

        const description =
          String(
            details?.description?.value ||
              details?.summary?.value ||
              details?.type ||
              "HERE traffic incident"
          );

        const coordinates =
          getHereLatLng(incident);

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

        const row: RouteSafetyAlertRow = {
          organization_id:
            organizationId,
          type:
            mapHereType(description),
          title:
            description.slice(0, 120),
          description,
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          radius_meters:
            1000,
          severity:
            mapHereSeverity(
              details?.criticality
            ),
          source:
            "here_traffic",
          status:
            "active",
          expires_at:
            details?.endTime || null,
          verified_at:
            new Date().toISOString(),
          road_name:
            roadName,
          road_from:
            null,
          road_to:
            null,
          provider_geometry:
            incident?.location?.shape ??
            incident?.location?.polyline ??
            null,
        };

        const providerMessageId =
          typeof details?.originalId === "string"
            ? details.originalId.trim()
            : typeof details?.id === "string"
              ? details.id.trim()
              : "";

        const observedAtCandidate =
          typeof details?.entryTime === "string"
            ? details.entryTime
            : typeof details?.startTime === "string"
              ? details.startTime
              : "";

        const observedAt =
          observedAtCandidate &&
          Number.isFinite(
            Date.parse(observedAtCandidate)
          )
            ? new Date(
                Date.parse(
                  observedAtCandidate
                )
              ).toISOString()
            : null;

        return {
          row,
          providerMessageId,
          observedAt,
        };
      })
      .filter(
        (
          item: {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            observedAt: string | null;
          } | null
        ): item is {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        } =>
          item !== null
      );

    for (
      const normalized
      of normalizedIncidents
    ) {
      if (
        !normalized.providerMessageId ||
        !normalized.observedAt
      ) {
        continue;
      }

      await persistRouteSafetyProviderObservation({
        supabase,
        organizationId,
        provider:
          "here",
        sourceStream:
          "here_traffic",
        providerMessageId:
          normalized.providerMessageId,
        observedAt:
          normalized.observedAt,
        payloadSchemaVersion:
          HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
        normalizedPayload:
          normalized.row as unknown as Record<
            string,
            unknown
          >,
      });
    }

    const normalizedRows =
      normalizedIncidents.map(
        (item: {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        }) => item.row
      );
    const roadContextEnrichment =

      await enrichRouteSafetyAlertsWithRoadContext(

        normalizedRows,

        resolveRoadContext

      );


    const rows = roadContextEnrichment.rows;

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
