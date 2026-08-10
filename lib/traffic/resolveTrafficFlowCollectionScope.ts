const DEFAULT_TRAFFIC_FLOW_RADIUS_METERS = 10000;

export type TrafficFlowCollectionScope = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  sourceVehicleId: string;
  sourceRecordedAt: string;
};

export async function resolveTrafficFlowCollectionScope(
  supabase: any,
  organizationId: string
): Promise<TrafficFlowCollectionScope | null> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "organizationId is required to resolve traffic-flow collection scope."
    );
  }

  const { data, error } = await supabase
    .from("vehicle_locations")
    .select(
      "vehicle_id, latitude, longitude, recorded_at"
    )
    .eq("organization_id", normalizedOrganizationId)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const latestValidLocation =
    (data || []).find((location: any) => {
      const latitude =
        Number(location?.latitude);

      const longitude =
        Number(location?.longitude);

      return (
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        Boolean(location?.vehicle_id) &&
        Boolean(location?.recorded_at)
      );
    });

  if (!latestValidLocation) {
    return null;
  }

  return {
    latitude: Number(latestValidLocation.latitude),
    longitude: Number(latestValidLocation.longitude),
    radiusMeters:
      DEFAULT_TRAFFIC_FLOW_RADIUS_METERS,
    sourceVehicleId:
      String(latestValidLocation.vehicle_id),
    sourceRecordedAt:
      String(latestValidLocation.recorded_at),
  };
}
