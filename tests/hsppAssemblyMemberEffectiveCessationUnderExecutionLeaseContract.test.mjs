import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const repoRoot =
  path.resolve(
    here,
    "..",
  );

const migrationPath =
  path.join(
    repoRoot,
    "supabase",
    "migrations",
    "20260823160700_persist_hspp_assembly_member_effective_cessation_under_lease.sql",
  );

const wrapperPath =
  path.join(
    repoRoot,
    "lib",
    "hspp",
    "persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease.ts",
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

test(
  "Q14ac exposes one four-identity lease-fenced RPC",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_assembly_member_effective_cessation_under_lease\s*\(\s*p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*,\s*p_lease_token\s+uuid\s*,\s*p_unsuitability_checkpoint_id\s+uuid\s*\)/i,
    );

    for (const forbidden of [
      /\bp_evidence_id\b/i,
      /\bp_integrity_fingerprint\b/i,
      /\bp_historical_membership_id\b/i,
      /\bp_ceased_at\b/i,
      /\bp_decided_at\b/i,
      /\bp_observed_at\b/i,
    ]) {
      assert.doesNotMatch(
        sql,
        forbidden,
      );
    }
  },
);

test(
  "Q14ac follows canonical assembly-before-lease lock ordering",
  () => {
    const assemblyPosition =
      sql.indexOf(
        "public.hspp_evidence_assemblies as assembly",
      );

    const leasePosition =
      sql.indexOf(
        "public.hspp_assembly_assessment_execution_leases as lease",
      );

    assert.ok(
      assemblyPosition >= 0,
    );

    assert.ok(
      leasePosition > assemblyPosition,
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
  "Q14ac requires exact active lease ownership and rechecks bounded expiry",
  () => {
    assert.match(
      sql,
      /v_lease\.lease_token\s*<>\s*p_lease_token/i,
    );

    assert.match(
      sql,
      /v_lease\.expires_at\s*<=\s*v_now/i,
    );

    const expiryRechecks =
      sql.match(
        /v_lease\.expires_at\s*<=\s*clock_timestamp\s*\(\s*\)/gi,
      ) || [];

    assert.ok(
      expiryRechecks.length >= 3,
    );
  },
);

test(
  "Q14ac resolves canonical Q14v authority and does not accept derived member identity",
  () => {
    assert.match(
      sql,
      /public\.hspp_assembly_member_unsuitability_checkpoints\s+as\s+checkpoint[\s\S]*?checkpoint\.id\s*=\s*p_unsuitability_checkpoint_id[\s\S]*?for\s+key\s+share/i,
    );

    assert.match(
      sql,
      /v_checkpoint\.organization_id\s*<>\s*p_organization_id[\s\S]*?v_checkpoint\.assembly_id\s*<>\s*p_assembly_id/i,
    );

    assert.match(
      sql,
      /hspp-assembly-member-unsuitability-checkpoint-v1/i,
    );

    assert.match(
      sql,
      /hspp-post-positive-member-unsuitability-v1/i,
    );

    assert.match(
      sql,
      /POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/i,
    );

    assert.match(
      sql,
      /public\.hspp_evidence_assembly_members\s+as\s+membership[\s\S]*?membership\.evidence_id\s*=\s*v_checkpoint\.evidence_id[\s\S]*?membership\.evidence_integrity_fingerprint\s*=\s*v_checkpoint\.integrity_fingerprint[\s\S]*?for\s+key\s+share/i,
    );
  },
);

test(
  "Q14ac recovers exact immutable cessation before attempting a new insert",
  () => {
    const existingPosition =
      sql.indexOf(
        "public.hspp_assembly_member_effective_cessations\n      as cessation",
      );

    const insertPosition =
      sql.indexOf(
        "insert into\n    public.hspp_assembly_member_effective_cessations",
      );

    assert.ok(
      existingPosition >= 0,
    );

    assert.ok(
      insertPosition > existingPosition,
    );

    assert.match(
      sql,
      /cessation\.unsuitability_checkpoint_id\s*=\s*p_unsuitability_checkpoint_id[\s\S]*?for\s+key\s+share/i,
    );

    assert.match(
      sql,
      /Conflicting HSPP effective-membership cessation retry/i,
    );
  },
);

test(
  "Q14ac delegates NEW leaf/no-successor enforcement to Q14ab and inserts only checkpoint identity",
  () => {
    assert.match(
      sql,
      /insert\s+into\s+public\.hspp_assembly_member_effective_cessations\s*\(\s*unsuitability_checkpoint_id\s*\)\s*values\s*\(\s*p_unsuitability_checkpoint_id\s*\)/i,
    );

    assert.doesNotMatch(
      sql,
      /\bhspp_evidence_assembly_reconstructions\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bparent_assembly_id\b/i,
    );
  },
);

test(
  "Q14ac independently validates exact Q14ab derived identity",
  () => {
    for (const pattern of [
      /v_cessation\.organization_id\s*<>\s*v_checkpoint\.organization_id/i,
      /v_cessation\.assembly_id\s*<>\s*v_checkpoint\.assembly_id/i,
      /v_cessation\.evidence_id\s*<>\s*v_checkpoint\.evidence_id/i,
      /v_cessation\.integrity_fingerprint\s*<>\s*v_checkpoint\.integrity_fingerprint/i,
      /v_cessation\.historical_membership_id\s*<>\s*v_membership\.id/i,
      /v_cessation\.unsuitability_checkpoint_id\s*<>\s*v_checkpoint\.id/i,
      /v_cessation\.ceased_at\s*<>\s*v_checkpoint\.decided_at/i,
      /hspp-assembly-member-effective-cessation-v1/i,
      /hspp-post-positive-effective-membership-cessation-v1/i,
      /POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP/i,
    ]) {
      assert.match(
        sql,
        pattern,
      );
    }
  },
);

test(
  "Q14ac RPC is SECURITY DEFINER with fixed search_path and service-role-only execute",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?on\s+function\s+public\.persist_hspp_assembly_member_effective_cessation_under_lease[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?on\s+function\s+public\.persist_hspp_assembly_member_effective_cessation_under_lease[\s\S]*?to\s+service_role/i,
    );
  },
);

test(
  "Q14ac wrapper carries only scope lease and Q14v checkpoint identity",
  () => {
    const inputTypeMatch =
      wrapper.match(
        /export\s+type\s+PersistHsppAssemblyMemberEffectiveCessationUnderExecutionLeaseInput\s*=\s*\{[\s\S]*?^\};/im,
      );

    assert.ok(
      inputTypeMatch,
      "Q14ac input type must exist.",
    );

    const inputType =
      inputTypeMatch[0];

    for (const pattern of [
      /supabase:\s*any/i,
      /organizationId:\s*string/i,
      /assemblyId:\s*string/i,
      /leaseToken:\s*string/i,
      /unsuitabilityCheckpointId:\s*string/i,
    ]) {
      assert.match(
        inputType,
        pattern,
      );
    }

    for (const forbidden of [
      /\bevidenceId\s*:/i,
      /\bintegrityFingerprint\s*:/i,
      /\bhistoricalMembershipId\s*:/i,
      /\bcessationId\s*:/i,
      /\bceasedAt\s*:/i,
      /\bcreatedAt\s*:/i,
      /\bcessationVersion\s*:/i,
      /\bcessationPolicyVersion\s*:/i,
      /\bcessationReason\s*:/i,
    ]) {
      assert.doesNotMatch(
        inputType,
        forbidden,
      );
    }

    assert.match(
      wrapper,
      /\.rpc\s*\(\s*HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_RPC/i,
    );

    for (const pattern of [
      /p_organization_id:\s*normalizedOrganizationId/,
      /p_assembly_id:\s*normalizedAssemblyId/,
      /p_lease_token:\s*normalizedLeaseToken/,
      /p_unsuitability_checkpoint_id:\s*normalizedUnsuitabilityCheckpointId/,
    ]) {
      assert.match(
        wrapper,
        pattern,
      );
    }

    for (const forbiddenRpcInput of [
      /\bp_evidence_id\s*:/i,
      /\bp_integrity_fingerprint\s*:/i,
      /\bp_historical_membership_id\s*:/i,
      /\bp_ceased_at\s*:/i,
      /\bp_observed_at\s*:/i,
      /\bp_decided_at\s*:/i,
    ]) {
      assert.doesNotMatch(
        wrapper,
        forbiddenRpcInput,
      );
    }
  },
);
test(
  "Q14ac wrapper follows Q14x RPC error and result-validation convention",
  () => {
    assert.match(
      wrapper,
      /\.maybeSingle\s*\(\s*\)/,
    );

    assert.match(
      wrapper,
      /if\s*\(\s*error\s*\)\s*\{\s*throw\s+error/i,
    );

    assert.match(
      wrapper,
      /if\s*\(\s*!data\s*\)/i,
    );

    assert.match(
      wrapper,
      /conflicting persistence identity/i,
    );

    assert.match(
      wrapper,
      /ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_PERSISTED/i,
    );
  },
);

test(
  "Q14ac remains a dormant writer and does not collapse downstream lifecycle stages",
  () => {
    for (const forbidden of [
      /\breadHsppReservoirCandidates\b/i,
      /\bevaluateHsppReservoirEligibility\b/i,
      /\bpersist_hspp_evidence_assembly_reconstruction\b/i,
      /\bselect replacement\b/i,
      /\bwhole-composite validation\b/i,
    ]) {
      assert.doesNotMatch(
        wrapper,
        forbidden,
      );
    }

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
      /\bupdate\s+public\.hspp_evidence\b/i,
    );
  },
);