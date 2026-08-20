import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "app/api/fleet/live/route.ts",
  "utf8"
);

const fleetPage = fs.readFileSync(
  "app/fleet/page.tsx",
  "utf8"
);

test("Fleet Live uses the centralized HSPP operational-read boundary", () => {
  assert.match(
    route,
    /readHsppEvidenceForOperationalUse/
  );
});

test("Fleet Live selects HSPP identity with recent locations", () => {
  assert.match(
    route,
    /recorded_at,\s*hspp_evidence_id/
  );
});

test("Fleet Live preserves unlinked latest-location behavior", () => {
  assert.match(
    route,
    /if\s*\(\s*!evidenceId\s*\)\s*\{\s*continue;/
  );
});

test("Fleet Live evaluates linked latest evidence", () => {
  assert.match(
    route,
    /await\s+readHsppEvidenceForOperationalUse\s*\(\s*\{/
  );

  assert.match(
    route,
    /evidenceId,/
  );

  assert.match(
    route,
    /operationalRead\.decision\.allowed/
  );
});

test("Fleet Live preserves vehicle identity after HSPP denial", () => {
  assert.match(route, /id:\s*vehicle\.id/);
  assert.match(route, /nickname:\s*vehicle\.nickname/);
  assert.match(
    route,
    /registrationNumber:\s*vehicle\.registration_number/
  );
});

test("Fleet Live suppresses denied current position", () => {
  assert.match(
    route,
    /latitude:\s*latestOperationallyAllowed[\s\S]*?\?\s*latest\?\.latitude[\s\S]*?:\s*null/
  );

  assert.match(
    route,
    /longitude:\s*latestOperationallyAllowed[\s\S]*?\?\s*latest\?\.longitude[\s\S]*?:\s*null/
  );
});

test("Fleet Live suppresses denied current speed heading and lastSeen", () => {
  assert.match(
    route,
    /speedKmh:\s*latestOperationallyAllowed/
  );

  assert.match(
    route,
    /heading:\s*latestOperationallyAllowed/
  );

  assert.match(
    route,
    /lastSeen:\s*latestOperationallyAllowed/
  );
});

test("Fleet Live removes denied current speed from driver-profile scoring", () => {
  assert.match(
    route,
    /const\s+speedKmh\s*=\s*latestOperationallyAllowed[\s\S]*?:\s*0/
  );

  assert.match(
    route,
    /buildDriverProfile\(\{[\s\S]*?speedKmh/
  );
});

test("Fleet Live preserves active trip stops and existing alerts", () => {
  assert.match(route, /activeTrip:/);
  assert.match(route, /\bstops,\s*[\r\n]+\s*openAlerts:\s*alerts/);
});
test("HSPP-007G keeps one latest-location operational read", () => {
  const calls =
    route.match(
      /readHsppEvidenceForOperationalUse\s*\(/g
    ) || [];

  assert.equal(calls.length, 1);
});

test("HSPP-007H batch-verifies historical linked telemetry", () => {
  assert.match(
    route,
    /readHsppEvidenceBatchForOperationalUse/
  );

  assert.match(
    route,
    /historicalHsppEvidenceIds/
  );

  assert.match(
    route,
    /deniedHistoricalHsppEvidenceIds/
  );
});

test("HSPP-007H filters denied history before route construction", () => {
  const denyIndex =
    route.indexOf(
      "deniedHistoricalHsppEvidenceIds.has"
    );

  const reverseIndex =
    route.indexOf(
      ".reverse()"
    );

  assert.notEqual(denyIndex, -1);
  assert.notEqual(reverseIndex, -1);

  assert.ok(
    denyIndex < reverseIndex
  );
});

test("HSPP-007H preserves unlinked historical telemetry", () => {
  assert.match(
    route,
    /if\s*\(\s*!evidenceId\s*\)\s*\{\s*return true;/
  );
});

test("Fleet UI no longer trusts raw realtime location inserts directly", () => {
  assert.doesNotMatch(
    fleetPage,
    /latitude:\s*row\.latitude/
  );

  assert.doesNotMatch(
    fleetPage,
    /longitude:\s*row\.longitude/
  );

  assert.doesNotMatch(
    fleetPage,
    /speedKmh:\s*row\.speed_kmh/
  );
});

test("Fleet realtime location events refresh through the trusted Fleet Live API", () => {
  assert.match(
    fleetPage,
    /table:\s*"vehicle_locations"[\s\S]*?void\s+loadFleet\(\)/
  );

  assert.match(
    fleetPage,
    /fetch\("\/api\/fleet\/live"/
  );
});

test("Fleet map already excludes vehicles without valid coordinates", () => {
  assert.match(
    fleetPage,
    /fleet\.filter\(\(vehicle\)\s*=>[\s\S]*?isValidLatLng\(vehicle\.latitude,\s*vehicle\.longitude\)/
  );
});

test("HSPP-007G preserves Fleet Live response shape", () => {
  assert.match(
    route,
    /return\s+NextResponse\.json\(\{\s*fleet\s*\}\)/
  );
});
