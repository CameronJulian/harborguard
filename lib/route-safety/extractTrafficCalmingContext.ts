import type {
  TrafficCalmingContext,
  TrafficCalmingFeatureType,
} from "@/lib/road-context/trafficCalmingTypes";

function isTrafficCalmingFeatureType(
  value: unknown
): value is TrafficCalmingFeatureType {
  return (
    value === "speed_bump" ||
    value === "raised_intersection"
  );
}

function isFiniteNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

export function extractTrafficCalmingContext(
  metadata: unknown
): TrafficCalmingContext | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const context =
    (metadata as Record<string, unknown>)
      .trafficCalmingContext;

  if (!context || typeof context !== "object") {
    return null;
  }

  const candidate =
    context as Record<string, unknown>;

  if (
    candidate.provider !== "city_of_cape_town" ||
    !isTrafficCalmingFeatureType(
      candidate.featureType
    ) ||
    typeof candidate.providerFeatureId !== "string" ||
    candidate.providerFeatureId.trim().length === 0 ||
    !(
      candidate.ownership === null ||
      typeof candidate.ownership === "string"
    ) ||
    !(
      candidate.statusCode === null ||
      isFiniteNumber(candidate.statusCode)
    ) ||
    !isFiniteNumber(candidate.latitude) ||
    !isFiniteNumber(candidate.longitude) ||
    !isFiniteNumber(candidate.distanceMeters) ||
    candidate.distanceMeters < 0
  ) {
    return null;
  }

  return {
    provider: "city_of_cape_town",
    featureType: candidate.featureType,
    providerFeatureId:
      candidate.providerFeatureId,
    ownership: candidate.ownership,
    statusCode: candidate.statusCode,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    distanceMeters: candidate.distanceMeters,
  };
}