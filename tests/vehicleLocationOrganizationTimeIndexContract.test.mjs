import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260819110000_add_vehicle_locations_org_recorded_index.sql";

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "vehicle location scale migration adds organization plus recorded_at index",
  () => {
    assert.match(
      migration,
      /create\s+index\s+if\s+not\s+exists\s+vehicle_locations_organization_id_recorded_at_idx\s+on\s+public\.vehicle_locations\s*\(\s*organization_id\s*,\s*recorded_at\s+desc\s*\)/i
    );
  }
);

test(
  "vehicle location scale migration remains index-only",
  () => {
    assert.doesNotMatch(
      migration,
      /\balter\s+table\s+public\.vehicle_locations\b/i
    );

    assert.doesNotMatch(
      migration,
      /\bcreate\s+table\b/i
    );

    assert.doesNotMatch(
      migration,
      /\bpartition\s+by\b/i
    );

    assert.doesNotMatch(
      migration,
      /\bdelete\s+from\s+public\.vehicle_locations\b/i
    );

    assert.doesNotMatch(
      migration,
      /\bupdate\s+public\.vehicle_locations\b/i
    );

    assert.doesNotMatch(
      migration,
      /\binsert\s+into\s+public\.vehicle_locations\b/i
    );
  }
);

test(
  "vehicle location scale migration introduces no ML authority",
  () => {
    assert.doesNotMatch(
      migration,
      /activateRouteRiskModel/i
    );

    assert.doesNotMatch(
      migration,
      /registerRouteRiskModelCandidate/i
    );

    assert.doesNotMatch(
      migration,
      /lifecycle_status\s*=\s*['"]active['"]/i
    );
  }
);
