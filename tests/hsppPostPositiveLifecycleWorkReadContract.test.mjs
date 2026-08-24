import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const migration =
  readFileSync(
    new URL(
      "../supabase/migrations/20260824172500_read_hspp_post_positive_lifecycle_work_items.sql",
      import.meta.url,
    ),
    "utf8",
  );

const reader =
  readFileSync(
    new URL(
      "../lib/hspp/readHsppPostPositiveLifecycleWorkItems.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "post-positive lifecycle work SQL remains bounded and read-only",
  () => {
    assert.match(
      migration,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_post_positive_lifecycle_work_items\s*\(/i,
    );

    assert.match(
      migration,
      /p_limit\s+integer/i,
    );

    assert.match(
      migration,
      /p_limit\s*<\s*1/i,
    );

    assert.match(
      migration,
      /p_limit\s*>\s*100/i,
    );

    assert.match(
      migration,
      /limit\s+p_limit/i,
    );

    assert.match(
      migration,
      /hspp_assembly_positive_assessment_checkpoints/i,
    );

    assert.match(
      migration,
      /hspp_assembly_assessment_completions/i,
    );

    assert.match(
      migration,
      /hspp_evidence_assembly_members/i,
    );

    assert.match(
      migration,
      /hspp_evidence_assembly_reconstructions/i,
    );

    assert.match(
      migration,
      /hspp_assembly_member_effective_cessations/i,
    );

    assert.match(
      migration,
      /hspp_assembly_member_unsuitability_checkpoints/i,
    );

    assert.match(
      migration,
      /REEVALUATION_REQUIRED/i,
    );

    assert.match(
      migration,
      /CESSATION_REQUIRED/i,
    );

    assert.match(
      migration,
      /stable/i,
    );

    assert.match(
      migration,
      /security\s+definer/i,
    );

    assert.match(
      migration,
      /grant\s+execute[\s\S]*to\s+service_role/i,
    );
  },
);

test(
  "application reader owns only the new bounded discovery RPC",
  () => {
    assert.match(
      reader,
      /read_hspp_post_positive_lifecycle_work_items/,
    );

    assert.match(
      reader,
      /\.rpc\(\s*HSPP_POST_POSITIVE_LIFECYCLE_WORK_RPC/,
    );

    assert.doesNotMatch(
      reader,
      /persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease/,
    );

    assert.doesNotMatch(
      reader,
      /persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease/,
    );

    assert.doesNotMatch(
      reader,
      /runHsppReservoirReevaluation/,
    );

    assert.doesNotMatch(
      reader,
      /readHsppReservoirCandidates/,
    );

    assert.doesNotMatch(
      reader,
      /acquireHsppAssemblyAssessmentExecutionLease/,
    );
  },
);
