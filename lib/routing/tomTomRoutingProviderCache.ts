import {
  getRedis,
} from "@/lib/redis";

const TOMTOM_ROUTING_CACHE_TTL_SECONDS =
  90;

type TomTomRoutingCachePoint = {
  latitude: number;
  longitude: number;
};

type TomTomRoutingProviderCacheKeyInput = {
  origin: TomTomRoutingCachePoint;
  destination: TomTomRoutingCachePoint;
  routingProfile?: string | null;
};

function normalizeCoordinate(
  value: number,
): string {
  return Number(value)
    .toFixed(5);
}

function normalizeProfile(
  value: string | null | undefined,
): string {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  return normalized || "default";
}

export function buildTomTomRoutingProviderCacheKey(
  input: TomTomRoutingProviderCacheKeyInput,
): string {
  return [
    "harborguard",
    "tomtom-routing",
    "v1",
    normalizeCoordinate(
      input.origin.latitude,
    ),
    normalizeCoordinate(
      input.origin.longitude,
    ),
    normalizeCoordinate(
      input.destination.latitude,
    ),
    normalizeCoordinate(
      input.destination.longitude,
    ),
    normalizeProfile(
      input.routingProfile,
    ),
  ].join(":");
}

export async function getCachedTomTomRoutingProviderResponse(
  key: string,
): Promise<unknown | null> {
  const redis =
    getRedis();

  if (!redis) {
    return null;
  }

  try {
    return await redis.get(key);
  }
  catch (error) {
    console.warn(
      "TomTom routing cache read failed:",
      error,
    );

    return null;
  }
}

export async function cacheTomTomRoutingProviderResponse(
  key: string,
  value: unknown,
): Promise<void> {
  const redis =
    getRedis();

  if (!redis) {
    return;
  }

  try {
    await redis.set(
      key,
      value,
      {
        ex:
          TOMTOM_ROUTING_CACHE_TTL_SECONDS,
      },
    );
  }
  catch (error) {
    console.warn(
      "TomTom routing cache write failed:",
      error,
    );
  }
}
