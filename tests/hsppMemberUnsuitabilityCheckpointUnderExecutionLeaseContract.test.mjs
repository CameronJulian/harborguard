import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260823140000_persist_hspp_member_unsuitability_checkpoint_under_lease.sql",
  );

const wrapperPath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease.ts",
  );

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const wrapper =
  fs.readFileSync(
    wrapperPath,
    "utf8",
  );

const rpc =
  "persist_hspp_member_unsuitability_checkpoint_under_lease";

test(
  "Q14x creates exactly one deliberately PostgreSQL-safe specialized RPC",
  () => {
    assert.equal(
      (
        sql.match(
          /create\s+or\s+replace\s+function\s+public\.persist_hspp_member_unsuitability_checkpoint_under_lease\s*\(/gi,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      Buffer.byteLength(
        rpc,
        "utf8",
      ),
      56,
    );

    assert.ok(
      Buffer.byteLength(
        rpc,
        "utf8",
      ) <= 63,
    );
  },
);

test(
  "Q14x RPC accepts only the seven controlled caller inputs",
  () => {
    assert.match(
      sql,
      /persist_hspp_member_unsuitability_checkpoint_under_lease\s*\(\s*p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*,\s*p_lease_token\s+uuid\s*,\s*p_evidence_id\s+uuid\s*,\s*p_integrity_fingerprint\s+text\s*,\s*p_observed_at\s+timestamptz\s*,\s*p_decided_at\s+timestamptz\s*\)/i,
    );

    assert.doesNotMatch(
      sql,
      /\bp_prior_positive_checkpoint_id\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bp_unsuitability_reason\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bp_unsuitability_policy_version\b/i,
    );
  },
);

test(
  "Q14x is service-role-only SECURITY DEFINER with fixed search_path",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*persist_hspp_member_unsuitability_checkpoint_under_lease[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*persist_hspp_member_unsuitability_checkpoint_under_lease[\s\S]*to\s+service_role/i,
    );
  },
);

test(
  "Q14x preserves canonical assembly-before-lease lock ordering",
  () => {
    const assemblyLock =
      sql.indexOf(
        "public.hspp_evidence_assemblies as assembly",
      );

    const leaseLock =
      sql.indexOf(
        "public.hspp_assembly_assessment_execution_leases as lease",
      );

    assert.ok(
      assemblyLock >= 0,
    );

    assert.ok(
      leaseLock > assemblyLock,
    );

    assert.match(
      sql,
      /public\.hspp_evidence_assemblies\s+as\s+assembly[\s\S]*?assembly\.organization_id\s*=\s*p_organization_id[\s\S]*?assembly\.id\s*=\s*p_assembly_id[\s\S]*?for\s+key\s+share/i,
    );

    assert.match(
      sql,
      /public\.hspp_assembly_assessment_execution_leases\s+as\s+lease[\s\S]*?lease\.organization_id\s*=\s*p_organization_id[\s\S]*?lease\.assembly_id\s*=\s*p_assembly_id[\s\S]*?for\s+update/i,
    );
  },
);

test(
  "Q14x verifies exact live lease ownership and expiry",
  () => {
    assert.match(
      sql,
      /v_lease\.lease_token\s*<>\s*p_lease_token/i,
    );

    assert.match(
      sql,
      /v_lease\.expires_at\s*<=\s*v_now/i,
    );

    assert.ok(
      (
        sql.match(
          /v_lease\.expires_at\s*<=\s*clock_timestamp\s*\(\s*\)/gi,
        ) ?? []
      ).length >= 2,
    );
  },
);

test(
  "Q14x derives and binds the unique prior Q14p positive checkpoint internally",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_assembly_positive_assessment_checkpoints\s+as\s+positive[\s\S]*?positive\.organization_id\s*=\s*p_organization_id[\s\S]*?positive\.assembly_id\s*=\s*p_assembly_id/i,
    );

    assert.match(
      sql,
      /v_positive\.evidence_id\s*<>\s*p_evidence_id/i,
    );

    assert.match(
      sql,
      /v_positive\.integrity_fingerprint\s*<>\s*p_integrity_fingerprint/i,
    );

    assert.match(
      sql,
      /p_observed_at\s*<\s*v_positive\.assessed_at/i,
    );
  },
);

test(
  "Q14x inserts only the deterministic immutable Q14v tuple",
  () => {
    assert.match(
      sql,
      /insert\s+into\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
    );

    assert.match(
      sql,
      /v_positive\.id[\s\S]*'hspp-assembly-member-unsuitability-checkpoint-v1'[\s\S]*'hspp-post-positive-member-unsuitability-v1'[\s\S]*'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'[\s\S]*p_observed_at[\s\S]*p_decided_at/i,
    );
  },
);

test(
  "Q14x exact retry recovers only an identical immutable checkpoint",
  () => {
    assert.match(
      sql,
      /on\s+conflict\s+do\s+nothing/i,
    );

    assert.match(
      sql,
      /v_checkpoint\.prior_positive_checkpoint_id\s*<>\s*v_positive\.id/i,
    );

    assert.match(
      sql,
      /v_checkpoint\.observed_at\s*<>\s*p_observed_at/i,
    );

    assert.match(
      sql,
      /v_checkpoint\.decided_at\s*<>\s*p_decided_at/i,
    );

    assert.match(
      sql,
      /Conflicting post-positive HSPP member-unsuitability checkpoint retry/i,
    );
  },
);

test(
  "Q14x RPC grants no downstream lifecycle mutation authority",
  () => {
    assert.doesNotMatch(
      sql,
      /\bapply_hspp_assessment_decision_under_execution_lease\s*\(/i,
    );

    assert.doesNotMatch(
      sql,
      /\bupdate\s+public\.hspp_evidence\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bupdate\s+public\.hspp_evidence_assembly_members\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bdelete\s+from\s+public\.hspp_evidence_assembly_members\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bupdate\s+public\.hspp_assembly_positive_assessment_checkpoints\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bdelete\s+from\s+public\.hspp_assembly_positive_assessment_checkpoints\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\binsert\s+into\s+public\.hspp_evidence_assembly_reconstructions\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\binsert\s+into\s+public\.hspp_evidence_assembly_reconstruction_changes\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\b(?:insert\s+into|update|delete\s+from)\s+public\.[a-z0-9_]*reservoir[a-z0-9_]*/i,
    );
  },
);

test(
  "Q14x wrapper uses the exact stable RPC identifier",
  () => {
    assert.match(
      wrapper,
      /HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_RPC\s*=\s*"persist_hspp_member_unsuitability_checkpoint_under_lease"\s+as\s+const/,
    );

    assert.equal(
      Buffer.byteLength(
        rpc,
        "utf8",
      ),
      56,
    );
  },
);

test(
  "Q14x wrapper passes exact normalized caller identity and times",
  () => {
    for (const pattern of [
      /p_organization_id:\s*normalizedOrganizationId/,
      /p_assembly_id:\s*normalizedAssemblyId/,
      /p_lease_token:\s*normalizedLeaseToken/,
      /p_evidence_id:\s*normalizedEvidenceId/,
      /p_integrity_fingerprint:\s*normalizedFingerprint/,
      /p_observed_at:\s*normalizedObservedAt/,
      /p_decided_at:\s*normalizedDecidedAt/,
    ]) {
      assert.match(
        wrapper,
        pattern,
      );
    }
  },
);

test(
  "Q14x wrapper validates the exact returned immutable Q14v contract",
  () => {
    assert.match(
      wrapper,
      /"hspp-assembly-member-unsuitability-checkpoint-v1"/,
    );

    assert.match(
      wrapper,
      /"hspp-post-positive-member-unsuitability-v1"/,
    );

    assert.match(
      wrapper,
      /"POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION"/,
    );

    assert.match(
      wrapper,
      /row\.prior_positive_checkpoint_id/,
    );

    assert.match(
      wrapper,
      /row\.checkpoint_id/,
    );

    assert.match(
      wrapper,
      /returnedObservedAt\s*!==\s*normalizedObservedAt/,
    );

    assert.match(
      wrapper,
      /returnedDecidedAt\s*!==\s*normalizedDecidedAt/,
    );
  },
);

test(
  "Q14x wrapper neither evaluates unsuitability nor performs direct table DML",
  () => {
    assert.doesNotMatch(
      wrapper,
      /\.from\s*\(\s*["']hspp_assembly_member_unsuitability_checkpoints["']\s*\)/i,
    );

    assert.doesNotMatch(
      wrapper,
      /applyHsppAssessmentDecision/i,
    );

    assert.doesNotMatch(
      wrapper,
      /persistHsppDeniedCorroboratedMemberAssessment/i,
    );
  },
);