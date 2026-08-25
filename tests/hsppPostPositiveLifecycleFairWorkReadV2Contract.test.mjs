import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const migrationUrl =
  new URL(
    "../supabase/migrations/20260825035000_read_hspp_post_positive_lifecycle_fair_work_items_v2.sql",
    import.meta.url,
  );


const readerUrl =
  new URL(
    "../lib/hspp/readHsppPostPositiveLifecycleFairWorkItemsV2.ts",
    import.meta.url,
  );


const migrationBuffer =
  fs.readFileSync(
    migrationUrl,
  );


const migration =
  migrationBuffer.toString(
    "utf8",
  );


const reader =
  fs.readFileSync(
    readerUrl,
    "utf8",
  );


test(
  "V2 migration contains no UTF-8 BOM",
  () => {
    assert.notDeepEqual(
      Array.from(
        migrationBuffer.subarray(
          0,
          3,
        ),
      ),
      [
        239,
        187,
        191,
      ],
    );
  },
);


test(
  "V2 uses a new non-overloaded RPC name",
  () => {
    assert.match(
      migration,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_post_positive_lifecycle_fair_work_items_v2\s*\(\s*p_organization_id\s+uuid\s*,\s*p_limit\s+integer/is,
    );


    assert.match(
      reader,
      /read_hspp_post_positive_lifecycle_fair_work_items_v2/,
    );
  },
);


test(
  "V2 preserves canonical current-effective eligibility substrate",
  () => {
    for (
      const table
      of [
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
        migration,
        new RegExp(
          table,
          "i",
        ),
      );
    }
  },
);


test(
  "V2 has no state-specific scheduling lanes",
  () => {
    assert.doesNotMatch(
      migration,
      /cessation_page\s+as\s*\(/i,
    );


    assert.doesNotMatch(
      migration,
      /reevaluation_after_cursor\s+as\s*\(/i,
    );


    assert.doesNotMatch(
      migration,
      /reevaluation_wrap\s+as\s*\(/i,
    );


    assert.doesNotMatch(
      migration,
      /lane_order/i,
    );


    assert.doesNotMatch(
      migration,
      /remaining\s+capacity/i,
    );
  },
);


test(
  "V2 circular keyset applies to the complete eligible set",
  () => {
    assert.match(
      migration,
      /after_cursor\s+as\s*\([\s\S]*?from\s+eligible[\s\S]*?row\s*\(\s*eligible\.positive_assessed_at\s*,\s*eligible\.positive_checkpoint_id\s*\)\s*>\s*row\s*\(\s*v_cursor_positive_assessed_at\s*,\s*v_cursor_positive_checkpoint_id\s*\)/i,
    );


    assert.match(
      migration,
      /wrap_page\s+as\s*\([\s\S]*?from\s+eligible[\s\S]*?row\s*\(\s*eligible\.positive_assessed_at\s*,\s*eligible\.positive_checkpoint_id\s*\)\s*<=\s*row\s*\(\s*v_cursor_positive_assessed_at\s*,\s*v_cursor_positive_checkpoint_id\s*\)/i,
    );


    assert.doesNotMatch(
      migration,
      /where[\s\S]{0,180}?eligible\.unsuitability_checkpoint_id\s+is\s+(?:null|not\s+null)/i,
    );
  },
);


test(
  "V2 derives work state after all-state selection",
  () => {
    assert.match(
      migration,
      /case\s+when\s+selected_page\.unsuitability_checkpoint_id\s+is\s+null\s+then\s+'REEVALUATION_REQUIRED'::text\s+else\s+'CESSATION_REQUIRED'::text\s+end\s+as\s+work_state/is,
    );
  },
);


test(
  "every non-empty V2 page proposes its final selected checkpoint",
  () => {
    assert.match(
      migration,
      /proposed_cursor\s+as\s*\([\s\S]*?from\s+selected_page[\s\S]*?order\s+by\s+selected_page\.page_position\s+desc[\s\S]*?limit\s+1/is,
    );


    assert.match(
      migration,
      /v_cursor_positive_assessed_at\s+as\s+cursor_expected_positive_assessed_at/i,
    );


    assert.match(
      migration,
      /v_cursor_positive_checkpoint_id\s+as\s+cursor_expected_positive_checkpoint_id/i,
    );


    assert.match(
      migration,
      /proposed_cursor\.positive_assessed_at\s+as\s+cursor_proposed_positive_assessed_at/i,
    );


    assert.match(
      migration,
      /proposed_cursor\.positive_checkpoint_id\s+as\s+cursor_proposed_positive_checkpoint_id/i,
    );


    assert.doesNotMatch(
      migration,
      /when\s+proposed_cursor\.positive_checkpoint_id\s+is\s+null\s+then\s+null/i,
    );
  },
);


test(
  "V2 remains stable service-role-only and read-only",
  () => {
    assert.match(
      migration,
      /language\s+plpgsql[\s\S]*?stable[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public/i,
    );


    assert.match(
      migration,
      /grant\s+execute\s+on\s+function[\s\S]*?read_hspp_post_positive_lifecycle_fair_work_items_v2[\s\S]*?to\s+service_role/i,
    );


    assert.doesNotMatch(
      migration,
      /insert\s+into\s+public\./i,
    );


    assert.doesNotMatch(
      migration,
      /update\s+public\./i,
    );


    assert.doesNotMatch(
      migration,
      /delete\s+from\s+public\./i,
    );
  },
);


test(
  "V2 reader owns one RPC and no lifecycle mutation",
  () => {
    const rpcCalls =
      reader.match(
        /\.rpc\s*\(/g,
      ) || [];


    assert.equal(
      rpcCalls.length,
      1,
    );


    assert.doesNotMatch(
      reader,
      /\.from\s*\(/,
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
  },
);


test(
  "V2 reader validates cursor against final selected item not reevaluation lane",
  () => {
    assert.match(
      reader,
      /const\s+finalWorkItem\s*=/,
    );


    assert.match(
      reader,
      /finalWorkItem\.positiveCheckpointId[\s\S]*?cursorAdvance\.proposedCursor\.positiveCheckpointId/,
    );


    assert.match(
      reader,
      /final selected work item/,
    );


    assert.doesNotMatch(
      reader,
      /reevaluationWorkItems/,
    );


    assert.doesNotMatch(
      reader,
      /lastReevaluationWorkItem/,
    );
  },
);


test(
  "V2 reader preserves exact PostgreSQL cursor timestamp text",
  () => {
    assert.match(
      reader,
      /function\s+requireExactFairCursorTimestamp[\s\S]*?return\s+normalized;/i,
    );


    assert.doesNotMatch(
      reader,
      /cursorAdvance[\s\S]{0,300}?toISOString\s*\(/i,
    );
  },
);
