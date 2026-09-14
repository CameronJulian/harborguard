import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/fleet/panic/route.ts",
    "utf8"
  );

test(
  "panic remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "panic requires application/json",
  () => {
    assert.match(
      route,
      /req\.headers\.get\("content-type"\) \|\| ""/
    );

    assert.match(
      route,
      /\.split\(";", 1\)\[0\]/
    );

    assert.match(
      route,
      /mediaType !== "application\/json"/
    );

    assert.match(
      route,
      /status:\s*415/
    );
  }
);

test(
  "application/json with parameters is accepted",
  () => {
    assert.match(
      route,
      /contentType[\s\S]*?\.split\(";", 1\)\[0\][\s\S]*?\.trim\(\)[\s\S]*?\.toLowerCase\(\)/
    );
  }
);

test(
  "authentication precedes media type enforcement",
  () => {
    const auth =
      route.indexOf(
        "await requireOrganization()"
      );

    const gate =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    assert.ok(auth >= 0);
    assert.ok(gate > auth);
  }
);

test(
  "media type gate precedes typed JSON parsing",
  () => {
    const gate =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const body =
      route.indexOf(
        "const body = (await req.json()) as PanicBody;"
      );

    assert.ok(gate >= 0);
    assert.ok(body > gate);
  }
);

test(
  "415 occurs before vehicle database access",
  () => {
    const unsupported =
      route.indexOf(
        "status: 415"
      );

    const vehicle =
      route.indexOf(
        '.from("vehicles")'
      );

    assert.ok(unsupported >= 0);
    assert.ok(vehicle > unsupported);
  }
);

test(
  "duplicate panic path remains before rate limiting",
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
  "requested trip direct lookup remains intact",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_trips"\)[\s\S]*?\.eq\("id", requestedTripId\)/
    );
  }
);

test(
  "requested trip remains vehicle scoped",
  () => {
    assert.match(
      route,
      /\.eq\("id", requestedTripId\)[\s\S]*?\.eq\("vehicle_id", vehicleId\)/
    );
  }
);

test(
  "requested trip remains organization scoped",
  () => {
    assert.match(
      route,
      /\.eq\("id", requestedTripId\)[\s\S]*?\.eq\("vehicle_id", vehicleId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "foreign requested trip rejection remains before final trip resolution",
  () => {
    const reject =
      route.indexOf(
        "if (!requestedTrip)"
      );

    const finalTrip =
      route.indexOf(
        "const finalTripId = requestedTripId || activeTrip?.id || null;"
      );

    assert.ok(reject >= 0);
    assert.ok(finalTrip > reject);
  }
);

test(
  "requested trip boundary remains before panic alert mutation",
  () => {
    const reject =
      route.indexOf(
        "if (!requestedTrip)"
      );

    const mutation =
      route.indexOf(
        '.from("vehicle_alerts")',
        reject
      );

    assert.ok(reject >= 0);
    assert.ok(mutation > reject);
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
