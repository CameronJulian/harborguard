import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

const migrationPath = path.resolve(
  here,
  "../supabase/migrations/20260826083000_activate_hspp_r1_service_role_execution.sql",
);

function normalizeStatement(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim()
    .toLowerCase();
}

function migrationStatements() {
  const source = readFileSync(migrationPath, "utf8");

  const withoutComments = source
    .replace(/--.*$/gm, "");

  return withoutComments
    .split(";")
    .map(normalizeStatement)
    .filter(Boolean);
}

test("R1 activation migration grants only the exact three RPC identities to service_role", () => {
  const statements = migrationStatements();

  const writer =
    "public.persist_hspp_member_revalidation_checkpoint_under_lease(" +
    "uuid, uuid, uuid, uuid, text, uuid, text, " +
    "timestamp with time zone, timestamp with time zone)";

  const cas =
    "public.compare_and_swap_hspp_revalidation_candidate_scan_state(" +
    "uuid, timestamp with time zone, uuid, " +
    "timestamp with time zone, uuid)";

  const reader =
    "public.read_hspp_post_positive_revalidation_candidate_page(" +
    "uuid, integer)";

  const targets = [
    writer,
    cas,
    reader,
  ];

  const expected = [];

  for (const target of targets) {
    expected.push(
      normalizeStatement(
        `revoke execute on function ${target} ` +
          "from public, anon, authenticated",
      ),
    );

    expected.push(
      normalizeStatement(
        `grant execute on function ${target} to service_role`,
      ),
    );
  }

  assert.equal(
    statements.length,
    6,
    "activation migration must contain exactly six SQL statements",
  );

  assert.deepEqual(
    [...statements].sort(),
    [...expected].sort(),
    "activation migration must contain only the three exact deny/grant pairs",
  );
});

test("R1 activation migration does not broaden authority or alter schema/runtime wiring", () => {
  const source = readFileSync(
    migrationPath,
    "utf8",
  );

  const sql = source
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  assert.equal(
    (sql.match(/\bgrant\s+execute\s+on\s+function\b/g) ?? []).length,
    3,
  );

  assert.equal(
    (sql.match(/\brevoke\s+execute\s+on\s+function\b/g) ?? []).length,
    3,
  );

  assert.doesNotMatch(
    sql,
    /\bgrant\b[^;]*\bto\s+(public|anon|authenticated)\b/,
  );

  assert.doesNotMatch(
    sql,
    /\brevoke\b[^;]*\bfrom\s+service_role\b/,
  );

  assert.doesNotMatch(
    sql,
    /\b(create|alter|drop|insert|update|delete|truncate)\b/,
  );

  assert.doesNotMatch(
    sql,
    /runhspppostpositivelifecyclecyclev3/i,
  );
});
