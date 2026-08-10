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
  collectionKey: string | null = null
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
