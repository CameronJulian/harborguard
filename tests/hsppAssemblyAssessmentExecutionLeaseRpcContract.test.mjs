import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260822172500_create_hspp_assembly_assessment_execution_lease.sql",
      import.meta.url,
    ),
    "utf8",
  );

function executableSql(value) {
  return value
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

const executable =
  executableSql(sql);

test(
  "Q13e3 creates one exact organization assembly lease row",
  () => {
    assert.match(
      executable,
      /create\s+table\s+if\s+not\s+exists\s+public\.hspp_assembly_assessment_execution_leases/i,
    );

    assert.match(
      executable,
      /primary\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)/i,
    );

    assert.match(
      executable,
      /\blease_token\s+uuid\s+not\s+null/i,
    );

    assert.match(
      executable,
      /\bexpires_at\s+timestamptz\s+not\s+null/i,
    );

    assert.match(
      executable,
      /foreign\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)\s*references\s+public\.hspp_evidence_assemblies\s*\(\s*organization_id\s*,\s*id\s*\)/i,
    );

    assert.doesNotMatch(
      executable,
      /assembly_id\s+uuid\s+not\s+null\s+references\s+public\.hspp_evidence_assemblies\s*\(\s*id\s*\)/i,
    );
  },
);

test(
  "Q13e3 lease is infrastructure metadata rather than HSPP lifecycle state",
  () => {
    assert.doesNotMatch(
      executable,
      /\bprocessing_status\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bcompletion_state\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\btrust_state\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\boperational_eligible\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bassessed_at\b/i,
    );
  },
);

test(
  "Q13e3 acquire serializes the exact organization assembly lease decision",
  () => {
    assert.match(
      executable,
      /pg_advisory_xact_lock\s*\([\s\S]*hspp-assembly-assessment-execution-lease[\s\S]*p_organization_id[\s\S]*p_assembly_id/i,
    );

    assert.match(
      executable,
      /from\s+public\.hspp_evidence_assemblies[\s\S]*organization_id\s*=\s*p_organization_id[\s\S]*id\s*=\s*p_assembly_id[\s\S]*for\s+update/i,
    );
  },
);

test(
  "Q13e3 acquire requires SEALED assembly state",
  () => {
    assert.match(
      executable,
      /v_assembly_state\s*<>\s*'SEALED'/i,
    );
  },
);

test(
  "Q13e3 acquire supports exact-token recovery and expired-owner takeover",
  () => {
    assert.match(
      executable,
      /v_lease\.lease_token\s*=\s*p_lease_token/i,
    );

    assert.match(
      executable,
      /v_lease\.expires_at\s*<=\s*v_now/i,
    );

    assert.match(
      executable,
      /set[\s\S]*lease_token\s*=\s*p_lease_token[\s\S]*acquired_at\s*=\s*v_now[\s\S]*expires_at/i,
    );
  },
);

test(
  "Q13e3 busy acquire does not expose foreign owner token",
  () => {
    assert.match(
      executable,
      /'BUSY'::text\s*,\s*null::uuid/i,
    );
  },
);

test(
  "Q13e3 renew requires exact live owner token",
  () => {
    assert.match(
      executable,
      /create\s+or\s+replace\s+function\s+public\.renew_hspp_assembly_assessment_execution_lease/i,
    );

    assert.match(
      executable,
      /lease\.lease_token\s*=\s*p_lease_token[\s\S]*lease\.expires_at\s*>\s*v_now/i,
    );

    assert.match(
      executable,
      /'LOST'::text/i,
    );
  },
);

test(
  "Q13e3 release cannot delete a replacement owner",
  () => {
    assert.match(
      executable,
      /create\s+or\s+replace\s+function\s+public\.release_hspp_assembly_assessment_execution_lease/i,
    );

    assert.match(
      executable,
      /delete\s+from\s+public\.hspp_assembly_assessment_execution_leases[\s\S]*organization_id\s*=\s*p_organization_id[\s\S]*assembly_id\s*=\s*p_assembly_id[\s\S]*lease_token\s*=\s*p_lease_token/i,
    );

    assert.match(
      executable,
      /'NOT_OWNER'::text/i,
    );
  },
);

test(
  "Q13e3 lease has bounded expiry",
  () => {
    assert.match(
      executable,
      /p_lease_seconds\s*<\s*1/i,
    );

    assert.match(
      executable,
      /p_lease_seconds\s*>\s*3600/i,
    );

    assert.match(
      executable,
      /make_interval\s*\(\s*secs\s*=>\s*p_lease_seconds\s*\)/i,
    );
  },
);

test(
  "Q13e3 table writes remain behind service-role-only RPCs",
  () => {
    assert.match(
      executable,
      /revoke\s+all[\s\S]*on\s+table\s+public\.hspp_assembly_assessment_execution_leases[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );

    assert.match(
      executable,
      /grant\s+select[\s\S]*on\s+table\s+public\.hspp_assembly_assessment_execution_leases[\s\S]*to\s+service_role/i,
    );

    for (const functionName of [
      "acquire_hspp_assembly_assessment_execution_lease",
      "renew_hspp_assembly_assessment_execution_lease",
      "release_hspp_assembly_assessment_execution_lease",
    ]) {
      assert.match(
        executable,
        new RegExp(
          `grant\\s+execute[\\s\\S]*${functionName}`,
          "i",
        ),
      );
    }
  },
);

test(
  "Q13e3 SQL does not execute Q12 or create completion facts",
  () => {
    assert.doesNotMatch(
      executable,
      /run_hspp_sealed/i,
    );

    assert.doesNotMatch(
      executable,
      /hspp_assembly_assessment_completions/i,
    );

    assert.doesNotMatch(
      executable,
      /record_hspp_assembly_assessment_completion/i,
    );
  },
);
