export type TrafficFlowObservationInput = {
  providerSegmentId: string | null;
  road: string | null;
  currentSpeed: number;
  freeFlowSpeed: number;
  congestion: number;
  delayMinutes: number;
  confidence: number;
  jamFactor: number;
};

export type TrafficFlowCollectionScopeInput = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type PersistTrafficFlowObservationsResult = {
  received: number;
  persisted: number;
  skippedWithoutProviderSegmentId: number;
};

export async function persistTrafficFlowObservations(
  supabase: any,
  organizationId: string,
  observations: TrafficFlowObservationInput[],
  observedAt: string,
  collectionKey: string | null = null,
  collectionScope: TrafficFlowCollectionScopeInput | null = null
): Promise<PersistTrafficFlowObservationsResult> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "organizationId is required to persist traffic-flow observations."
    );
  }

  const normalizedObservedAt =
    observedAt.trim();

  if (
    !normalizedObservedAt ||
    Number.isNaN(Date.parse(normalizedObservedAt))
  ) {
    throw new Error(
      "A valid observedAt timestamp is required to persist traffic-flow observations."
    );
  }

  const normalizedCollectionKey =
    collectionKey?.trim() || null;

  let collectionLatitude: number | null = null;
  let collectionLongitude: number | null = null;
  let collectionRadiusMeters: number | null = null;

  if (collectionScope !== null) {
    const latitude =
      Number(collectionScope.latitude);

    const longitude =
      Number(collectionScope.longitude);

    const radiusMeters =
      Number(collectionScope.radiusMeters);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0
    ) {
      throw new Error(
        "A valid traffic-flow collection scope is required when collectionScope is provided."
      );
    }

    collectionLatitude = latitude;
    collectionLongitude = longitude;
    collectionRadiusMeters = radiusMeters;
  }

  const rows = observations.flatMap((observation) => {
    const providerSegmentId =
      observation.providerSegmentId?.trim() || null;

    if (!providerSegmentId) {
      return [];
    }

    return [
      {
        organization_id: normalizedOrganizationId,
        provider: "here",
        provider_segment_id: providerSegmentId,
        road_name: observation.road?.trim() || null,
        current_speed_kmh: observation.currentSpeed,
        free_flow_speed_kmh: observation.freeFlowSpeed,
        congestion_percent: observation.congestion,
        delay_minutes: observation.delayMinutes,
        confidence: observation.confidence,
        jam_factor: observation.jamFactor,
        observed_at: normalizedObservedAt,
        collection_key: normalizedCollectionKey,
        collection_latitude: collectionLatitude,
        collection_longitude: collectionLongitude,
        collection_radius_meters: collectionRadiusMeters,
      },
    ];
  });

  if (rows.length === 0) {
    return {
      received: observations.length,
      persisted: 0,
      skippedWithoutProviderSegmentId:
        observations.length,
    };
  }

  const query =
    supabase.from("traffic_flow_observations");

  const { error } =
    normalizedCollectionKey
      ? await query.upsert(rows, {
          onConflict:
            "organization_id,provider,provider_segment_id,collection_key",
        })
      : await query.insert(rows);

  if (error) {
    throw error;
  }

  return {
    received: observations.length,
    persisted: rows.length,
    skippedWithoutProviderSegmentId:
      observations.length - rows.length,
  };
}

