import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/vehicle-location-archive/prune/route.ts",
      import.meta.url
    ),
    "utf8"
  );


test(
  "manual archive prune boundary is POST-only",
  () => {
    assert.match(
      source,
      /export async function POST/
    );

    assert.doesNotMatch(
      source,
      /export async function GET/
    );

    assert.doesNotMatch(
      source,
      /export async function DELETE/
    );
  }
);


test(
  "authentication and owner-admin authorization occur before service-role manifest access",
  () => {
    assert.match(
      source,
      /await requireOrganization\(\)/
    );

    assert.match(
      source,
      /requireRole\(\s*role,\s*\[\s*"owner",\s*"admin",?\s*\]\s*\)/
    );

    const authIndex =
      source.indexOf(
        "await requireOrganization()"
      );

    const roleIndex =
      source.indexOf(
        "requireRole("
      );

    const adminManifestReadIndex =
      source.indexOf(
        "await supabaseAdmin"
      );

    assert.ok(
      authIndex >= 0
    );

    assert.ok(
      roleIndex >
        authIndex
    );

    assert.ok(
      adminManifestReadIndex >
        roleIndex
    );
  }
);


test(
  "request accepts only exact manifest UUID and confirmation phrase",
  () => {
    assert.match(
      source,
      /z\.string\(\)\.uuid\(\)/
    );

    assert.match(
      source,
      /PRUNE_VERIFIED_ARCHIVE/
    );

    assert.match(
      source,
      /\.strict\(\)/
    );

    assert.doesNotMatch(
      source,
      /organizationId:\s*z\./
    );

    assert.doesNotMatch(
      source,
      /vehicleId:\s*z\./
    );

    assert.doesNotMatch(
      source,
      /tripId:\s*z\./
    );
  }
);


test(
  "service-role manifest read is scoped to authenticated organization",
  () => {
    assert.match(
      source,
      /vehicle_location_archive_manifests/
    );

    assert.match(
      source,
      /\.select\(\s*"id,organization_id"\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"id",\s*manifestId\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
    );
  }
);


test(
  "manual route delegates destructive authority to guarded executor with admin client",
  () => {
    assert.match(
      source,
      /executeVehicleLocationArchivePrune\(\{/
    );

    assert.match(
      source,
      /supabase:\s*supabaseAdmin/
    );

    assert.match(
      source,
      /manifestId/
    );

    assert.doesNotMatch(
      source,
      /\.delete\(/
    );

    assert.doesNotMatch(
      source,
      /delete from vehicle_locations/i
    );

    assert.doesNotMatch(
      source,
      /prune_vehicle_locations_for_verified_archive/
    );
  }
);


test(
  "ineligible prune returns non-success without bypassing executor",
  () => {
    assert.match(
      source,
      /if \(!result\.executed\)/
    );

    assert.match(
      source,
      /status:\s*409/
    );

    assert.match(
      source,
      /reason:\s*result\.reason/
    );
  }
);


test(
  "successful prune is audit logged",
  () => {
    assert.match(
      source,
      /createAuditLog\(\{/
    );

    assert.match(
      source,
      /vehicle_location_archive\.pruned/
    );

    assert.match(
      source,
      /deletedRowCount:\s*result\.deletedRowCount/
    );

    assert.match(
      source,
      /durableRetry:\s*result\.durableRetry/
    );

    assert.match(
      source,
      /executionMode:\s*"explicit_manual"/
    );
  }
);


test(
  "manual prune route contains no batch cron or retention automation",
  () => {
    for (const forbidden of [
      "cron.schedule",
      "scheduleJob",
      "setInterval",
      "retentionDays",
      "retentionHours",
      "retention_days",
      "retention_hours",
      "manifestIds",
      "batchSize",
      "Promise.all(",
      "Promise.allSettled(",
    ]) {
      assert.equal(
        source.toLowerCase().includes(
          forbidden.toLowerCase()
        ),
        false,
        `unexpected automatic or batch behavior: ${forbidden}`
      );
    }
  }
);

test(
  "unexpected service-role or database failures are not disclosed to the client",
  () => {
    assert.match(
      source,
      /if \(status === 500\)/
    );

    assert.match(
      source,
      /console\.error\(/
    );

    assert.match(
      source,
      /status === 500[\s\S]*\? "Failed to prune vehicle location archive\."[\s\S]*: message/
    );
  }
);
