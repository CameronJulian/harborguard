import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const migration =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260824195500_read_hspp_post_positive_lifecycle_fair_work_items.sql",
      import.meta.url,
    ),
    "utf8",
  );


const reader =
  fs.readFileSync(
    new URL(
      "../lib/hspp/readHsppPostPositiveLifecycleFairWorkItems.ts",
      import.meta.url,
    ),
    "utf8",
  );


const sql =
  migration.replace(
    /--.*$/gm,
    "",
  );


test(
  "fair discovery migration contains no UTF-8 BOM",
  () => {
    assert.notEqual(
      migration.charCodeAt(0),
      0xfeff,
    );
  },
);


test(
  "fair discovery uses a new non-overloaded RPC name",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_post_positive_lifecycle_fair_work_items\s*\(\s*p_organization_id\s+uuid\s*,\s*p_limit\s+integer\s*\)/is,
    );

    assert.doesNotMatch(
      sql,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_post_positive_lifecycle_work_items\s*\(/i,
    );
  },
);


test(
  "fair discovery preserves the canonical current-effective eligibility tables",
  () => {
    for (
      const relation of
      [
        "hspp_assembly_positive_assessment_checkpoints",
        "hspp_evidence_assemblies",
        "hspp_evidence_assembly_members",
        "hspp_assembly_assessment_completions",
        "hspp_assembly_member_unsuitability_checkpoints",
        "hspp_evidence_assembly_reconstructions",
        "hspp_assembly_member_effective_cessations",
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          relation,
          "i",
        ),
      );
    }
  },
);


test(
  "fair discovery reads the deployed organization scan-state cursor",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_post_positive_lifecycle_scan_states/i,
    );

    assert.match(
      sql,
      /cursor_positive_assessed_at/i,
    );

    assert.match(
      sql,
      /cursor_positive_checkpoint_id/i,
    );

    assert.match(
      sql,
      /hspp-post-positive-lifecycle-scan-state-v1/i,
    );
  },
);


test(
  "cessation lane is selected before reevaluation lane",
  () => {
    assert.match(
      sql,
      /cessation_page\s+as\s*\(/i,
    );

    assert.match(
      sql,
      /reevaluation_after_cursor\s+as\s*\(/i,
    );

    assert.match(
      sql,
      /'CESSATION_REQUIRED'::text[\s\S]*?0::integer\s+as\s+lane_order/i,
    );

    assert.match(
      sql,
      /'REEVALUATION_REQUIRED'::text[\s\S]*?1::integer\s+as\s+lane_order/i,
    );

    assert.match(
      sql,
      /order\s+by\s+selected_work\.lane_order\s+asc[\s\S]*?selected_work\.lane_position\s+asc/i,
    );
  },
);


test(
  "reevaluation uses circular positive-assessed-at and positive-checkpoint keyset",
  () => {
    assert.match(
      sql,
      /row\s*\(\s*eligible\.positive_assessed_at\s*,\s*eligible\.positive_checkpoint_id\s*\)\s*>\s*row\s*\(\s*v_cursor_positive_assessed_at\s*,\s*v_cursor_positive_checkpoint_id\s*\)/is,
    );

    assert.match(
      sql,
      /reevaluation_wrap\s+as\s*\(/i,
    );

    assert.match(
      sql,
      /row\s*\(\s*eligible\.positive_assessed_at\s*,\s*eligible\.positive_checkpoint_id\s*\)\s*<=\s*row\s*\(\s*v_cursor_positive_assessed_at\s*,\s*v_cursor_positive_checkpoint_id\s*\)/is,
    );
  },
);


test(
  "bounded cessation count reduces reevaluation capacity",
  () => {
    assert.match(
      sql,
      /p_limit\s*-\s*count\s*\(\s*\*\s*\)::integer/i,
    );

    assert.match(
      sql,
      /limit\s+p_limit/i,
    );

    assert.match(
      sql,
      /limit\s*\(\s*select\s+remaining\s+from\s+capacity\s*\)/is,
    );
  },
);


test(
  "proposed cursor comes from the last selected reevaluation position",
  () => {
    assert.match(
      sql,
      /proposed_cursor\s+as\s*\([\s\S]*?from\s+reevaluation_page[\s\S]*?order\s+by\s+reevaluation_page\.lane_position\s+desc[\s\S]*?limit\s+1/is,
    );

    assert.match(
      sql,
      /cursor_proposed_positive_assessed_at/i,
    );

    assert.match(
      sql,
      /cursor_proposed_positive_checkpoint_id/i,
    );
  },
);


test(
  "cessation-only page exposes no cursor advance",
  () => {
    assert.match(
      sql,
      /when\s+proposed_cursor\.positive_checkpoint_id\s+is\s+null\s+then\s+null/is,
    );
  },
);


test(
  "fair discovery is stable service-role-only and read-only",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql\s+stable\s+security\s+definer\s+set\s+search_path\s*=\s*public/is,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?read_hspp_post_positive_lifecycle_fair_work_items[\s\S]*?to\s+service_role/is,
    );

    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\./i,
    );

    assert.doesNotMatch(
      sql,
      /compare_and_swap_hspp_post_positive_lifecycle_scan_state/i,
    );
  },
);


test(
  "fair reader owns one new RPC and no lifecycle mutation",
  () => {
    assert.match(
      reader,
      /read_hspp_post_positive_lifecycle_fair_work_items/,
    );

    assert.doesNotMatch(
      reader,
      /"read_hspp_post_positive_lifecycle_work_items"/,
    );

    assert.equal(
      (
        reader.match(
          /\bawait\s+supabase\.rpc\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    assert.doesNotMatch(
      reader,
      /compareAndSwapHsppPostPositiveLifecycleScanState/,
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
      /runHsppReconstructionActivationCycle/,
    );
  },
);


test(
  "fair reader preserves exact cursor timestamp text",
  () => {
    assert.match(
      reader,
      /function\s+requireExactFairCursorTimestamp/i,
    );

    assert.match(
      reader,
      /return\s+normalized;/i,
    );

    assert.doesNotMatch(
      reader,
      /cursorAdvance[\s\S]{0,300}?toISOString\s*\(/i,
    );
  },
);
