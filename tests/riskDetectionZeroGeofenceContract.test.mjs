import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "lib/fleet/risk-detection.ts",
  "utf8",
);

test(
  "zero active geofences skip geofence enforcement",
  () => {
    assert.match(
      source,
      /const\s+activeGeofences\s*=\s*geofences\s*\|\|\s*\[\]/,
    );

    assert.match(
      source,
      /if\s*\(\s*activeGeofences\.length\s*>\s*0\s*\)/,
    );
  },
);

test(
  "configured geofences are still evaluated",
  () => {
    assert.match(
      source,
      /for\s*\(\s*const\s+zone\s+of\s+activeGeofences\s*\)/,
    );

    assert.match(
      source,
      /distance\s*<=\s*zone\.radius_meters/,
    );

    assert.match(
      source,
      /alertType:\s*"geofence_breach"/,
    );
  },
);

test(
  "geofence breach path is nested under configured-geofence guard",
  () => {
    const guardIndex =
      source.indexOf(
        "if (activeGeofences.length > 0)",
      );

    const breachIndex =
      source.indexOf(
        'alertType: "geofence_breach"',
      );

    assert.ok(guardIndex >= 0);
    assert.ok(breachIndex > guardIndex);
  },
);