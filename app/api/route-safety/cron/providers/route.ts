import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProviderResult = {
  provider: "here" | "tomtom";
  organizationId: string;
  success: boolean;
  rawCount: number;
  imported: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  error: string | null;
};

type AlertRow = {
  organization_id: string;
  type: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  severity: string;
  source: string;
  status: string;
  expires_at: string | null;
  verified_at: string;

  // Provider metadata for future duplicate matching
  road_name?: string | null;
  road_from?: string | null;
  road_to?: string | null;
  provider_geometry?: unknown;
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
    return "collision";
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

  if (value === "1") return "collision";
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

function areCrossProviderEventsCompatible(
  existingType: string,
  existingTitle: string,
  incomingType: string,
  incomingTitle: string
) {
  if (existingType === incomingType) {
    return true;
  }

  const existingText = existingTitle.trim().toLowerCase();
  const incomingText = incomingTitle.trim().toLowerCase();

  const bothMatchKeywords = (keywords: string[]) =>
    keywords.some((keyword) => existingText.includes(keyword)) &&
    keywords.some((keyword) => incomingText.includes(keyword));

  const typesBelongToFamily = (
    familyTypes: string[]
  ) =>
    familyTypes.includes(existingType) &&
    familyTypes.includes(incomingType);

  const closureTypes = [
    "road_closure",
    "roadblock",
    "road_hazard",
  ];

  const closureKeywords = [
    "closed",
    "closure",
  ];

  if (
    typesBelongToFamily(closureTypes) &&
    bothMatchKeywords(closureKeywords)
  ) {
    return true;
  }

  const congestionTypes = [
    "congestion",
    "roadblock",
    "road_hazard",
  ];

  const congestionKeywords = [
    "backed-up traffic",
    "traffic congestion",
    "stationary traffic",
    "queuing traffic",
    "slow traffic",
  ];

  if (
    typesBelongToFamily(congestionTypes) &&
    bothMatchKeywords(congestionKeywords)
  ) {
    return true;
  }

  const roadworksTypes = [
    "roadworks",
    "roadblock",
    "road_hazard",
  ];

  const roadworksKeywords = [
    "road construction",
    "roadworks",
    "road works",
  ];

  return (
    typesBelongToFamily(roadworksTypes) &&
    bothMatchKeywords(roadworksKeywords)
  );
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

function buildAlertKey(alert: {
  title: string;
  latitude: number;
  longitude: number;
}) {
  return [
    alert.title.trim().toLowerCase(),
    Number(alert.latitude).toFixed(5),
    Number(alert.longitude).toFixed(5),
  ].join("|");
}

function distanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const latitudeDifference = toRadians(latitude2 - latitude1);
  const longitudeDifference = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}


function normalizeRoadName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "");
}

function getRepresentativeCoordinate(
  geometry: unknown
): { latitude: number; longitude: number } | null {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  const value = geometry as any;

  // TomTom GeoJSON LineString
  if (
    value.type === "LineString" &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length > 0
  ) {
    const first = value.coordinates[0];

    if (
      Array.isArray(first) &&
      first.length >= 2 &&
      Number.isFinite(Number(first[0])) &&
      Number.isFinite(Number(first[1]))
    ) {
      return {
        latitude: Number(first[1]),
        longitude: Number(first[0]),
      };
    }
  }

  // HERE shape.links.points
  if (
    value.shape &&
    Array.isArray(value.shape.links) &&
    value.shape.links.length > 0
  ) {
    const point = value.shape.links[0]?.points?.[0];

    if (
      point &&
      Number.isFinite(Number(point.lat)) &&
      Number.isFinite(Number(point.lng))
    ) {
      return {
        latitude: Number(point.lat),
        longitude: Number(point.lng),
      };
    }
  }

  return null;
}

async function insertNewProviderAlerts(
  supabase: any,
  organizationId: string,
  source: string,
  rows: AlertRow[]
) {
  if (rows.length === 0) {
    return {
      imported: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
    };
  }

  const { data: existingAlerts, error: existingError } =
  await supabase
    .from("route_safety_alerts")
    .select(`
      id,
      source,
      type,
      title,
      latitude,
      longitude,
      expires_at,
      road_name,
      road_from,
      road_to,
      provider_sources,
      provider_confirmation_count,
      provider_confidence,
      last_provider_confirmation_at
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (existingError) {
    throw existingError;
  }

  const normalizedExistingAlerts = existingAlerts || [];

  const existingSameProviderKeys = new Set(
    normalizedExistingAlerts
      .filter((alert: any) => alert.source === source)
      .map((alert: any) =>
        buildAlertKey({
          title: String(alert.title || ""),
          latitude: Number(alert.latitude),
          longitude: Number(alert.longitude),
        })
      )
  );

  const uniqueRows: Array<
    AlertRow & {
      provider_sources: string[];
      provider_confirmation_count: number;
      provider_confidence: number;
      last_provider_confirmation_at: string;
    }
  > = [];

  let skippedDuplicates = 0;
  let mergedDuplicates = 0;

  for (const row of rows) {
    const key = buildAlertKey(row);

    if (existingSameProviderKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }

   type CrossProviderCandidate = {
  alert: any;
  existingSource: string;
  existingType: string;
  incomingType: string;
  distanceMeters: number;
  typeMatches: boolean;
  roadMatches: boolean;
};

    const crossProviderCandidates = normalizedExistingAlerts
      .filter((alert: any) => {
        const existingSource = String(alert.source || "");

        if (!["here_traffic", "tomtom"].includes(existingSource)) {
          return false;
        }

        if (existingSource === source) {
          return false;
        }

        const existingProviderSources = Array.isArray(
          alert.provider_sources
        )
          ? alert.provider_sources.map(String)
          : [existingSource];

        return !existingProviderSources.includes(source);
      })
      .map((alert: any): CrossProviderCandidate | null => {
        const existingLatitude = Number(alert.latitude);
        const existingLongitude = Number(alert.longitude);

        if (
          !Number.isFinite(existingLatitude) ||
          !Number.isFinite(existingLongitude)
        ) {
          return null;
        }

        const distance = distanceMeters(
          row.latitude,
          row.longitude,
          existingLatitude,
          existingLongitude
        );

        const existingType = String(alert.type || "");
        const typeMatches = areCrossProviderEventsCompatible(
          existingType,
          String(alert.title || ""),
          row.type,
          row.title
        );
		
		const existingRoad = normalizeRoadName(alert.road_name);
const incomingRoad = normalizeRoadName(row.road_name);

const roadMatches =
  existingRoad.length > 0 &&
  incomingRoad.length > 0 &&
  existingRoad === incomingRoad;

        return {
          alert,
          existingSource: String(alert.source || ""),
          existingType,
          incomingType: row.type,
          distanceMeters: Math.round(distance),
          typeMatches,
		  roadMatches,
        };
      })
      .filter(
        (
          candidate: CrossProviderCandidate | null
        ): candidate is CrossProviderCandidate =>
          candidate !== null
      )
      .sort(
        (
          a: CrossProviderCandidate,
          b: CrossProviderCandidate
        ) => a.distanceMeters - b.distanceMeters
      );

    const crossProviderCandidate = crossProviderCandidates.find(
      (candidate: CrossProviderCandidate) =>
        candidate.typeMatches &&
(
  candidate.roadMatches ||
  candidate.distanceMeters <= 250
)
    );

    const crossProviderMatch = crossProviderCandidate?.alert;

    if (crossProviderMatch) {
      const confirmedAt = new Date().toISOString();

      const providerSources = Array.from(
        new Set([
          ...(Array.isArray(crossProviderMatch.provider_sources)
            ? crossProviderMatch.provider_sources.map(String)
            : [String(crossProviderMatch.source || "")]),
          source,
        ])
      ).filter(Boolean);

      const providerConfirmationCount = providerSources.length;

      const providerConfidence = Math.min(
        100,
        60 + Math.max(0, providerConfirmationCount - 1) * 20
      );

      const existingExpiryTime = crossProviderMatch.expires_at
        ? new Date(crossProviderMatch.expires_at).getTime()
        : Number.NaN;

      const incomingExpiryTime = row.expires_at
        ? new Date(row.expires_at).getTime()
        : Number.NaN;

      let mergedExpiresAt: string | null =
        crossProviderMatch.expires_at || row.expires_at || null;

      if (
        Number.isFinite(existingExpiryTime) &&
        Number.isFinite(incomingExpiryTime)
      ) {
        mergedExpiresAt =
          existingExpiryTime >= incomingExpiryTime
            ? crossProviderMatch.expires_at
            : row.expires_at;
      }

      const { error: mergeError } = await supabase
        .from("route_safety_alerts")
        .update({
          provider_sources: providerSources,
          provider_confirmation_count: providerConfirmationCount,
          provider_confidence: providerConfidence,
          last_provider_confirmation_at: confirmedAt,
          verification_status: "verified",
          verified_at: confirmedAt,
          expires_at: mergedExpiresAt,
        })
        .eq("organization_id", organizationId)
        .eq("id", crossProviderMatch.id);

      if (mergeError) {
        throw mergeError;
      }

      crossProviderMatch.provider_sources = providerSources;
      crossProviderMatch.provider_confirmation_count =
        providerConfirmationCount;
      crossProviderMatch.provider_confidence = providerConfidence;
      crossProviderMatch.last_provider_confirmation_at = confirmedAt;
      crossProviderMatch.expires_at = mergedExpiresAt;

      mergedDuplicates += 1;
      continue;
    }

    existingSameProviderKeys.add(key);

    const providerAlert = {
      ...row,
      provider_sources: [source],
      provider_confirmation_count: 1,
      provider_confidence: 60,
      last_provider_confirmation_at: new Date().toISOString(),
    };

    uniqueRows.push(providerAlert);

    normalizedExistingAlerts.push({
      id: null,
      source,
      type: row.type,
      title: row.title,
      latitude: row.latitude,
      longitude: row.longitude,
      expires_at: row.expires_at,
      provider_sources: [source],
      provider_confirmation_count: 1,
      provider_confidence: 60,
      last_provider_confirmation_at:
        providerAlert.last_provider_confirmation_at,
    });
  }

  if (uniqueRows.length === 0) {
    return {
      imported: 0,
      skippedDuplicates,
      mergedDuplicates,
    };
  }

  const { data: inserted, error: insertError } =
    await supabase
      .from("route_safety_alerts")
      .insert(uniqueRows)
      .select("id");

  if (insertError) {
    throw insertError;
  }

  return {
    imported: inserted?.length || 0,
    skippedDuplicates,
    mergedDuplicates,
  };
}

async function importHereIncidents(
  supabase: any,
  organizationId: string
): Promise<ProviderResult> {
  if (!process.env.HERE_API_KEY) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
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
      .map((incident: any): AlertRow | null => {
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
      .filter((row: AlertRow | null): row is AlertRow => row !== null);

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "here_traffic",
      rows
    );

    return {
      provider: "here",
      organizationId,
      success: true,
      rawCount: incidents.length,
      imported: result.imported,
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
  if (!process.env.TOMTOM_API_KEY) {
    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
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
      .map((incident: any): AlertRow | null => {
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
      .filter((row: AlertRow | null): row is AlertRow => row !== null);

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "tomtom",
      rows
    );

    return {
      provider: "tomtom",
      organizationId,
      success: true,
      rawCount: incidents.length,
      imported: result.imported,
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

    for (const organizationId of organizationIds) {
      const hereResult = await importHereIncidents(
        supabase,
        organizationId
      );

      const tomTomResult = await importTomTomIncidents(
        supabase,
        organizationId
      );

      results.push(hereResult, tomTomResult);
    }

    const imported = results.reduce(
      (total, result) => total + result.imported,
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
      imported,
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
