import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const report = fs.readFileSync(
  "app/api/route-safety/report/route.ts",
  "utf8"
);

const rateLimit = fs.readFileSync(
  "lib/ratelimit.ts",
  "utf8"
);

test(
  "driver hazard reports have a dedicated rate limiter",
  () => {
    assert.match(
      rateLimit,
      /routeSafetyReportRatelimit/
    );

    assert.match(
      report,
      /routeSafetyReportRatelimit\.limit/
    );

    assert.match(
      report,
      /status:\s*429/
    );
  }
);

test(
  "driver hazard report types are validated",
  () => {
    assert.match(
      report,
      /DRIVER_REPORT_TYPES/
    );

    assert.match(
      report,
      /Unsupported hazard type/
    );

    assert.match(
      report,
      /smash_grab_hotspot/
    );

    assert.match(
      report,
      /traffic_light_outage/
    );
  }
);

test(
  "driver reports remain unverified",
  () => {
    assert.match(
      report,
      /verification_status:\s*"unverified"/
    );

    assert.match(
      report,
      /verified_at:\s*null/
    );

    assert.doesNotMatch(
      report,
      /verified_at:\s*new Date/
    );
  }
);

test(
  "driver reports remain active but expire",
  () => {
    assert.match(
      report,
      /status:\s*"active"/
    );

    assert.match(
      report,
      /expires_at:\s*expiresAt/
    );
  }
);

test(
  "nearby active duplicates are suppressed",
  () => {
    assert.match(
      report,
      /possibleDuplicates/
    );

    assert.match(
      report,
      /\.eq\(\s*"status",\s*"active"\s*\)/
    );

    assert.match(
      report,
      /\.eq\(\s*"type",\s*type\s*\)/
    );

    assert.match(
      report,
      /duplicate:\s*true/
    );
  }
);

test(
  "report coordinates are validated",
  () => {
    assert.match(
      report,
      /latitude < -90/
    );

    assert.match(
      report,
      /longitude < -180/
    );

    assert.match(
      report,
      /Invalid hazard coordinates/
    );
  }
);

test(
  "user and organization identity remain authoritative",
  () => {
    assert.match(
      report,
      /requireOrganization/
    );

    assert.match(
      report,
      /organization_id:\s*organizationId/
    );

    assert.match(
      report,
      /created_by:\s*user\.id/
    );
  }
);

test(
  "driver cannot submit suggested route authority",
  () => {
    assert.match(
      report,
      /suggested_route:\s*null/
    );
  }
);
test(
  "rate limiter infrastructure failure is not reported as unauthorized",
  () => {
    assert.match(
      report,
      /Hazard reporting is temporarily unavailable\./
    );

    assert.match(
      report,
      /status:\s*503/
    );

    const limiterStart =
      report.indexOf(
        "await routeSafetyReportRatelimit.limit"
      );

    assert.ok(
      limiterStart >= 0
    );

    const surrounding =
      report.slice(
        Math.max(
          0,
          limiterStart - 250
        ),
        limiterStart + 600
      );

    assert.match(
      surrounding,
      /catch/
    );

    assert.match(
      surrounding,
      /503/
    );
  }
);

test(
  "duplicate suppression uses exact geographic distance",
  () => {
    assert.match(
      report,
      /getDistanceMeters/
    );

    assert.match(
      report,
      /DUPLICATE_DISTANCE_METERS\s*=\s*500/
    );

    assert.match(
      report,
      /getDistanceMeters\([\s\S]*?candidateLatitude[\s\S]*?candidateLongitude/
    );

    assert.match(
      report,
      /<=\s*[\s\S]*?DUPLICATE_DISTANCE_METERS/
    );
  }
);

test(
  "bounding box is only a duplicate prefilter",
  () => {
    assert.match(
      report,
      /DUPLICATE_PREFILTER_DEGREES/
    );

    assert.match(
      report,
      /\.limit\(25\)/
    );

    assert.doesNotMatch(
      report,
      /const duplicate\s*=\s*possibleDuplicates\?\.\[0\]/
    );
  }
);