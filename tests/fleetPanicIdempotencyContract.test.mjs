import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/panic/route.ts",
      import.meta.url
    ),
    "utf8"
  );

const migration =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260909124100_add_unique_open_panic_vehicle_alert.sql",
      import.meta.url
    ),
    "utf8"
  );

test(
  "database owns one-open-panic-per-vehicle concurrency invariant",
  () => {
    assert.match(
      migration,
      /create\s+unique\s+index\s+if\s+not\s+exists\s+vehicle_alerts_one_open_panic_per_vehicle_idx/i
    );

    assert.match(
      migration,
      /organization_id[\s\S]*vehicle_id/i
    );

    assert.match(
      migration,
      /where[\s\S]*alert_type\s*=\s*'panic'[\s\S]*is_resolved\s*=\s*false/i
    );
  }
);

test(
  "migration refuses pre-existing duplicate unresolved panics",
  () => {
    assert.match(
      migration,
      /group\s+by\s+organization_id,\s*vehicle_id[\s\S]*having\s+count\(\*\)\s*>\s*1/i
    );

    assert.match(
      migration,
      /raise\s+exception/i
    );
  }
);

test(
  "migration refuses incomplete unresolved panic identity",
  () => {
    assert.match(
      migration,
      /organization_id\s+is\s+null[\s\S]*vehicle_id\s+is\s+null/i
    );
  }
);

test(
  "vehicle validation happens before open-panic lookup",
  () => {
    const vehicle =
      route.indexOf(
        '.from("vehicles")'
      );

    const duplicate =
      route.indexOf(
        "existingOpenPanic"
      );

    assert.ok(vehicle >= 0);
    assert.ok(duplicate > vehicle);
  }
);

test(
  "fast path uses organization vehicle panic unresolved identity",
  () => {
    const start =
      route.indexOf(
        "existingOpenPanic"
      );

    assert.ok(start >= 0);

    const section =
      route.slice(
        start,
        start + 1800
      );

    assert.match(
      section,
      /\.from\("vehicle_alerts"\)/
    );

    assert.match(
      section,
      /\.eq\("organization_id",\s*organizationId\)/
    );

    assert.match(
      section,
      /\.eq\("vehicle_id",\s*vehicleId\)/
    );

    assert.match(
      section,
      /\.eq\("alert_type",\s*"panic"\)/
    );

    assert.match(
      section,
      /\.eq\("is_resolved",\s*false\)/
    );
  }
);

test(
  "fast duplicate returns successful canonical response",
  () => {
    assert.match(
      route,
      /if\s*\(\s*existingOpenPanic\s*\)[\s\S]*?success:\s*true[\s\S]*?skipped:\s*"duplicate_open_panic"/
    );

    assert.match(
      route,
      /alert:\s*existingOpenPanic/
    );
  }
);

test(
  "insert duplicate recovery is restricted to PostgreSQL 23505",
  () => {
    assert.match(
      route,
      /alertError\.code\s*===\s*"23505"/
    );
  }
);

test(
  "23505 recovery reads canonical unresolved panic identity",
  () => {
    const start =
      route.indexOf(
        "canonicalOpenPanic"
      );

    assert.ok(start >= 0);

    const section =
      route.slice(
        start,
        start + 2000
      );

    assert.match(
      section,
      /\.from\("vehicle_alerts"\)/
    );

    assert.match(
      section,
      /\.eq\("organization_id",\s*organizationId\)/
    );

    assert.match(
      section,
      /\.eq\("vehicle_id",\s*vehicleId\)/
    );

    assert.match(
      section,
      /\.eq\("alert_type",\s*"panic"\)/
    );

    assert.match(
      section,
      /\.eq\("is_resolved",\s*false\)/
    );
  }
);

test(
  "23505 recovery returns successful canonical alert",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!canonicalOpenPanicError\s*&&\s*canonicalOpenPanic\s*\)[\s\S]*?success:\s*true[\s\S]*?skipped:\s*"duplicate_open_panic"/
    );

    assert.match(
      route,
      /alert:\s*canonicalOpenPanic/
    );
  }
);

test(
  "nonrecoverable alert insert errors still return 500",
  () => {
    assert.match(
      route,
      /return\s+NextResponse\.json\([\s\S]*?\{\s*error:\s*alertError\.message\s*\}[\s\S]*?\{\s*status:\s*500\s*\}/
    );
  }
);

test(
  "downstream panic side effects remain after canonical alert claim",
  () => {
    const fast =
      route.indexOf(
        "existingOpenPanic"
      );

    const vehicleAlerts =
      route.indexOf(
        '.from("vehicle_alerts")',
        fast + 1
      );

    const insert =
      route.indexOf(
        ".insert({",
        vehicleAlerts
      );

    const incident =
      route.indexOf(
        '.from("incidents")'
      );

    const timeline =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    const notification =
      route.indexOf(
        "await createCommandCenterNotification"
      );

    const trip =
      route.indexOf(
        '.update({ status: "emergency" })'
      );

    assert.ok(insert >= 0);
    assert.ok(incident > insert);
    assert.ok(timeline > insert);
    assert.ok(notification > insert);
    assert.ok(trip > insert);
  }
);

test(
  "existing Panic idempotency remains ahead of rate limiting",
  () => {
    const duplicateReturn =
      route.indexOf(
        'skipped: "duplicate_open_panic"'
      );

    const limiter =
      route.indexOf(
        "panicRateLimitResult"
      );

    const canonicalRecovery =
      route.indexOf(
        'alertError.code === "23505"'
      );

    assert.ok(duplicateReturn >= 0);
    assert.ok(limiter > duplicateReturn);
    assert.ok(canonicalRecovery > limiter);
  }
);
