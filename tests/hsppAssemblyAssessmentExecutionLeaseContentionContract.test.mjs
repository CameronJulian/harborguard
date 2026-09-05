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

test("acquire contention uses non-blocking advisory lock", () => {
  const migrationsDir =
    path.join(root, "supabase", "migrations");

  const migrationName =
    fs.readdirSync(migrationsDir)
      .find((name) =>
        name.endsWith(
          "_harden_hspp_acquire_lock_contention.sql",
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
    /pg_try_advisory_xact_lock\s*\(/,
  );

  assert.match(
    migration,
    /'CONTENDED'::text/,
  );

  assert.doesNotMatch(
    migration,
    /\bperform\s+pg_advisory_xact_lock\s*\(/,
  );
});

test("CONTENDED is distinct from committed BUSY", () => {
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
    /state:\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /row\.acquire_state\s*!==\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /row\.acquire_state\s*===\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /state:\s*"CONTENDED"[\s\S]*?expiresAt:\s*null/,
  );
});

test("post-positive runners map contention without invented expiry", () => {
  const files = [
    "runHsppPostPositiveMemberEffectiveCessation.ts",
    "runHsppPostPositiveMemberUnsuitabilityAssessment.ts",
    "runHsppPostPositiveRevalidationUnsuitabilityAssessment.ts",
    "runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2.ts",
  ];

  for (const file of files) {
    const source =
      read(
        path.join(
          "lib",
          "hspp",
          file,
        ),
      );

    assert.match(
      source,
      /leaseAcquisition\.state\s*===\s*"BUSY"\s*\|\|\s*leaseAcquisition\.state\s*===\s*"CONTENDED"/s,
    );

    assert.match(
      source,
      /leaseAcquisition\.state\s*===\s*"BUSY"\s*\?\s*leaseAcquisition\.expiresAt\s*:\s*null/s,
    );
  }
});

test("both revalidation dependency contracts accept CONTENDED", () => {
  const files = [
    "runHsppPostPositiveRevalidationUnsuitabilityAssessment.ts",
    "runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2.ts",
  ];

  for (const file of files) {
    const source =
      read(
        path.join(
          "lib",
          "hspp",
          file,
        ),
      );

    assert.match(
      source,
      /export type HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition[\s\S]*?state:\s*"CONTENDED";[\s\S]*?leaseToken:\s*null;[\s\S]*?expiresAt:\s*null;/,
      `${file} must represent transient contention explicitly`,
    );

    assert.match(
      source,
      /Promise<HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition>/,
    );
  }
});

test("sealed recovery maps contention to execution busy", () => {
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
    /state:\s*"BUSY"\s*\|\s*"CONTENDED"/,
  );

  assert.match(
    source,
    /leaseAcquisition\.state\s*===\s*"BUSY"\s*\|\|\s*leaseAcquisition\.state\s*===\s*"CONTENDED"/s,
  );
});