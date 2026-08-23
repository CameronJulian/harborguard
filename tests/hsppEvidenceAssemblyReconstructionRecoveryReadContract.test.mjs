import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const repoRoot =
  path.resolve(
    testDir,
    "..",
  );

function readRepoFile(relativePath) {
  return fs.readFileSync(
    path.join(
      repoRoot,
      relativePath,
    ),
    "utf8",
  );
}

function executableSql(source) {
  return source.replace(
    /--.*$/gm,
    "",
  );
}

const migration =
  readRepoFile(
    "supabase/migrations/20260823191500_read_hspp_evidence_assembly_reconstruction_recovery.sql",
  );

const executable =
  executableSql(
    migration,
  );

const q14ag21 =
  readRepoFile(
    "supabase/migrations/20260823190000_enforce_hspp_single_reconstruction_successor.sql",
  );

const reconstructionSchema =
  readRepoFile(
    "supabase/migrations/20260823050000_create_hspp_evidence_assembly_reconstruction_provenance.sql",
  );


test(
  "Q14ag22A creates one child-keyed service-role-only reconstruction recovery RPC",
  () => {

    assert.match(
      executable,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_evidence_assembly_reconstruction_recovery\s*\(\s*p_organization_id\s+uuid\s*,\s*p_child_assembly_id\s+uuid\s*\)/i,
    );

    assert.match(
      executable,
      /\blanguage\s+plpgsql\b/i,
    );

    assert.match(
      executable,
      /\bstable\b/i,
    );

    assert.match(
      executable,
      /\bsecurity\s+definer\b/i,
    );

    assert.match(
      executable,
      /\bset\s+search_path\s*=\s*public\b/i,
    );
  },
);


test(
  "Q14ag22A validates both required recovery identities",
  () => {

    assert.match(
      executable,
      /if\s+p_organization_id\s+is\s+null[\s\S]*p_organization_id is required/i,
    );

    assert.match(
      executable,
      /if\s+p_child_assembly_id\s+is\s+null[\s\S]*p_child_assembly_id is required/i,
    );
  },
);


test(
  "Q14ag22A treats only a completely absent child UUID as valid NOT_FOUND",
  () => {

    assert.match(
      executable,
      /from\s+public\.hspp_evidence_assemblies\s+as\s+child_assembly[\s\S]*child_assembly\.id\s*=\s*p_child_assembly_id/i,
    );

    assert.match(
      executable,
      /if\s+not\s+found\s+then[\s\S]*\breturn\s*;/i,
    );
  },
);


test(
  "Q14ag22A fails closed on cross-organization child UUID collision",
  () => {

    assert.match(
      executable,
      /v_child_organization_id\s*<>\s*p_organization_id/i,
    );

    assert.match(
      executable,
      /Existing HSPP child assembly belongs to a different organization\./,
    );
  },
);


test(
  "Q14ag22A fails closed when an existing child UUID is not reconstruction-owned",
  () => {

    assert.match(
      executable,
      /if\s+not\s+exists\s*\([\s\S]*public\.hspp_evidence_assembly_reconstructions[\s\S]*reconstruction\.organization_id\s*=\s*p_organization_id[\s\S]*reconstruction\.child_assembly_id\s*=\s*p_child_assembly_id/i,
    );

    assert.match(
      executable,
      /Existing HSPP child assembly is not owned by reconstruction provenance\./,
    );
  },
);


test(
  "Q14ag22A returns canonical reconstruction header and current child lifecycle state",
  () => {

    for (
      const field of [
        "reconstruction_id uuid",
        "organization_id uuid",
        "parent_assembly_id uuid",
        "child_assembly_id uuid",
        "assembly_version text",
        "membership_policy_version text",
        "reconstruction_policy_version text",
        "reconstruction_reason text",
        "assembly_state text",
        "sealed_at timestamptz",
        "persisted_member_count integer",
        "retained_member_count integer",
        "original_member_count integer",
        "removed_change_count integer",
        "added_change_count integer",
        "members jsonb",
      ]
    ) {
      assert.ok(
        migration.includes(
          field,
        ),
        `missing recovery return field: ${field}`,
      );
    }
  },
);


test(
  "Q14ag22A returns exact immutable child membership metadata in ordinal order",
  () => {

    assert.match(
      executable,
      /jsonb_build_object\s*\([\s\S]*'membership_id'[\s\S]*member\.id[\s\S]*'evidence_id'[\s\S]*member\.evidence_id[\s\S]*'evidence_integrity_fingerprint'[\s\S]*member\.evidence_integrity_fingerprint[\s\S]*'member_ordinal'[\s\S]*member\.member_ordinal[\s\S]*'membership_kind'[\s\S]*member\.membership_kind[\s\S]*'source_membership_id'[\s\S]*member\.source_membership_id/i,
    );

    assert.match(
      executable,
      /order\s+by\s+member\.member_ordinal\s*,\s*member\.evidence_id/i,
    );
  },
);


test(
  "Q14ag22A derives recovery counts without returning mutable execution authority",
  () => {

    assert.match(
      executable,
      /membership_kind\s*=\s*'RETAINED'/i,
    );

    assert.match(
      executable,
      /membership_kind\s*=\s*'ORIGINAL'/i,
    );

    assert.match(
      executable,
      /change_kind\s*=\s*'REMOVED'/i,
    );

    assert.match(
      executable,
      /change_kind\s*=\s*'ADDED'/i,
    );
  },
);


test(
  "Q14ag22A does not restrict recovery to OPEN children",
  () => {

    assert.doesNotMatch(
      executable,
      /assembly_state\s*=\s*'OPEN'/i,
    );

    assert.doesNotMatch(
      executable,
      /assembly_state\s*<>\s*'OPEN'/i,
    );
  },
);


test(
  "Q14ag22A is compatible with both child and parent lineage uniqueness",
  () => {

    assert.match(
      reconstructionSchema,
      /constraint\s+hspp_reconstruction_child_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*child_assembly_id\s*\)/i,
    );

    assert.match(
      q14ag21,
      /constraint\s+hspp_reconstruction_parent_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*parent_assembly_id\s*\)/i,
    );
  },
);


test(
  "Q14ag22A uses one database recovery snapshot and does not invoke reconstruction persistence",
  () => {

    assert.match(
      executable,
      /return\s+query\s+with\s+target\s+as\s*\(/i,
    );

    assert.match(
      executable,
      /member_snapshot\s+as\s*\(/i,
    );

    assert.match(
      executable,
      /change_snapshot\s+as\s*\(/i,
    );

    assert.doesNotMatch(
      executable,
      /\bpersist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );
  },
);


test(
  "Q14ag22A performs no table mutation",
  () => {

    assert.doesNotMatch(
      executable,
      /\binsert\s+into\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bupdate\s+[a-z0-9_.]+\s+set\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bdelete\s+from\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\balter\s+table\b/i,
    );
  },
);


test(
  "Q14ag22A grants execution only to service_role",
  () => {

    assert.match(
      executable,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_evidence_assembly_reconstruction_recovery\s*\(\s*uuid\s*,\s*uuid\s*\)\s+from\s+public/i,
    );

    assert.match(
      executable,
      /from\s+anon/i,
    );

    assert.match(
      executable,
      /from\s+authenticated/i,
    );

    assert.match(
      executable,
      /grant\s+execute\s+on\s+function\s+public\.read_hspp_evidence_assembly_reconstruction_recovery\s*\(\s*uuid\s*,\s*uuid\s*\)\s+to\s+service_role/i,
    );

    assert.doesNotMatch(
      executable,
      /grant\s+execute[\s\S]*to\s+(anon|authenticated|public)\b/i,
    );
  },
);


test(
  "Q14ag22A introduces no bridge sealing assessment trust Reservoir or scheduling authority",
  () => {

    assert.doesNotMatch(
      executable,
      /\bread_hspp_historical_reconstruction_contexts\s*\(/i,
    );

    assert.doesNotMatch(
      executable,
      /\bseal_hspp/i,
    );

    assert.doesNotMatch(
      executable,
      /\bassessment_retry\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bcron\s*\.\s*schedule\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bpg_net\b|\bhttp_post\b/i,
    );
  },
);
