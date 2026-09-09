import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cache =
  fs.readFileSync(
    "lib/fleet/activeGeofenceCache.ts",
    "utf8"
  );

const risk =
  fs.readFileSync(
    "lib/fleet/risk-detection.ts",
    "utf8"
  );

const route =
  fs.readFileSync(
    "app/api/geofences/route.ts",
    "utf8"
  );

test(
  "active geofence cache is five seconds and bounded",
  () => {

    assert.match(
      cache,
      /ACTIVE_GEOFENCE_CACHE_TTL_MS\s*=\s*5_000/
    );

    assert.match(
      cache,
      /ACTIVE_GEOFENCE_CACHE_MAX_ENTRIES\s*=\s*1_000/
    );
  }
);

test(
  "active geofence cache is organization scoped and active only",
  () => {

    assert.match(
      cache,
      /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
    );

    assert.match(
      cache,
      /\.eq\(\s*"is_active",\s*true\s*\)/
    );
  }
);

test(
  "empty geofence arrays are valid cache hits",
  () => {

    assert.match(
      cache,
      /const geofences\s*=\s*data \|\| \[\]/
    );

    assert.match(
      cache,
      /if \(cached !== null\)/
    );
  }
);

test(
  "concurrent geofence misses are single flight",
  () => {

    assert.match(
      cache,
      /activeGeofenceLoads/
    );

    assert.match(
      cache,
      /const existingLoad\s*=\s*activeGeofenceLoads\.get/
    );

    assert.match(
      cache,
      /activeGeofenceLoads\.set/
    );

    assert.match(
      cache,
      /activeGeofenceLoads\.delete/
    );
  }
);

test(
  "risk detection delegates geofence loading",
  () => {

    assert.match(
      risk,
      /loadActiveGeofences/
    );

    assert.match(
      risk,
      /await loadActiveGeofences\(\s*supabase,\s*organizationId\s*\)/
    );

    assert.doesNotMatch(
      risk,
      /\.from\("geofences"\)/
    );
  }
);

test(
  "geofence breach semantics remain present",
  () => {

    assert.match(
      risk,
      /const activeGeofences = geofences \|\| \[\]/
    );

    assert.match(
      risk,
      /activeGeofences\.length > 0/
    );

    assert.match(
      risk,
      /alertType: "geofence_breach"/
    );
  }
);

test(
  "POST PATCH DELETE invalidate organization geofence cache",
  () => {

    const calls =
      (
        route.match(
          /invalidateActiveGeofenceCache\(\s*organizationId\s*\)/g
        ) ||
        []
      ).length;

    assert.equal(
      calls,
      3
    );
  }
);