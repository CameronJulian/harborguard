import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { deriveProviderQualityState } from "@/lib/route-safety/deriveProviderQualityState";

export type ProviderAlertResolution = {
  inputIndex: number;
  outcome:
    | "inserted"
    | "refreshed_existing"
    | "merged_cross_provider"
    | "skipped_duplicate";
  alertId: string | null;
  providerSources: string[];
  providerLastSeen: Record<string, string>;
  providerConfirmationCount: number;
  providerConfidence: number;
};

export type InsertNewProviderAlertsResult = {
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  resolutions: ProviderAlertResolution[];
};

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



function extractGeometryCoordinates(
  geometry: unknown
): { latitude: number; longitude: number }[] {
  if (!geometry || typeof geometry !== "object") {
    return [];
  }

  const value = geometry as any;

  // TomTom GeoJSON LineString
  if (
    value.type === "LineString" &&
    Array.isArray(value.coordinates)
  ) {
    return value.coordinates
      .filter(
        (coordinate: unknown) =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(Number(coordinate[0])) &&
          Number.isFinite(Number(coordinate[1]))
      )
      .map((coordinate: any) => ({
        latitude: Number(coordinate[1]),
        longitude: Number(coordinate[0]),
      }));
  }

  // HERE links[].points[]
  const hereLinks = Array.isArray(value.links)
    ? value.links
    : Array.isArray(value.shape?.links)
      ? value.shape.links
      : null;

  if (!hereLinks) {
    return [];
  }

  return hereLinks.flatMap((link: any) =>
    Array.isArray(link.points)
      ? link.points
          .filter(
            (point: any) =>
              Number.isFinite(Number(point?.lat)) &&
              Number.isFinite(Number(point?.lng))
          )
          .map((point: any) => ({
            latitude: Number(point.lat),
            longitude: Number(point.lng),
          }))
      : []
  );
}

function getMinimumGeometryDistanceMeters(
  geometryA: unknown,
  geometryB: unknown
): number | null {
  const coordinatesA = extractGeometryCoordinates(geometryA);
  const coordinatesB = extractGeometryCoordinates(geometryB);

  if (
    coordinatesA.length === 0 ||
    coordinatesB.length === 0
  ) {
    return null;
  }

  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const pointA of coordinatesA) {
    for (const pointB of coordinatesB) {
      const distance = distanceMeters(
        pointA.latitude,
        pointA.longitude,
        pointB.latitude,
        pointB.longitude
      );

      if (distance < minimumDistance) {
        minimumDistance = distance;
      }
    }
  }

  return Number.isFinite(minimumDistance)
    ? minimumDistance
    : null;
}

export async function insertNewProviderAlerts(
  supabase: any,
  organizationId: string,
  source: string,
  baseConfidence: number,
  rows: RouteSafetyAlertRow[]
): Promise<InsertNewProviderAlertsResult> {
  if (rows.length === 0) {
    return {
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      resolutions: [],
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
provider_geometry,
provider_sources,
      provider_confirmation_count,
      provider_confidence,
      provider_last_seen,
      last_provider_confirmation_at
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (existingError) {
    throw existingError;
  }

  const normalizedExistingAlerts = existingAlerts || [];

  const existingSameProviderByKey = new Map<string, any>(
    normalizedExistingAlerts
      .filter((alert: any) => alert.source === source)
      .map((alert: any) => [
        buildAlertKey({
          title: String(alert.title || ""),
          latitude: Number(alert.latitude),
          longitude: Number(alert.longitude),
        }),
        alert,
      ])
  );

  const queuedSameProviderKeys = new Set<string>();
  const uniqueRows: Array<
    RouteSafetyAlertRow & {
      provider_sources: string[];
      provider_confirmation_count: number;
      provider_confidence: number;
      last_provider_confirmation_at: string;
      __inputIndex: number;
      __resolutionKey: string;
    }
  > = [];

  let refreshedExisting = 0;
  let skippedDuplicates = 0;
  let mergedDuplicates = 0;

  const resolutions: ProviderAlertResolution[] = [];

  const pendingInsertedByKey =
    new Map<
      string,
      Array<{
        inputIndex: number;
        outcome:
          | "inserted"
          | "skipped_duplicate";
      }>
    >();

  for (let inputIndex = 0; inputIndex < rows.length; inputIndex += 1) {
    const row = rows[inputIndex];
    const key = buildAlertKey(row);

    if (queuedSameProviderKeys.has(key)) {
      skippedDuplicates += 1;

      const pendingForKey =
        pendingInsertedByKey.get(key);

      if (!pendingForKey) {
        throw new Error(
          `Missing pending inserted resolution for duplicate key ${key}.`
        );
      }

      pendingForKey.push({
        inputIndex,
        outcome: "skipped_duplicate",
      });
      continue;
    }

    const sameProviderMatch =
      existingSameProviderByKey.get(key);

    if (sameProviderMatch) {
      const confirmedAt = new Date().toISOString();

      const providerLastSeen = {
        ...(sameProviderMatch.provider_last_seen || {}),
        [source]: confirmedAt,
      };

      const providerQuality =
        deriveProviderQualityState({
          providerLastSeen,
          providerSources: [source],
          primarySource: source,
          primarySourceBaseConfidence:
            baseConfidence,
        });

      const existingExpiryTime = sameProviderMatch.expires_at
        ? new Date(sameProviderMatch.expires_at).getTime()
        : Number.NaN;

      const incomingExpiryTime = row.expires_at
        ? new Date(row.expires_at).getTime()
        : Number.NaN;

      let refreshedExpiresAt: string | null =
        sameProviderMatch.expires_at || row.expires_at || null;

      if (
        Number.isFinite(existingExpiryTime) &&
        Number.isFinite(incomingExpiryTime)
      ) {
        refreshedExpiresAt =
          incomingExpiryTime > existingExpiryTime
            ? row.expires_at
            : sameProviderMatch.expires_at;
      }

      const existingRoadName =
        typeof sameProviderMatch.road_name === "string"
          ? sameProviderMatch.road_name.trim()
          : "";

      const incomingRoadName =
        typeof row.road_name === "string"
          ? row.road_name.trim()
          : "";

      const refreshedRoadName =
        existingRoadName ||
        incomingRoadName ||
        null;
      const { error: refreshError } = await supabase
        .from("route_safety_alerts")
        .update({
          provider_sources:
            providerQuality.providerSources,
          provider_confirmation_count:
            providerQuality.providerConfirmationCount,
          provider_confidence:
            providerQuality.providerConfidence,
          last_provider_confirmation_at: confirmedAt,
          provider_last_seen: providerLastSeen,
          verified_at: confirmedAt,
          verification_status: "verified",
          expires_at: refreshedExpiresAt,
          road_name: refreshedRoadName,
        })
        .eq("organization_id", organizationId)
        .eq("id", sameProviderMatch.id);

      if (refreshError) {
        throw refreshError;
      }

      sameProviderMatch.provider_sources =
        providerQuality.providerSources;
      sameProviderMatch.provider_confirmation_count =
        providerQuality.providerConfirmationCount;
      sameProviderMatch.provider_confidence =
        providerQuality.providerConfidence;
      sameProviderMatch.last_provider_confirmation_at =
        confirmedAt;
      sameProviderMatch.provider_last_seen = providerLastSeen;
      sameProviderMatch.expires_at = refreshedExpiresAt;
      sameProviderMatch.road_name = refreshedRoadName;

      refreshedExisting += 1;

      resolutions.push({
        inputIndex,
        outcome: "refreshed_existing",
        alertId:
          String(sameProviderMatch.id),
        providerSources:
          providerQuality.providerSources,
        providerLastSeen,
        providerConfirmationCount:
          providerQuality.providerConfirmationCount,
        providerConfidence:
          providerQuality.providerConfidence,
      });
      continue;
    }

       type CrossProviderCandidate = {
      alert: any;
      existingSource: string;
      existingType: string;
      incomingType: string;
      distanceMeters: number;
      geometryDistanceMeters: number | null;
      typeMatches: boolean;
      roadMatches: boolean;
      geometryMatches: boolean;
    };

    const crossProviderCandidates = normalizedExistingAlerts
      .filter((alert: any) => {
        const existingSource = String(alert.source || "");

        if (!["here_traffic", "tomtom", "azure_maps_traffic"].includes(existingSource)) {
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

       const geometryDistance =
  getMinimumGeometryDistanceMeters(
    alert.provider_geometry,
    row.provider_geometry
  );

        const geometryMatches =
          geometryDistance !== null && geometryDistance <= 250;

        return {
          alert,
          existingSource: String(alert.source || ""),
          existingType,
          incomingType: row.type,
          distanceMeters: Math.round(distance),
          geometryDistanceMeters:
            geometryDistance === null
              ? null
              : Math.round(geometryDistance),
          typeMatches,
          roadMatches,
          geometryMatches,
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
          candidate.geometryMatches ||
          candidate.distanceMeters <= 250
        )
    );

    const crossProviderMatch = crossProviderCandidate?.alert;

    if (crossProviderMatch) {
      const confirmedAt = new Date().toISOString();

      const providerLastSeen = {
        ...(crossProviderMatch.provider_last_seen || {}),
        [source]: confirmedAt,
      };

      const requestedProviderSources =
        Array.from(
          new Set([
            ...(Array.isArray(
              crossProviderMatch.provider_sources
            )
              ? crossProviderMatch.provider_sources.map(
                  String
                )
              : [
                  String(
                    crossProviderMatch.source || ""
                  ),
                ]),
            source,
          ])
        ).filter(Boolean);

      const providerQuality =
        deriveProviderQualityState({
          providerLastSeen,
          providerSources:
            requestedProviderSources,
          primarySource: source,
          primarySourceBaseConfidence:
            baseConfidence,
        });

      const providerSources =
        providerQuality.providerSources;

      const providerConfirmationCount =
        providerQuality.providerConfirmationCount;

      const providerConfidence =
        providerQuality.providerConfidence;

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
          provider_last_seen: providerLastSeen,
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
      crossProviderMatch.provider_last_seen = providerLastSeen;
      crossProviderMatch.expires_at = mergedExpiresAt;

      mergedDuplicates += 1;

      resolutions.push({
        inputIndex,
        outcome: "merged_cross_provider",
        alertId:
          String(crossProviderMatch.id),
        providerSources,
        providerLastSeen,
        providerConfirmationCount,
        providerConfidence,
      });
      continue;
    }


    const confirmedAt = new Date().toISOString();

    const providerQuality =
      deriveProviderQualityState({
        providerLastSeen: {
          [source]: confirmedAt,
        },
        providerSources: [source],
        primarySource: source,
        primarySourceBaseConfidence:
          baseConfidence,
      });
    const providerAlert = {
      ...row,
      provider_sources:
        providerQuality.providerSources,
      provider_confirmation_count:
        providerQuality.providerConfirmationCount,
      provider_confidence:
        providerQuality.providerConfidence,
      last_provider_confirmation_at:
        confirmedAt,
      provider_last_seen:
        providerQuality.providerLastSeen,
      __inputIndex: inputIndex,
      __resolutionKey: key,
    };

    uniqueRows.push(providerAlert);

    pendingInsertedByKey.set(
      key,
      [{
        inputIndex,
        outcome: "inserted",
      }]
    );

    normalizedExistingAlerts.push({
      id: null,
      source,
      type: row.type,
      title: row.title,
      latitude: row.latitude,
      longitude: row.longitude,
      expires_at: row.expires_at,
      provider_sources:
        providerQuality.providerSources,
      provider_confirmation_count:
        providerQuality.providerConfirmationCount,
      provider_confidence:
        providerQuality.providerConfidence,
      last_provider_confirmation_at:
        providerAlert.last_provider_confirmation_at,
      provider_last_seen: providerAlert.provider_last_seen,
    });

    queuedSameProviderKeys.add(key);
  }

  if (uniqueRows.length === 0) {
    return {
      imported: 0,
      refreshedExisting,
      skippedDuplicates,
      mergedDuplicates,
      resolutions,
    };
  }

  const rowsToInsert =
    uniqueRows.map((
      {
        __inputIndex: _inputIndex,
        __resolutionKey: _resolutionKey,
        ...persistedRow
      }
    ) => persistedRow);

  const { data: inserted, error: insertError } =
    await supabase
      .from("route_safety_alerts")
      .insert(rowsToInsert)
      .select(`
        id,
        title,
        latitude,
        longitude,
        provider_sources,
        provider_last_seen,
        provider_confirmation_count,
        provider_confidence
      `);

  if (insertError) {
    throw insertError;
  }

  const insertedByKey =
    new Map<string, any>();

  for (const insertedRow of inserted || []) {
    const insertedKey =
      buildAlertKey({
        title:
          String(insertedRow.title || ""),
        latitude:
          Number(insertedRow.latitude),
        longitude:
          Number(insertedRow.longitude),
      });

    insertedByKey.set(
      insertedKey,
      insertedRow
    );
  }

  for (const [key, pending] of pendingInsertedByKey) {
    const insertedRow =
      insertedByKey.get(key);

    if (!insertedRow) {
      throw new Error(
        `Inserted Route Safety alert could not be resolved for key ${key}.`
      );
    }

    const providerSources =
      Array.isArray(insertedRow.provider_sources)
        ? insertedRow.provider_sources.map(String)
        : [];

    const providerLastSeen =
      insertedRow.provider_last_seen &&
      typeof insertedRow.provider_last_seen === "object"
        ? Object.fromEntries(
            Object.entries(
              insertedRow.provider_last_seen
            ).map(([provider, observedAt]) => [
              String(provider),
              String(observedAt),
            ])
          )
        : {};

    const providerConfirmationCount =
      Number(
        insertedRow.provider_confirmation_count
      );

    const providerConfidence =
      Number(
        insertedRow.provider_confidence
      );

    if (
      !Number.isInteger(providerConfirmationCount) ||
      providerConfirmationCount < 0 ||
      !Number.isFinite(providerConfidence)
    ) {
      throw new Error(
        `Inserted Route Safety provider quality is invalid for key ${key}.`
      );
    }

    for (const pendingResolution of pending) {
      resolutions.push({
        inputIndex:
          pendingResolution.inputIndex,
        outcome:
          pendingResolution.outcome,
        alertId:
          String(insertedRow.id),
        providerSources,
        providerLastSeen,
        providerConfirmationCount,
        providerConfidence,
      });
    }
  }

  resolutions.sort(
    (a, b) =>
      a.inputIndex - b.inputIndex
  );

  return {
    imported: inserted?.length || 0,
    refreshedExisting,
    skippedDuplicates,
    mergedDuplicates,
    resolutions,
  };
}
