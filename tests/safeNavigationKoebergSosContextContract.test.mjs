import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

test(
  "Koeberg SOS context reuses the existing Route Safety prediction response",
  () => {
    assert.match(
      page,
      /koebergProtectiveActionZoneContext\?: RouteEmergencySupportContext\["koebergProtectiveActionZoneContext"\]/
    );

    assert.match(
      page,
      /koebergRadiiPlanningContext\?: RouteEmergencySupportContext\["koebergRadiiPlanningContext"\]/
    );

    assert.match(
      page,
      /koebergEvacuationDirectionContext\?: RouteEmergencySupportContext\["koebergEvacuationDirectionContext"\]/
    );

    assert.match(
      page,
      /result\?\.koebergProtectiveActionZoneContext/
    );

    assert.match(
      page,
      /result\?\.koebergRadiiPlanningContext/
    );

    assert.match(
      page,
      /result\?\.koebergEvacuationDirectionContext/
    );
  }
);

test(
  "Koeberg SOS context introduces no additional client API request",
  () => {
    const predictionCalls =
      page.match(
        /"\/api\/route-safety\/predict"/g
      ) || [];

    assert.equal(
      predictionCalls.length,
      1
    );

    assert.doesNotMatch(
      page,
      /\/api\/koeberg/
    );

    assert.doesNotMatch(
      page,
      /\/api\/nuclear/
    );

    assert.doesNotMatch(
      page,
      /\/api\/evacuation/
    );
  }
);

test(
  "Koeberg planning context remains behind the existing SOS visibility gate",
  () => {
    const visibility =
      page.indexOf(
        "sosEmergencySupportVisible &&"
      );

    const koeberg =
      page.indexOf(
        'aria-label="Koeberg emergency planning context"'
      );

    const confirmation =
      page.indexOf(
        'aria-label="Confirm Emergency SOS"'
      );

    assert.ok(visibility >= 0);
    assert.ok(koeberg > visibility);
    assert.ok(confirmation > koeberg);
  }
);

test(
  "Koeberg context explicitly avoids false active-emergency claims",
  () => {
    assert.match(
      page,
      /Published planning information only\./
    );

    assert.match(
      page,
      /does\s+not indicate an active nuclear emergency/
    );

    assert.match(
      page,
      /current radiological conditions/
    );

    assert.match(
      page,
      /active\s+evacuation order/
    );

    assert.match(
      page,
      /Follow\s+official\s+emergency\s+instructions\s+if\s+authorities\s+issue\s+them\./
    );
  }
);

test(
  "Koeberg PAZ uses only the audited zoneNumber shape",
  () => {
    assert.match(
      page,
      /koebergProtectiveActionZoneContext:[\s\S]*?zoneNumber\?: string \| null/
    );

    assert.match(
      page,
      /Protective Action Zone:/
    );

    assert.match(
      page,
      /\.koebergProtectiveActionZoneContext[\s\S]*?\.zoneNumber/
    );
  }
);

test(
  "Koeberg radii planning uses planningDistanceKm",
  () => {
    assert.match(
      page,
      /planningDistanceKm\?: number \| null/
    );

    assert.match(
      page,
      /Planning-distance band:/
    );

    assert.match(
      page,
      /\.koebergRadiiPlanningContext[\s\S]*?\.planningDistanceKm/
    );
  }
);

test(
  "Koeberg evacuation context uses the audited direction route and distance fields",
  () => {
    assert.match(
      page,
      /direction\?: "north" \| "south" \| "east" \| null/
    );

    assert.match(
      page,
      /routeName\?: string \| null/
    );

    assert.match(
      page,
      /routeType\?: string \| null/
    );

    assert.match(
      page,
      /distanceMeters\?: number \| null/
    );

    assert.match(
      page,
      /Published evacuation-direction geometry:/
    );
  }
);

test(
  "Koeberg context does not gate the SOS send lifecycle",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    const end =
      page.indexOf(
        "async function searchDestination()",
        start
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const block =
      page.slice(
        start,
        end
      );

    assert.doesNotMatch(
      block,
      /if \(!.*koeberg/
    );

    assert.doesNotMatch(
      block,
      /koebergProtectiveActionZoneContext/
    );

    assert.doesNotMatch(
      block,
      /koebergRadiiPlanningContext/
    );

    assert.doesNotMatch(
      block,
      /koebergEvacuationDirectionContext/
    );
  }
);
test(
  "Increment 37 driver gate requires evacuation-direction context",
  () => {
    const source =
      readFileSync(
        new URL(
          "../app/safe-navigation/page.tsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /routeEmergencySupportContext\s*\?\.\s*koebergEvacuationDirectionContext\s*&&\s*\(/
    );

    assert.doesNotMatch(
      source,
      /koebergProtectiveActionZoneContext\s*\|\|\s*routeEmergencySupportContext\s*\?\.\s*koebergRadiiPlanningContext\s*\|\|\s*routeEmergencySupportContext\s*\?\.\s*koebergEvacuationDirectionContext\)\s*&&/
    );
  }
);

test(
  "Increment 37 keeps PAZ and radii as detail behind the evacuation-direction gate",
  () => {
    const source =
      readFileSync(
        new URL(
          "../app/safe-navigation/page.tsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /Protective Action Zone:/
    );

    assert.match(
      source,
      /Planning-distance band:/
    );

    assert.match(
      source,
      /Published evacuation-direction geometry:/
    );
  }
);