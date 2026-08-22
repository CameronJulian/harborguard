import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const sql =
  readFileSync(
    "supabase/migrations/20260822175700_record_hspp_assembly_assessment_completion_under_execution_lease.sql",
    "utf8"
  );

const executable =
  sql.replace(
    /--.*$/gm,
    ""
  );

const functionBody =
  executable.match(
    /as\s+\$\$([\s\S]*?)\$\$;/i
  )?.[1] ?? "";

test(
  "Q13e5b creates the dedicated fenced completion RPC",
  () => {
    assert.match(
      executable,
      /create\s+or\s+replace\s+function\s+public\.record_hspp_assembly_assessment_completion_under_execution_lease\s*\(/i
    );
  }
);

test(
  "Q13e5b is SECURITY DEFINER with fixed public search path",
  () => {
    assert.match(
      executable,
      /security\s+definer/i
    );

    assert.match(
      executable,
      /set\s+search_path\s*=\s*public/i
    );
  }
);

test(
  "Q13e5b preserves canonical assembly-before-lease row lock order",
  () => {
    const assemblyPosition =
      executable.search(
        /from\s+public\.hspp_evidence_assemblies\s+as\s+assembly[\s\S]*?for\s+update/i
      );

    const leasePosition =
      executable.search(
        /from\s+public\.hspp_assembly_assessment_execution_leases\s+as\s+lease[\s\S]*?for\s+update/i
      );

    assert.ok(
      assemblyPosition >= 0
    );

    assert.ok(
      leasePosition >= 0
    );

    assert.ok(
      assemblyPosition <
        leasePosition
    );
  }
);

test(
  "Q13e5b requires the exact SEALED assembly",
  () => {
    assert.match(
      executable,
      /assembly\.organization_id\s*=\s*p_organization_id/i
    );

    assert.match(
      executable,
      /assembly\.id\s*=\s*p_assembly_id/i
    );

    assert.match(
      executable,
      /v_assembly_state\s*<>\s*'SEALED'/i
    );
  }
);

test(
  "Q13e5b locks and fences the exact active lease owner",
  () => {
    assert.match(
      executable,
      /lease\.organization_id\s*=\s*p_organization_id/i
    );

    assert.match(
      executable,
      /lease\.assembly_id\s*=\s*p_assembly_id/i
    );

    assert.match(
      executable,
      /v_lease\.lease_token\s*<>\s*p_lease_token/i
    );

    assert.match(
      executable,
      /v_lease\.expires_at\s*<=\s*v_now/i
    );

    assert.match(
      executable,
      /v_now\s*:=\s*clock_timestamp\s*\(\s*\)/i
    );
  }
);

test(
  "Q13e5b requires the canonical retry identity",
  () => {
    assert.match(
      executable,
      /from\s+public\.hspp_assembly_assessment_retry_identities\s+as\s+identity/i
    );

    assert.match(
      executable,
      /identity\.organization_id\s*=\s*p_organization_id/i
    );

    assert.match(
      executable,
      /identity\.assembly_id\s*=\s*p_assembly_id/i
    );
  }
);

test(
  "Q13e5b recovers existing immutable completion before insertion",
  () => {
    const existingPosition =
      executable.search(
        /from\s+public\.hspp_assembly_assessment_completions\s+as\s+completion/i
      );

    const insertPosition =
      executable.search(
        /insert\s+into\s+public\.hspp_assembly_assessment_completions/i
      );

    assert.ok(
      existingPosition >= 0
    );

    assert.ok(
      insertPosition >= 0
    );

    assert.ok(
      existingPosition <
        insertPosition
    );

    assert.match(
      executable,
      /if\s+found\s+then[\s\S]*?return\s+query/i
    );
  }
);

test(
  "Q13e5b inserts only the existing Q13d4 completion fact",
  () => {
    assert.match(
      executable,
      /insert\s+into\s+public\.hspp_assembly_assessment_completions\s*\(\s*organization_id\s*,\s*assembly_id\s*\)/i
    );

    assert.doesNotMatch(
      executable,
      /update\s+public\.hspp_assembly_assessment_completions/i
    );

    assert.doesNotMatch(
      executable,
      /delete\s+from\s+public\.hspp_assembly_assessment_completions/i
    );

    assert.doesNotMatch(
      executable,
      /on\s+conflict/i
    );
  }
);

test(
  "Q13e5b rechecks expiry after completion insertion and fails closed",
  () => {
    const insertPosition =
      executable.search(
        /insert\s+into\s+public\.hspp_assembly_assessment_completions/i
      );

    const finalExpiryPosition =
      executable.lastIndexOf(
        "v_lease.expires_at <= clock_timestamp()"
      );

    assert.ok(
      insertPosition >= 0
    );

    assert.ok(
      finalExpiryPosition >
        insertPosition
    );

    assert.match(
      executable,
      /expired before fenced completion transaction completed/i
    );
  }
);

test(
  "Q13e5b does not mutate lease ownership",
  () => {
    assert.doesNotMatch(
      executable,
      /update\s+public\.hspp_assembly_assessment_execution_leases/i
    );

    assert.doesNotMatch(
      executable,
      /insert\s+into\s+public\.hspp_assembly_assessment_execution_leases/i
    );

    assert.doesNotMatch(
      executable,
      /delete\s+from\s+public\.hspp_assembly_assessment_execution_leases/i
    );
  }
);

test(
  "Q13e5b creates no duplicate assessment or workflow state",
  () => {
    assert.ok(
      functionBody.length > 0,
      "Q13e5b PL/pgSQL function body could not be isolated."
    );

    assert.doesNotMatch(
      functionBody,
      /\bassessed_at\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\bcompleted_at\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\bprocessing_state\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\bstarted\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\brunning\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\bfailed\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\btrust_state\b/i
    );

    assert.doesNotMatch(
      functionBody,
      /\boperational_eligible\b/i
    );
  }
);

test(
  "Q13e5b is executable only by service_role",
  () => {
    assert.match(
      executable,
      /revoke\s+all[\s\S]*from\s+public,\s*anon,\s*authenticated,\s*service_role/i
    );

    assert.match(
      executable,
      /grant\s+execute[\s\S]*to\s+service_role/i
    );

    assert.doesNotMatch(
      executable,
      /grant\s+execute[\s\S]*to\s+authenticated/i
    );

    assert.doesNotMatch(
      executable,
      /grant\s+execute[\s\S]*to\s+anon/i
    );
  }
);
