import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const reader = fs.readFileSync(
  "lib/fleet/getLatestVehicleLocation.ts",
  "utf8"
);

const analyzer = fs.readFileSync(
  "lib/fleet/analyzeVehicleLocationTelemetry.ts",
  "utf8"
);

const processor = fs.readFileSync(
  "lib/fleet/processVehicleLocationUpdate.ts",
  "utf8"
);

const writer = fs.readFileSync(
  "lib/fleet/createVehicleLocation.ts",
  "utf8"
);

const migration = fs.readFileSync(
  "supabase/migrations/20260825060000_add_vehicle_location_road_speed_limit_provenance.sql",
  "utf8"
);

test(
  "latest vehicle location loads persisted speed-limit provenance",
  () => {
    assert.match(
      reader,
      /road_speed_limit_kmh/
    );

    assert.match(
      reader,
      /road_speed_limit_resolved_at/
    );

    assert.match(
      reader,
      /road_speed_limit_resolved_latitude/
    );

    assert.match(
      reader,
      /road_speed_limit_resolved_longitude/
    );
  }
);

test(
  "telemetry cache is bounded by original resolution provenance",
  () => {
    assert.match(
      analyzer,
      /ROAD_SPEED_LIMIT_CACHE_MAX_AGE_SECONDS\s*=\s*[\r\n]+\s*15 \* 60/
    );

    assert.match(
      analyzer,
      /ROAD_SPEED_LIMIT_CACHE_MAX_DISTANCE_METERS\s*=\s*[\r\n]+\s*500/
    );

    assert.match(
      analyzer,
      /lastPoint\.road_speed_limit_resolved_at/
    );

    assert.match(
      analyzer,
      /lastPoint\.road_speed_limit_resolved_latitude/
    );

    assert.match(
      analyzer,
      /lastPoint\.road_speed_limit_resolved_longitude/
    );

    assert.match(
      analyzer,
      /roadSpeedLimitResolutionAgeSeconds/
    );

    assert.match(
      analyzer,
      /roadSpeedLimitResolutionDistanceMeters/
    );
  }
);

test(
  "cache reuse preserves original resolution provenance",
  () => {
    const reuseIndex =
      analyzer.indexOf(
        "if (reusableRoadSpeedLimit)"
      );

    const freshHereIndex =
      analyzer.indexOf(
        "await resolveHereRoadSpeedLimit({"
      );

    assert.ok(reuseIndex >= 0);
    assert.ok(freshHereIndex > reuseIndex);

    const reuseSection =
      analyzer.slice(
        reuseIndex,
        freshHereIndex
      );

    assert.match(
      reuseSection,
      /roadSpeedLimitResolvedAt\s*=\s*[\r\n\s]*previousRoadSpeedLimitResolvedAt/
    );

    assert.match(
      reuseSection,
      /roadSpeedLimitResolvedLatitude\s*=\s*[\r\n\s]*previousRoadSpeedLimitResolvedLatitude/
    );

    assert.match(
      reuseSection,
      /roadSpeedLimitResolvedLongitude\s*=\s*[\r\n\s]*previousRoadSpeedLimitResolvedLongitude/
    );
  }
);

test(
  "fresh HERE resolution establishes a new provenance origin",
  () => {
    assert.match(
      analyzer,
      /roadSpeedLimitResolvedAt\s*=\s*[\r\n\s]*occurredAt/
    );

    assert.match(
      analyzer,
      /roadSpeedLimitResolvedLatitude\s*=\s*[\r\n\s]*latitude/
    );

    assert.match(
      analyzer,
      /roadSpeedLimitResolvedLongitude\s*=\s*[\r\n\s]*longitude/
    );
  }
);

test(
  "processor carries provenance into vehicle-location persistence",
  () => {
    for (const field of [
      "roadSpeedLimitResolvedAt",
      "roadSpeedLimitResolvedLatitude",
      "roadSpeedLimitResolvedLongitude",
    ]) {
      assert.match(
        processor,
        new RegExp(field)
      );
    }
  }
);

test(
  "vehicle-location writer persists provenance columns",
  () => {
    assert.match(
      writer,
      /road_speed_limit_resolved_at/
    );

    assert.match(
      writer,
      /road_speed_limit_resolved_latitude/
    );

    assert.match(
      writer,
      /road_speed_limit_resolved_longitude/
    );
  }
);

test(
  "migration adds road-speed-limit provenance columns",
  () => {
    assert.match(
      migration,
      /road_speed_limit_resolved_at timestamptz/
    );

    assert.match(
      migration,
      /road_speed_limit_resolved_latitude double precision/
    );

    assert.match(
      migration,
      /road_speed_limit_resolved_longitude double precision/
    );
  }
);
