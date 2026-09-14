import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/fleet/panic/route.ts",
    "utf8"
  );

test(
  "panic route remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "panic vehicle remains scoped to authenticated organization",
  () => {
    assert.match(
      route,
      /\.from\("vehicles"\)[\s\S]*?\.eq\("id", vehicleId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "caller supplied trip is directly looked up",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_trips"\)[\s\S]*?\.eq\("id", requestedTripId\)/
    );
  }
);

test(
  "caller supplied trip is scoped to the panic vehicle",
  () => {
    assert.match(
      route,
      /\.eq\("id", requestedTripId\)[\s\S]*?\.eq\("vehicle_id", vehicleId\)/
    );
  }
);

test(
  "caller supplied trip is scoped to authenticated organization",
  () => {
    assert.match(
      route,
      /\.eq\("id", requestedTripId\)[\s\S]*?\.eq\("vehicle_id", vehicleId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "foreign or mismatched requested trip is rejected",
  () => {
    assert.match(
      route,
      /if \(!requestedTrip\)[\s\S]*?Trip not found for this vehicle and organization\.[\s\S]*?status:\s*404/
    );
  }
);

test(
  "trip lookup errors fail closed before panic creation",
  () => {
    const tripError =
      route.indexOf(
        "if (requestedTripError)"
      );

    const alertInsert =
      route.indexOf(
        '.from("vehicle_alerts")',
        tripError
      );

    assert.ok(tripError >= 0);
    assert.ok(alertInsert > tripError);
  }
);

test(
  "existing duplicate panic path remains before rate limiting",
  () => {
    const duplicate =
      route.indexOf(
        'skipped: "duplicate_open_panic"'
      );

    const rateLimit =
      route.indexOf(
        "const panicRateLimitResult ="
      );

    assert.ok(duplicate >= 0);
    assert.ok(rateLimit > duplicate);
  }
);

test(
  "existing rate limit remains before active trip discovery",
  () => {
    const rateLimit =
      route.indexOf(
        "const panicRateLimitResult ="
      );

    const activeTrip =
      route.indexOf(
        "const { data: activeTrip }"
      );

    assert.ok(rateLimit >= 0);
    assert.ok(activeTrip > rateLimit);
  }
);

test(
  "requested trip validation occurs after active trip discovery",
  () => {
    const activeTrip =
      route.indexOf(
        "const { data: activeTrip }"
      );

    const requestedTrip =
      route.indexOf(
        '.eq("id", requestedTripId)'
      );

    assert.ok(activeTrip >= 0);
    assert.ok(requestedTrip > activeTrip);
  }
);

test(
  "requested trip validation precedes final trip resolution",
  () => {
    const requestedTrip =
      route.indexOf(
        '.eq("id", requestedTripId)'
      );

    const rejection =
      route.indexOf(
        "if (!requestedTrip)"
      );

    const finalTrip =
      route.indexOf(
        "const finalTripId = requestedTripId || activeTrip?.id || null;"
      );

    assert.ok(requestedTrip >= 0);
    assert.ok(rejection > requestedTrip);
    assert.ok(finalTrip > rejection);
  }
);

test(
  "requested trip validation precedes panic alert mutation",
  () => {
    const requestedTrip =
      route.indexOf(
        '.eq("id", requestedTripId)'
      );

    const rejection =
      route.indexOf(
        "if (!requestedTrip)"
      );

    const alertInsert =
      route.indexOf(
        '.from("vehicle_alerts")',
        rejection
      );

    assert.ok(requestedTrip >= 0);
    assert.ok(rejection > requestedTrip);
    assert.ok(alertInsert > rejection);
  }
);

test(
  "validated requested trip remains preferred over discovered active trip",
  () => {
    assert.match(
      route,
      /const finalTripId = requestedTripId \|\| activeTrip\?\.id \|\| null;/
    );
  }
);

test(
  "panic alert remains organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.insert\(\{[\s\S]*?organization_id:\s*organizationId/
    );
  }
);

test(
  "panic alert stores only resolved final trip identity",
  () => {
    assert.match(
      route,
      /trip_id:\s*finalTripId/
    );
  }
);
