import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const sql =
  readFileSync(
    "supabase/migrations/20260822174600_apply_hspp_assessment_decision_under_execution_lease.sql",
    "utf8"
  );

test(
  "Q13e5a creates the dedicated fenced assessment RPC",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.apply_hspp_assessment_decision_under_execution_lease\s*\(/i
    );
  }
);

test(
  "Q13e5a is SECURITY DEFINER with a fixed public search path",
  () => {
    assert.match(
      sql,
      /security\s+definer/i
    );

    assert.match(
      sql,
      /set\s+search_path\s*=\s*public/i
    );
  }
);

test(
  "Q13e5a locks the exact lease row before assessment mutation",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_assembly_assessment_execution_leases\s+as\s+lease[\s\S]*lease\.organization_id\s*=\s*p_organization_id[\s\S]*lease\.assembly_id\s*=\s*p_assembly_id[\s\S]*for\s+update/i
    );
  }
);

test(
  "Q13e5a rejects wrong-token and expired lease ownership",
  () => {
    assert.match(
      sql,
      /v_lease\.lease_token\s*<>\s*p_lease_token/i
    );

    assert.match(
      sql,
      /v_lease\.expires_at\s*<=\s*v_now/i
    );

    assert.match(
      sql,
      /v_now\s*:=\s*clock_timestamp\s*\(\s*\)/i
    );
  }
);

test(
  "Q13e5a proves the exact persisted assembly member identity",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assembly_members\s+as\s+member/i
    );

    assert.match(
      sql,
      /member\.organization_id\s*=\s*p_organization_id/i
    );

    assert.match(
      sql,
      /member\.assembly_id\s*=\s*p_assembly_id/i
    );

    assert.match(
      sql,
      /member\.evidence_id\s*=\s*p_evidence_id/i
    );

    assert.match(
      sql,
      /member\.evidence_integrity_fingerprint\s*=\s*p_integrity_fingerprint/i
    );

    assert.match(
      sql,
      /for\s+key\s+share/i
    );
  }
);

test(
  "Q13e5a mutates every canonical assessment field",
  () => {
    for (
      const field of [
        "trust_state",
        "operational_eligible",
        "crowd_eligible",
        "training_eligible",
        "validation_eligible",
        "assessment_policy_version",
        "assessment_reason",
        "assessed_at",
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          `${field}\\s*=`,
          "i"
        )
      );
    }
  }
);

test(
  "Q13e5a updates only the exact immutable evidence identity",
  () => {
    assert.match(
      sql,
      /update\s+public\.hspp_evidence\s+as\s+evidence/i
    );

    assert.match(
      sql,
      /evidence\.organization_id\s*=\s*p_organization_id/i
    );

    assert.match(
      sql,
      /evidence\.id\s*=\s*p_evidence_id/i
    );

    assert.match(
      sql,
      /evidence\.integrity_fingerprint\s*=\s*p_integrity_fingerprint/i
    );
  }
);

test(
  "Q13e5a rechecks expiry inside the locked transaction and fails closed",
  () => {
    const clockChecks =
      sql.match(
        /clock_timestamp\s*\(\s*\)/gi
      ) ?? [];

    assert.ok(
      clockChecks.length >= 3
    );

    assert.match(
      sql,
      /expired before fenced assessment transaction completed/i
    );
  }
);

test(
  "Q13e5a never mutates execution lease ownership",
  () => {
    assert.doesNotMatch(
      sql,
      /update\s+public\.hspp_assembly_assessment_execution_leases/i
    );

    assert.doesNotMatch(
      sql,
      /insert\s+into\s+public\.hspp_assembly_assessment_execution_leases/i
    );

    assert.doesNotMatch(
      sql,
      /delete\s+from\s+public\.hspp_assembly_assessment_execution_leases/i
    );
  }
);

test(
  "Q13e5a remains independent of completion and retry-identity persistence",
  () => {
    assert.doesNotMatch(
      sql,
      /hspp_assembly_assessment_completions/i
    );

    assert.doesNotMatch(
      sql,
      /hspp_assembly_assessment_retry_identities/i
    );
  }
);

test(
  "Q13e5a is executable only by service_role",
  () => {
    assert.match(
      sql,
      /revoke\s+all[\s\S]*from\s+public,\s*anon,\s*authenticated,\s*service_role/i
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*to\s+service_role/i
    );

    assert.doesNotMatch(
      sql,
      /grant\s+execute[\s\S]*to\s+authenticated/i
    );

    assert.doesNotMatch(
      sql,
      /grant\s+execute[\s\S]*to\s+anon/i
    );
  }
);
