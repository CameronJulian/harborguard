import { getRedis } from "@/lib/redis";

const HERE_ROUTING_CACHE_TTL_SECONDS = 90;

function normalizeCoordinate(
  value: unknown
): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      "HERE routing cache received an invalid coordinate."
    );
  }

  return number.toFixed(5);
}

export function buildHereRoutingProviderCacheKey(
  origin: {
    lat: unknown;
    lng: unknown;
  },
  destination: {
    lat: unknown;
    lng: unknown;
  }
): string {
  const originLatitude =
    normalizeCoordinate(origin.lat);

  const originLongitude =
    normalizeCoordinate(origin.lng);

  const destinationLatitude =
    normalizeCoordinate(destination.lat);

  const destinationLongitude =
    normalizeCoordinate(destination.lng);

  return [
    "harborguard",
    "here-routing-v8",
    "provider-response",
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude,
  ].join(":");
}

export async function getCachedHereRoutingProviderResponse(
  key: string
): Promise<any | null> {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    console.warn(
      "HERE routing Redis cache read failed:",
      error
    );

    return null;
  }
}

export async function cacheHereRoutingProviderResponse(
  key: string,
  value: unknown
): Promise<void> {
  const redis = getRedis();

  if (!redis) {
    return;
  }

  try {
    await redis.set(
      key,
      value,
      {
        ex: HERE_ROUTING_CACHE_TTL_SECONDS,
      }
    );
  } catch (error) {
    console.warn(
      "HERE routing Redis cache write failed:",
      error
    );
  }
}
