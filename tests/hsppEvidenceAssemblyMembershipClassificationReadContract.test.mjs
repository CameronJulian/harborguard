import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const testDirectory =
  path.dirname(
    fileURLToPath(import.meta.url),
  );


const repositoryRoot =
  path.resolve(
    testDirectory,
    "..",
  );


const migrationPath =
  path.join(
    repositoryRoot,
    "supabase",
    "migrations",
    "20260823173500_read_hspp_evidence_assembly_membership_classifications.sql",
  );


const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14ag8 creates one bounded membership lifecycle classification authority",
  () => {
    const definitions =
      source.match(
        /create\s+or\s+replace\s+function\s+public\.read_hspp_evidence_assembly_membership_classifications\s*\(/gi,
      ) ?? [];

    assert.equal(
      definitions.length,
      1,
    );

    assert.match(
      source,
      /p_organization_id\s+uuid[\s\S]*p_evidence_ids\s+uuid\[\]/i,
    );

    assert.match(
      source,
      /returns\s+table\s*\([\s\S]*evidence_id\s+uuid[\s\S]*has_historical_membership\s+boolean[\s\S]*has_current_effective_membership\s+boolean[\s\S]*membership_classification\s+text/i,
    );

    assert.match(
      source,
      /cardinality\s*\(\s*p_evidence_ids\s*\)[\s\S]*v_requested_count\s*>\s*100/i,
    );

    assert.match(
      source,
      /array_position\s*\(\s*p_evidence_ids\s*,\s*null::uuid\s*\)/i,
    );
  },
);


test(
  "Q14ag8 derives historical and current-effective state in one SQL RETURN QUERY statement",
  () => {
    /*
     * Anchor the pattern to the SQL statement itself.
     *
     * The migration documentation is allowed to contain the words
     * "RETURN QUERY" without being mistaken for another SQL statement.
     */
    const returnQueryStatements =
      source.match(
        /^\s*return\s+query\s*$/gim,
      ) ?? [];

    assert.equal(
      returnQueryStatements.length,
      1,
    );

    assert.match(
      source,
      /with\s+requested\s+as\s*\([\s\S]*unnest\s*\(\s*p_evidence_ids\s*\)[\s\S]*classified\s+as\s*\(/i,
    );

    assert.match(
      source,
      /exists\s*\([\s\S]*public\.hspp_evidence_assembly_members[\s\S]*historical_member\.organization_id\s*=\s*p_organization_id[\s\S]*historical_member\.evidence_id\s*=\s*requested\.evidence_id/i,
    );
  },
);


test(
  "Q14ag8 current-effective semantics match reconstruction leaf plus exact cessation exclusion",
  () => {
    assert.match(
      source,
      /public\.hspp_evidence_assembly_reconstructions[\s\S]*reconstruction\.organization_id\s*=\s*p_organization_id[\s\S]*reconstruction\.parent_assembly_id\s*=\s*current_member\.assembly_id/i,
    );

    assert.match(
      source,
      /public\.hspp_assembly_member_effective_cessations[\s\S]*cessation\.organization_id\s*=\s*p_organization_id[\s\S]*cessation\.historical_membership_id\s*=\s*current_member\.id/i,
    );

    assert.match(
      source,
      /not\s+exists\s*\([\s\S]*hspp_evidence_assembly_reconstructions/i,
    );

    assert.match(
      source,
      /not\s+exists\s*\([\s\S]*hspp_assembly_member_effective_cessations/i,
    );
  },
);


test(
  "Q14ag8 deterministically derives all three lifecycle classifications",
  () => {
    assert.match(
      source,
      /when\s+classified\.has_current_effective_membership[\s\S]*then\s+'CURRENT_EFFECTIVE'/i,
    );

    assert.match(
      source,
      /when\s+classified\.has_historical_membership[\s\S]*then\s+'HISTORICAL_NOT_CURRENT'/i,
    );

    assert.match(
      source,
      /else\s+'NEVER_ASSEMBLED'/i,
    );

    assert.match(
      source,
      /order\s+by\s+classified\.evidence_id/i,
    );
  },
);


test(
  "Q14ag8 is stable fixed-search-path service-role-only authority",
  () => {
    assert.match(
      source,
      /language\s+plpgsql[\s\S]*stable[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      source,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_evidence_assembly_membership_classifications\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+public/i,
    );

    assert.match(
      source,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_evidence_assembly_membership_classifications\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+anon/i,
    );

    assert.match(
      source,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_evidence_assembly_membership_classifications\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+from\s+authenticated/i,
    );

    assert.match(
      source,
      /grant\s+execute\s+on\s+function\s+public\.read_hspp_evidence_assembly_membership_classifications\s*\(\s*uuid\s*,\s*uuid\[\]\s*\)\s+to\s+service_role/i,
    );
  },
);


test(
  "Q14ag8 remains read-only and crosses no persistence or reconstruction boundary",
  () => {
    const bodyMatch =
      source.match(
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
      /\bupdate\s+public\./i,
    );

    assert.doesNotMatch(
      body,
      /\bdelete\s+from\b/i,
    );

    assert.doesNotMatch(
      body,
      /\bpersist_hspp_evidence_assembly\s*\(/i,
    );

    assert.doesNotMatch(
      body,
      /\bpersist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );
  },
);
