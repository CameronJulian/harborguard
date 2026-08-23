import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const migrationDirectory =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
  );


const matches =
  fs.readdirSync(
    migrationDirectory,
  ).filter(
    (name) =>
      name.endsWith(
        "_read_hspp_historical_reconstruction_contexts.sql",
      ),
  );


assert.equal(
  matches.length,
  1,
  "Expected exactly one Q14ag14 historical reconstruction-context read migration.",
);


const migrationPath =
  path.join(
    migrationDirectory,
    matches[0],
  );


const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14ag14 creates one bounded historical reconstruction-context read authority",
  () => {
    const definitions =
      sql.match(
        /create\s+or\s+replace\s+function\s+public\.read_hspp_historical_reconstruction_contexts\s*\(/gi,
      ) ?? [];

    assert.equal(
      definitions.length,
      1,
    );

    assert.match(
      sql,
      /p_organization_id\s+uuid/i,
    );

    assert.match(
      sql,
      /p_evidence_ids\s+uuid\[\]/i,
    );

    assert.match(
      sql,
      /cardinality\s*\(\s*p_evidence_ids\s*\)/i,
    );

    assert.match(
      sql,
      /v_requested_count\s*>\s*100/i,
    );

    assert.match(
      sql,
      /array_position\s*\(\s*p_evidence_ids\s*,\s*null\s*\)/i,
    );
  },
);


test(
  "Q14ag14 returns the exact historical membership and parent composition identity",
  () => {
    assert.match(
      sql,
      /historical_membership_id\s+uuid/i,
    );

    assert.match(
      sql,
      /parent_assembly_id\s+uuid/i,
    );

    assert.match(
      sql,
      /evidence_integrity_fingerprint\s+text/i,
    );

    assert.match(
      sql,
      /parent_member_ordinal\s+integer/i,
    );

    assert.match(
      sql,
      /cessation_id\s+uuid/i,
    );

    assert.match(
      sql,
      /unsuitability_checkpoint_id\s+uuid/i,
    );

    assert.match(
      sql,
      /cessation_policy_version\s+text/i,
    );

    assert.match(
      sql,
      /cessation_reason\s+text/i,
    );

    assert.match(
      sql,
      /ceased_at\s+timestamptz/i,
    );
  },
);


test(
  "Q14ag14 binds exact Q14ab cessation to exact immutable historical membership",
  () => {
    assert.match(
      sql,
      /public\.hspp_assembly_member_effective_cessations\s+as\s+cessation/i,
    );

    assert.match(
      sql,
      /public\.hspp_evidence_assembly_members\s+as\s+membership/i,
    );

    assert.match(
      sql,
      /membership\.id\s*=\s*cessation\.historical_membership_id/i,
    );

    assert.match(
      sql,
      /membership\.organization_id\s*=\s*cessation\.organization_id/i,
    );

    assert.match(
      sql,
      /membership\.assembly_id\s*=\s*cessation\.assembly_id/i,
    );

    assert.match(
      sql,
      /membership\.evidence_id\s*=\s*cessation\.evidence_id/i,
    );

    assert.match(
      sql,
      /membership\.evidence_integrity_fingerprint\s*=\s*cessation\.integrity_fingerprint/i,
    );
  },
);


test(
  "Q14ag14 exposes only an unreconstructed SEALED cessation parent",
  () => {
    assert.match(
      sql,
      /public\.hspp_evidence_assemblies\s+as\s+parent_assembly/i,
    );

    assert.match(
      sql,
      /parent_assembly\.assembly_state\s*=\s*'SEALED'/i,
    );

    assert.match(
      sql,
      /not\s+exists\s*\([\s\S]*public\.hspp_evidence_assembly_reconstructions\s+as\s+reconstruction[\s\S]*reconstruction\.parent_assembly_id\s*=\s*cessation\.assembly_id/i,
    );
  },
);


test(
  "Q14ag14 fails closed instead of selecting among ambiguous historical contexts",
  () => {
    assert.match(
      sql,
      /unambiguous\s+as\s*\(/i,
    );

    assert.match(
      sql,
      /conflicting\.evidence_id\s*=\s*candidate\.evidence_id/i,
    );

    assert.match(
      sql,
      /conflicting\.historical_membership_id\s*<>\s*candidate\.historical_membership_id/i,
    );

    assert.match(
      sql,
      /order\s+by\s+context\.evidence_id/i,
    );
  },
);


test(
  "Q14ag14 is stable fixed-search-path service-role-only read authority",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql[\s\S]*stable[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_historical_reconstruction_contexts\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+public/i,
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_historical_reconstruction_contexts\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+anon/i,
    );

    assert.match(
      sql,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_historical_reconstruction_contexts\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+authenticated/i,
    );

    assert.match(
      sql,
      /grant\s+execute\s+on\s+function\s+public\.read_hspp_historical_reconstruction_contexts\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+to\s+service_role/i,
    );
  },
);


test(
  "Q14ag14 grants no replacement reconstruction or downstream mutation authority",
  () => {
    const bodyMatch =
      sql.match(
        /as\s+\$\$([\s\S]*?)\$\$;/i,
      );

    assert.ok(
      bodyMatch,
    );

    const body =
      bodyMatch[1];

    assert.doesNotMatch(
      body,
      /\binsert\s+into\b/i,
    );

    assert.doesNotMatch(
      body,
      /\bupdate\s+/i,
    );

    assert.doesNotMatch(
      body,
      /\bdelete\s+from\b/i,
    );

    assert.doesNotMatch(
      body,
      /persist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );

    assert.doesNotMatch(
      body,
      /persist_hspp_evidence_assembly\s*\(/i,
    );

    assert.match(
      sql,
      /HISTORICAL_NOT_CURRENT\s+alone\s+does\s+not\s+authorize\s+reconstruction/i,
    );

    assert.match(
      sql,
      /does\s+not\s+select\s+replacement\s+evidence/i,
    );
  },
);
