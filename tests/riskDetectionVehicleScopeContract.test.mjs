import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const risk =
  fs.readFileSync(
    "lib/fleet/risk-detection.ts",
    "utf8"
  );

const lifecycle =
  fs.readFileSync(
    "lib/fleet/runPostLocationUpdateLifecycle.ts",
    "utf8"
  );

const route =
  fs.readFileSync(
    "app/api/fleet/detect-risks/route.ts",
    "utf8"
  );

test(
  "detectFleetRisks accepts optional vehicle scope",
  () => {
    assert.match(
      risk,
      /vehicleId\?: string;/
    );

    assert.match(
      risk,
      /if \(vehicleId\)[\s\S]*vehiclesQuery\.eq\("id", vehicleId\)/
    );
  }
);

test(
  "automatic post-location risk detection passes vehicleId",
  () => {
    assert.match(
      lifecycle,
      /detectFleetRisks\(\{[\s\S]*supabase,[\s\S]*organizationId,[\s\S]*vehicleId,[\s\S]*\}\);/
    );
  }
);

test(
  "standalone risk route remains full-fleet",
  () => {
    const match =
      route.match(
        /detectFleetRisks\(\{([\s\S]*?)\}\);/
      );

    assert.ok(
      match,
      "standalone detectFleetRisks invocation missing"
    );

    assert.match(
      match[1],
      /organizationId/
    );

    assert.doesNotMatch(
      match[1],
      /vehicleId/
    );
  }
);