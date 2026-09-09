type ActiveGeofenceCacheEntry = {
  geofences: any[];
  expiresAt: number;
};

const ACTIVE_GEOFENCE_CACHE_TTL_MS =
  5_000;

const ACTIVE_GEOFENCE_CACHE_MAX_ENTRIES =
  1_000;

const activeGeofenceCache =
  new Map<
    string,
    ActiveGeofenceCacheEntry
  >();

const activeGeofenceLoads =
  new Map<
    string,
    Promise<any[]>
  >();

function pruneActiveGeofenceCache(
  now: number
) {
  for (
    const [
      organizationId,
      entry,
    ] of activeGeofenceCache
  ) {
    if (entry.expiresAt <= now) {
      activeGeofenceCache.delete(
        organizationId
      );
    }
  }

  while (
    activeGeofenceCache.size >
    ACTIVE_GEOFENCE_CACHE_MAX_ENTRIES
  ) {
    const oldestKey =
      activeGeofenceCache
        .keys()
        .next()
        .value;

    if (!oldestKey) {
      break;
    }

    activeGeofenceCache.delete(
      oldestKey
    );
  }
}

function getCachedActiveGeofences(
  organizationId: string
) {
  const now =
    Date.now();

  const cached =
    activeGeofenceCache.get(
      organizationId
    );

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now) {
    activeGeofenceCache.delete(
      organizationId
    );

    return null;
  }

  activeGeofenceCache.delete(
    organizationId
  );

  activeGeofenceCache.set(
    organizationId,
    cached
  );

  return cached.geofences;
}

function cacheActiveGeofences(
  organizationId: string,
  geofences: any[]
) {
  const now =
    Date.now();

  pruneActiveGeofenceCache(
    now
  );

  activeGeofenceCache.delete(
    organizationId
  );

  activeGeofenceCache.set(
    organizationId,
    {
      geofences,
      expiresAt:
        now +
        ACTIVE_GEOFENCE_CACHE_TTL_MS,
    }
  );

  pruneActiveGeofenceCache(
    now
  );
}

export function invalidateActiveGeofenceCache(
  organizationId: string
) {
  activeGeofenceCache.delete(
    organizationId
  );

  activeGeofenceLoads.delete(
    organizationId
  );
}

export async function loadActiveGeofences(
  supabase: any,
  organizationId: string
) {
  const cached =
    getCachedActiveGeofences(
      organizationId
    );

  if (cached !== null) {
    return cached;
  }

  const existingLoad =
    activeGeofenceLoads.get(
      organizationId
    );

  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise =
    (async () => {
      const {
        data,
        error,
      } =
        await supabase
          .from("geofences")
          .select("*")
          .eq(
            "organization_id",
            organizationId
          )
          .eq(
            "is_active",
            true
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const geofences =
        data || [];

      cacheActiveGeofences(
        organizationId,
        geofences
      );

      return geofences;
    })();

  activeGeofenceLoads.set(
    organizationId,
    loadPromise
  );

  try {
    return await loadPromise;
  } finally {
    if (
      activeGeofenceLoads.get(
        organizationId
      ) === loadPromise
    ) {
      activeGeofenceLoads.delete(
        organizationId
      );
    }
  }
}
