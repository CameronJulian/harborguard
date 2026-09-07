import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/vehicle-location-archive/manifests/[id]/route.ts",
      import.meta.url
    ),
    "utf8"
  );


test(
  "single archive manifest detail boundary is GET-only",
  () => {
    assert.match(
      source,
      /export async function GET/
    );

    for (const method of [
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]) {
      assert.doesNotMatch(
        source,
        new RegExp(
          `export async function ${method}`
        )
      );
    }
  }
);


test(
  "detail route uses async dynamic params and validates UUID",
  () => {
    assert.match(
      source,
      /params:\s*Promise<\{[\s\S]*id:[\s\S]*string;[\s\S]*\}>/
    );

    assert.match(
      source,
      /await params/
    );

    assert.match(
      source,
      /z\.string\(\)[\s\S]*\.uuid\(\)/
    );
  }
);


test(
  "owner-admin authorization occurs before service-role manifest access",
  () => {
    const authIndex =
      source.indexOf(
        "await requireOrganization()"
      );

    const roleIndex =
      source.indexOf(
        "requireRole("
      );

    const manifestReadIndex =
      source.indexOf(
        'await supabaseAdmin\n        .from(\n          "vehicle_location_archive_manifests"'
      );

    assert.ok(
      authIndex >= 0
    );

    assert.ok(
      roleIndex >
        authIndex
    );

    assert.ok(
      manifestReadIndex >
        roleIndex
    );

    assert.match(
      source,
      /"owner",\s*"admin"/
    );
  }
);


test(
  "manifest lookup is scoped by id and authenticated organization",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"id",\s*manifestId\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
    );

    assert.match(
      source,
      /status:\s*404/
    );
  }
);


test(
  "detail selects full operational archive evidence",
  () => {
    assert.match(
      source,
      /\.select\(\s*"id,vehicle_id,trip_id,archive_format,object_key,first_recorded_at,last_recorded_at,row_count,sha256,status,verified_at,failure_reason,pruned_at,pruned_row_count,created_at,updated_at"\s*\)/
    );

    assert.match(
      source,
      /objectKey:\s*manifest\.object_key/
    );

    assert.match(
      source,
      /sha256:\s*manifest\.sha256/
    );

    assert.match(
      source,
      /failureReason:\s*manifest\.failure_reason/
    );
  }
);


test(
  "vehicle identity remains organization-scoped",
  () => {
    assert.match(
      source,
      /\.from\(\s*"vehicles"\s*\)/
    );

    assert.match(
      source,
      /\.select\(\s*"id,registration_number,nickname"\s*\)/
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
  "pending and failed manifests are not applicable for pruning eligibility",
  () => {
    assert.match(
      source,
      /state:\s*"not_applicable"/
    );

    assert.match(
      source,
      /"status_pending"/
    );

    assert.match(
      source,
      /"status_failed"/
    );
  }
);


test(
  "verified unpruned manifests run full eligibility assessment",
  () => {
    const prunedIndex =
      source.indexOf(
        'if (manifest.pruned_at !== null)'
      );

    const verifiedIndex =
      source.indexOf(
        'manifest.status === "verified"'
      );

    const assessmentIndex =
      source.indexOf(
        "await assessVehicleLocationArchivePruningEligibility({"
      );

    assert.ok(
      prunedIndex >= 0
    );

    assert.ok(
      verifiedIndex >
        prunedIndex
    );

    assert.ok(
      assessmentIndex >
        verifiedIndex
    );

    assert.match(
      source,
      /state:\s*"assessed"/
    );
  }
);


test(
  "already-pruned manifests use durable evidence and validate the durable count",
  () => {
    assert.match(
      source,
      /manifest\.pruned_at !== null/
    );

    assert.match(
      source,
      /state:\s*"already_pruned"/
    );

    assert.match(
      source,
      /manifest\.pruned_row_count === null/
    );

    assert.match(
      source,
      /String\(manifest\.pruned_row_count\) !==[\s\S]*String\(manifest\.row_count\)/
    );

    assert.match(
      source,
      /prunedAt:\s*manifest\.pruned_at/
    );

    assert.match(
      source,
      /prunedRowCount:\s*manifest\.pruned_row_count/
    );
  }
);


test(
  "detail route has no destructive, storage-download or scheduling authority",
  () => {
    for (const forbidden of [
      "executeVehicleLocationArchivePrune",
      "prune_vehicle_locations_for_verified_archive",
      "PRUNE_VERIFIED_ARCHIVE",
      ".delete(",
      ".update(",
      ".insert(",
      ".upsert(",
      "createSignedUrl",
      "createSignedUrls",
      "storage.from(",
      "cron.schedule",
      "scheduleJob",
      "setInterval",
      "retentionDays",
      "retentionHours",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false,
        `unexpected detail-route authority: ${forbidden}`
      );
    }
  }
);


test(
  "normal detail read does not write an audit log",
  () => {
    assert.doesNotMatch(
      source,
      /createAuditLog/
    );

    assert.doesNotMatch(
      source,
      /audit_logs/
    );
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
      /Failed to read vehicle location archive manifest detail\./
    );
  }
);