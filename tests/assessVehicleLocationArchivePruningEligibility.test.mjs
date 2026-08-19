import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/assessVehicleLocationArchivePruningEligibility.ts",
    "utf8"
  );

test(
  "pruning eligibility reads one exact archive manifest",
  () => {
    assert.match(
      source,
      /\.from\(\s*ARCHIVE_MANIFEST_TABLE\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"id",\s*manifestId\s*\)[\s\S]*\.maybeSingle\(\)/
    );
  }
);

test(
  "only verified manifests may reach eligibility evaluation",
  () => {
    assert.match(
      source,
      /manifest\.status !==\s*"verified"/
    );

    assert.match(
      source,
      /"manifest_not_verified"/
    );

    assert.match(
      source,
      /manifest\.verified_at/
    );

    assert.match(
      source,
      /manifest\.failure_reason !==\s*null/
    );
  }
);

test(
  "eligibility independently re-verifies the archived storage object",
  () => {
    assert.match(
      source,
      /await verifyVehicleLocationArchiveObject/
    );

    assert.match(
      source,
      /objectKey:\s*manifest\.object_key/
    );

    assert.match(
      source,
      /expectedSha256:\s*manifest\.sha256/
    );

    assert.match(
      source,
      /"archive_object_verification_failed"/
    );
  }
);

test(
  "live evidence is reconstructed only from exact verified manifest scope",
  () => {
    assert.match(
      source,
      /organizationId:\s*manifest\.organization_id/
    );

    assert.match(
      source,
      /vehicleId:\s*manifest\.vehicle_id/
    );

    assert.match(
      source,
      /tripId:\s*manifest\.trip_id/
    );

    assert.match(
      source,
      /firstRecordedAt:\s*manifest\.first_recorded_at/
    );

    assert.match(
      source,
      /lastRecordedAt:\s*manifest\.last_recorded_at/
    );
  }
);

test(
  "eligibility requires deterministic live evidence to reproduce the verified manifest",
  () => {
    for (const expression of [
      /prepared\.archive\.organizationId !==\s*manifest\.organization_id/,
      /prepared\.archive\.vehicleId !==\s*manifest\.vehicle_id/,
      /prepared\.archive\.tripId !==\s*manifest\.trip_id/,
      /prepared\.archive\.firstRecordedAt !==\s*manifest\.first_recorded_at/,
      /prepared\.archive\.lastRecordedAt !==\s*manifest\.last_recorded_at/,
      /prepared\.archive\.rowCount !==\s*expectedRowCount/,
      /prepared\.archive\.sha256 !==\s*manifest\.sha256/,
      /reconstructedObjectKey !==\s*manifest\.object_key/,
    ]) {
      assert.match(
        source,
        expression
      );
    }
  }
);

test(
  "eligibility uses deterministic content-addressed object identity",
  () => {
    assert.match(
      source,
      /buildVehicleLocationArchiveObjectKey/
    );

    assert.match(
      source,
      /buildVehicleLocationArchiveObjectKey\(\s*prepared\.archive\s*\)/
    );
  }
);

test(
  "eligibility fails closed when live evidence is unavailable or mismatched",
  () => {
    assert.match(
      source,
      /"live_evidence_unavailable"/
    );

    assert.match(
      source,
      /"live_evidence_mismatch"/
    );

    assert.match(
      source,
      /eligible:\s*false/
    );
  }
);

test(
  "eligibility has no telemetry deletion authority",
  () => {
    for (const forbidden of [
      ".delete(",
      "delete from",
      "truncate ",
      "drop table",
      "pruneVehicleLocation",
    ]) {
      assert.equal(
        source.toLowerCase().includes(
          forbidden.toLowerCase()
        ),
        false
      );
    }
  }
);

test(
  "eligibility has no database mutation authority",
  () => {
    for (const forbidden of [
      ".insert(",
      ".update(",
      ".upsert(",
      ".rpc(",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "eligibility has no storage mutation authority",
  () => {
    for (const forbidden of [
      ".upload(",
      ".remove(",
      ".move(",
      ".copy(",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "eligibility introduces no retention duration or scheduling policy",
  () => {
    for (const forbidden of [
      "retentionDays",
      "retention_hours",
      "cutoffDate",
      "cron",
      "schedule",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "eligibility introduces no ML production authority",
  () => {
    for (const forbidden of [
      "route_risk_model_registry",
      "activateRouteRisk",
      "lifecycle_status",
      "production_model",
      "riskScore",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);
