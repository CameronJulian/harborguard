import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/vehicle-location-archive/manifests/route.ts",
      import.meta.url
    ),
    "utf8"
  );


test(
  "archive manifest list is GET-only",
  () => {
    assert.match(
      source,
      /export async function GET/
    );

    assert.doesNotMatch(
      source,
      /export async function POST/
    );

    assert.doesNotMatch(
      source,
      /export async function DELETE/
    );

    assert.doesNotMatch(
      source,
      /export async function PUT/
    );

    assert.doesNotMatch(
      source,
      /export async function PATCH/
    );
  }
);


test(
  "archive manifest list requires organization auth and owner-admin authorization before service-role access",
  () => {
    const authIndex =
      source.indexOf(
        "await requireOrganization()"
      );

    const roleIndex =
      source.indexOf(
        "requireRole("
      );

    const adminIndex =
      source.indexOf(
        "supabaseAdmin\n        .from("
      );

    assert.ok(
      authIndex >= 0
    );

    assert.ok(
      roleIndex >
        authIndex
    );

    assert.ok(
      adminIndex >
        roleIndex
    );

    assert.match(
      source,
      /"owner",\s*"admin"/
    );
  }
);


test(
  "manifest list is always scoped to the authenticated organization",
  () => {
    assert.match(
      source,
      /vehicle_location_archive_manifests/
    );

    assert.match(
      source,
      /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
    );

    assert.doesNotMatch(
      source,
      /organizationId:\s*z\./
    );
  }
);


test(
  "bulk response selects the exact operational metadata and durable prune state",
  () => {
    assert.match(
      source,
      /\.select\(\s*"id,vehicle_id,trip_id,first_recorded_at,last_recorded_at,row_count,status,verified_at,pruned_at,pruned_row_count,created_at"/
    );
  }
);


test(
  "bulk route resolves human-readable vehicle identity inside the same organization",
  () => {
    assert.match(
      source,
      /\.from\(\s*"vehicles"\s*\)/
    );

    assert.match(
      source,
      /id,registration_number,nickname/
    );

    assert.match(
      source,
      /vehicleRegistration/
    );

    assert.match(
      source,
      /vehicleNickname/
    );
  }
);


test(
  "manifest list has bounded pagination and explicit metadata filters",
  () => {
    assert.match(
      source,
      /pageSize:[\s\S]*\.max\(100\)/
    );

    assert.match(
      source,
      /\.range\(\s*from,\s*to\s*\)/
    );

    assert.match(
      source,
      /"pending",\s*"verified",\s*"failed"/
    );

    assert.match(
      source,
      /"all",\s*"unpruned",\s*"pruned"/
    );

    assert.match(
      source,
      /vehicleId:[\s\S]*\.uuid\(\)/
    );

    assert.match(
      source,
      /\.order\(\s*"created_at"[\s\S]*ascending:\s*false/
    );
  }
);


test(
  "already-pruned manifests remain visible unless operator applies a prune-state filter",
  () => {
    assert.match(
      source,
      /pruneState:[\s\S]*\.default\(\s*"all"\s*\)/
    );

    assert.match(
      source,
      /pruneState === "pruned"/
    );

    assert.match(
      source,
      /pruneState === "unpruned"/
    );
  }
);


test(
  "bulk list does not expose detail-only object identity",
  () => {
    assert.doesNotMatch(
      source,
      /object_key/
    );

    assert.doesNotMatch(
      source,
      /sha256/
    );

    assert.doesNotMatch(
      source,
      /failure_reason/
    );
  }
);


test(
  "read boundary has no eligibility reconstruction or destructive authority",
  () => {
    for (const forbidden of [
      "assessVehicleLocationArchivePruningEligibility",
      "verifyVehicleLocationArchiveObject",
      "prepareVehicleLocationArchive",
      "executeVehicleLocationArchivePrune",
      "prune_vehicle_locations_for_verified_archive",
      ".delete(",
      ".update(",
      ".insert(",
      ".upsert(",
      "PRUNE_VERIFIED_ARCHIVE",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false,
        `unexpected read-boundary authority: ${forbidden}`
      );
    }
  }
);


test(
  "unexpected service-role failures are sanitized",
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
      /Failed to list vehicle location archive manifests\./
    );
  }
);