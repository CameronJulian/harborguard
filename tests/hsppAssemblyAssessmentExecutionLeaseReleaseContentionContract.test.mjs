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

test("release contention uses non-blocking advisory serialization", () => {
  const migrationsDir =
    path.join(root, "supabase", "migrations");

  const migrationName =
    fs.readdirSync(migrationsDir)
      .find((name) =>
        name.endsWith(
          "_harden_hspp_release_lock_contention.sql",
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
    /release_hspp_assembly_assessment_execution_lease/,
  );

  assert.match(
    migration,
    /pg_try_advisory_xact_lock\s*\(/,
  );

  assert.match(
    migration,
    /'CONTENDED'::text/,
  );

  assert.match(
    migration,
    /'RELEASED'::text/,
  );

  assert.match(
    migration,
    /'NOT_OWNER'::text/,
  );

  assert.doesNotMatch(
    migration,
    /\bperform\s+pg_advisory_xact_lock\s*\(/,
  );
});

test("low-level release exposes CONTENDED distinctly", () => {
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
    /state:\s*"RELEASED"\s*\|\s*"NOT_OWNER"\s*\|\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /row\.release_state\s*!==\s*"RELEASED"[\s\S]*?row\.release_state\s*!==\s*"NOT_OWNER"[\s\S]*?row\.release_state\s*!==\s*"CONTENDED"/,
  );
});

test("post-positive runners expose CONTENDED", () => {
  const files = [
    "lib/hspp/runHsppPostPositiveMemberEffectiveCessation.ts",
    "lib/hspp/runHsppPostPositiveMemberUnsuitabilityAssessment.ts",
    "lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessment.ts",
    "lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2.ts",
  ];

  for (const file of files) {
    const source = read(file);

    assert.match(
      source,
      /"RELEASED"\s*\|[\s\S]*?"NOT_OWNER"\s*\|[\s\S]*?"CONTENDED"/,
      file,
    );
  }
});

test("sealed recovery converts release contention into failure", () => {
  const source =
    read(
      path.join(
        "lib",
        "hspp",
        "runHsppSealedAssemblyRecoveryAssessment.ts",
      ),
    );

  assert.match(
    source,
    /release\.state\s*===\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /sealed assembly recovery lease release was contended/,
  );

  assert.match(
    source,
    /primaryError\s*===\s*null/,
  );
});