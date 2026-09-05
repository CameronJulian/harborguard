import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

test("renew contention uses non-blocking advisory serialization", () => {
  const migrationsDir =
    path.join(root, "supabase", "migrations");

  const migrationName =
    fs.readdirSync(migrationsDir)
      .find((name) =>
        name.endsWith(
          "_harden_hspp_renew_lock_contention.sql",
        ),
      );

  assert.ok(migrationName);

  const migration =
    read(
      path.join(
        "supabase",
        "migrations",
        migrationName,
      ),
    );

  assert.match(
    migration,
    /renew_hspp_assembly_assessment_execution_lease/,
  );

  assert.match(
    migration,
    /pg_try_advisory_xact_lock\s*\(/,
  );

  assert.match(
    migration,
    /'CONTENDED'::text\s*,\s*null::timestamptz/s,
  );

  assert.doesNotMatch(
    migration,
    /\bperform\s+pg_advisory_xact_lock\s*\(/,
  );
});

test("renew CONTENDED remains distinct from LOST", () => {
  const source =
    read(
      path.join(
        "lib",
        "hspp",
        "hsppAssemblyAssessmentExecutionLease.ts",
      ),
    );

  assert.match(
    source,
    /state:\s*"RENEWED"\s*\|\s*"LOST"\s*\|\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /row\.renew_state\s*!==\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /row\.renew_state\s*===\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /CONTENDED HSPP execution lease renew must not expose an expiry/,
  );

  assert.match(
    source,
    /state:\s*"CONTENDED"[\s\S]*?expiresAt:\s*null/,
  );

  assert.match(
    source,
    /state:\s*"LOST"[\s\S]*?expiresAt:\s*null/,
  );
});

test("renew hardening leaves release semantics unchanged", () => {
  const source =
    read(
      path.join(
        "lib",
        "hspp",
        "hsppAssemblyAssessmentExecutionLease.ts",
      ),
    );

  assert.match(
    source,
    /state:\s*"RELEASED"\s*\|\s*"NOT_OWNER";/,
  );

  const migrationsDir =
    path.join(root, "supabase", "migrations");

  const migrationName =
    fs.readdirSync(migrationsDir)
      .find((name) =>
        name.endsWith(
          "_harden_hspp_renew_lock_contention.sql",
        ),
      );

  assert.ok(migrationName);

  const migration =
    read(
      path.join(
        "supabase",
        "migrations",
        migrationName,
      ),
    );

  assert.doesNotMatch(
    migration,
    /release_hspp_assembly_assessment_execution_lease/,
  );
});