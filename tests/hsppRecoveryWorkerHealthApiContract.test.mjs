import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath = path.resolve(
  "app/api/hspp/health/route.ts"
);

const route =
  fs.readFileSync(
    routePath,
    "utf8"
  );

test(
  "HSPP health authenticates through organization context",
  () => {
    assert.match(
      route,
      /requireOrganization\s*\(\s*\)/
    );

    assert.match(
      route,
      /requireRole\s*\([\s\S]*?\[\s*["']owner["']\s*,\s*["']admin["']\s*\]/
    );
  }
);

test(
  "HSPP health reads scheduled worker state",
  () => {
    assert.match(
      route,
      /\.from\s*\(\s*["']scheduled_worker_state["']\s*\)/
    );

    assert.match(
      route,
      /\.eq\s*\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/
    );

    assert.match(
      route,
      /\.eq\s*\(\s*["']worker_key["']\s*,\s*HSPP_RECOVERY_WORKER_KEY\s*\)/
    );
  }
);

test(
  "HSPP health exposes durable recovery lifecycle timestamps",
  () => {
    for (const field of [
      "last_started_at",
      "last_successful_at",
      "last_failure_at",
      "last_failure_message",
      "metadata",
      "updated_at",
    ]) {
      assert.ok(
        route.includes(field),
        `expected ${field}`
      );
    }
  }
);

test(
  "HSPP health remains read only",
  () => {
    assert.doesNotMatch(
      route,
      /\.(insert|update|upsert|delete)\s*\(/
    );
  }
);

test(
  "HSPP recovery stale policy is one daily interval plus six hours grace",
  () => {
    assert.match(
      route,
      /HSPP_RECOVERY_SCHEDULE_INTERVAL_HOURS\s*=\s*[\r\n\s]*24/
    );

    assert.match(
      route,
      /HSPP_RECOVERY_STALE_GRACE_HOURS\s*=\s*[\r\n\s]*6/
    );

    assert.match(
      route,
      /HSPP_RECOVERY_STALE_AFTER_HOURS\s*=[\s\S]*?HSPP_RECOVERY_SCHEDULE_INTERVAL_HOURS\s*\+[\s\S]*?HSPP_RECOVERY_STALE_GRACE_HOURS/
    );
  }
);

test(
  "HSPP recovery freshness is derived from last successful execution",
  () => {
    assert.match(
      route,
      /Date\.parse\s*\(\s*lastSuccessfulAt\s*\)/
    );

    assert.match(
      route,
      /Date\.now\s*\(\s*\)\s*-\s*lastSuccessfulAtMs/
    );

    assert.match(
      route,
      /successfulAgeMs\s*>[\s\S]*?HSPP_RECOVERY_STALE_AFTER_MS/
    );
  }
);

test(
  "HSPP recovery health exposes unknown healthy and stale semantics",
  () => {
    assert.match(
      route,
      /"unknown"[\s\S]*?"healthy"[\s\S]*?"stale"/
    );

    assert.match(
      route,
      /\?\s*"stale"\s*:\s*"healthy"/
    );

    assert.match(
      route,
      /status,/
    );

    assert.match(
      route,
      /staleAfterHours:/
    );
  }
);

test(
  "HSPP recovery failure evidence remains separate from stale classification",
  () => {
    assert.match(
      route,
      /lastFailureAt:/
    );

    assert.match(
      route,
      /lastFailureMessage:/
    );

    assert.doesNotMatch(
      route,
      /lastFailureAt[\s\S]{0,120}\?\s*"stale"/
    );
  }
);
