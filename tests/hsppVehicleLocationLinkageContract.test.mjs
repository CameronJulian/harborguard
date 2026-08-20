import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260820130000_link_vehicle_locations_to_hspp_evidence.sql",
  "utf8"
);

const createLocation = fs.readFileSync(
  "lib/fleet/createVehicleLocation.ts",
  "utf8"
);

const processLocation = fs.readFileSync(
  "lib/fleet/processVehicleLocationUpdate.ts",
  "utf8"
);

const processTelematics = fs.readFileSync(
  "lib/telematics/processTelematicsPosition.ts",
  "utf8"
);

test("HSPP-007B adds optional evidence identity to vehicle_locations", () => {
  assert.match(
    migration,
    /add column hspp_evidence_id uuid/i
  );
});

test("vehicle location HSPP linkage is organization scoped", () => {
  assert.match(
    migration,
    /foreign key\s*\(\s*organization_id,\s*hspp_evidence_id\s*\)/i
  );

  assert.match(
    migration,
    /references public\.hspp_evidence\s*\(\s*organization_id,\s*id\s*\)/i
  );
});

test("one HSPP evidence item cannot authorize multiple location rows", () => {
  assert.match(
    migration,
    /unique index[\s\S]*vehicle_locations_hspp_evidence_id_unique/i
  );

  assert.match(
    migration,
    /where hspp_evidence_id is not null/i
  );
});

test("createVehicleLocation persists the HSPP evidence identity", () => {
  assert.match(
    createLocation,
    /hsppEvidenceId\?: string \| null/
  );

  assert.match(
    createLocation,
    /hspp_evidence_id:\s*hsppEvidenceId/
  );
});

test("generic location processing keeps HSPP linkage optional", () => {
  assert.match(
    processLocation,
    /hsppEvidenceId\?: string \| null/
  );

  assert.match(
    processLocation,
    /hsppEvidenceId = null/
  );

  assert.match(
    processLocation,
    /hsppEvidenceId,\s*\}\);/
  );
});

test("telematics processing passes the exact persisted HSPP id", () => {
  assert.match(
    processTelematics,
    /hsppEvidenceId:\s*persistedHsppEvidence\.id/
  );
});

test("HSPP linkage does not add operational-use enforcement yet", () => {
  assert.doesNotMatch(
    createLocation,
    /decideHsppOperationalUse/
  );

  assert.doesNotMatch(
    processLocation,
    /decideHsppOperationalUse/
  );

  assert.doesNotMatch(
    processTelematics,
    /decideHsppOperationalUse/
  );
});

test("HSPP linkage does not modify existing location source semantics", () => {
  assert.match(
    createLocation,
    /source:\s*"mobile" \| "hardware" \| "manual"/
  );
});
