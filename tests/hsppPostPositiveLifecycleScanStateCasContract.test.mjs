import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const migrationUrl =
  new URL(
    "../supabase/migrations/20260824193000_create_hspp_post_positive_lifecycle_scan_state.sql",
    import.meta.url,
  );


const clientUrl =
  new URL(
    "../lib/hspp/compareAndSwapHsppPostPositiveLifecycleScanState.ts",
    import.meta.url,
  );


const runtimeTestUrl =
  new URL(
    "./hsppPostPositiveLifecycleScanStateCas.test.ts",
    import.meta.url,
  );


const migration =
  fs.readFileSync(
    migrationUrl,
    "utf8",
  );


const client =
  fs.readFileSync(
    clientUrl,
    "utf8",
  );


const runtimeTestSource =
  fs.readFileSync(
    runtimeTestUrl,
    "utf8",
  );


function stripSqlComments(
  value,
) {
  return value.replace(
    /--.*$/gm,
    "",
  );
}


function stripTsComments(
  value,
) {
  return value
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /^[ \t]*\/\/.*$/gm,
      "",
    );
}


const sql =
  stripSqlComments(
    migration,
  );


const runtime =
  stripTsComments(
    client,
  );


const hardeningSql =
  readFileSync(
    new URL(
      "../supabase/migrations/20260905134500_harden_hspp_post_positive_lifecycle_scan_state_contention.sql",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "scan-state schema is one organization-scoped non-authoritative state row",
  () => {
    assert.match(
      sql,
      /create\s+table\s+public\.hspp_post_positive_lifecycle_scan_states\s*\(/i,
    );

    assert.match(
      sql,
      /organization_id\s+uuid[\s\S]*?primary\s+key[\s\S]*?references\s+public\.organizations\s*\(\s*id\s*\)[\s\S]*?on\s+delete\s+cascade/i,
    );

    assert.match(
      sql,
      /state_version\s+text[\s\S]*?default\s+'hspp-post-positive-lifecycle-scan-state-v1'/i,
    );
  },
);


test(
  "scan-state schema enforces complete current and previous cursor pairs",
  () => {
    assert.match(
      sql,
      /hspp_post_positive_lifecycle_scan_current_cursor_pair[\s\S]*?cursor_positive_assessed_at\s+is\s+null[\s\S]*?cursor_positive_checkpoint_id\s+is\s+null[\s\S]*?cursor_positive_assessed_at\s+is\s+not\s+null[\s\S]*?cursor_positive_checkpoint_id\s+is\s+not\s+null/i,
    );

    assert.match(
      sql,
      /hspp_post_positive_lifecycle_scan_previous_cursor_pair[\s\S]*?previous_cursor_positive_assessed_at\s+is\s+null[\s\S]*?previous_cursor_positive_checkpoint_id\s+is\s+null[\s\S]*?previous_cursor_positive_assessed_at\s+is\s+not\s+null[\s\S]*?previous_cursor_positive_checkpoint_id\s+is\s+not\s+null/i,
    );
  },
);


test(
  "direct mutation is closed and only service-role read remains",
  () => {
    assert.match(
      sql,
      /enable\s+row\s+level\s+security/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?on\s+table\s+public\.hspp_post_positive_lifecycle_scan_states[\s\S]*?from\s+public[\s\S]*?anon[\s\S]*?authenticated[\s\S]*?service_role/i,
    );

    assert.match(
      sql,
      /grant\s+select[\s\S]*?on\s+table\s+public\.hspp_post_positive_lifecycle_scan_states[\s\S]*?to\s+service_role/i,
    );
  },
);


test(
  "CAS RPC has only organization expected cursor and proposed cursor inputs",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.compare_and_swap_hspp_post_positive_lifecycle_scan_state\s*\(\s*p_organization_id\s+uuid\s*,\s*p_expected_cursor_positive_assessed_at\s+timestamptz\s*,\s*p_expected_cursor_positive_checkpoint_id\s+uuid\s*,\s*p_proposed_cursor_positive_assessed_at\s+timestamptz\s*,\s*p_proposed_cursor_positive_checkpoint_id\s+uuid\s*\)/is,
    );
  },
);


test(
  "CAS RPC is a fixed-search-path service-role-only security-definer boundary",
  () => {
    assert.match(
      sql,
      /language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?on\s+function\s+public\.compare_and_swap_hspp_post_positive_lifecycle_scan_state[\s\S]*?from\s+public[\s\S]*?anon[\s\S]*?authenticated[\s\S]*?service_role/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*?on\s+function\s+public\.compare_and_swap_hspp_post_positive_lifecycle_scan_state[\s\S]*?to\s+service_role/i,
    );
  },
);


test(
  "CAS exposes non-blocking organization-scoped serialization contention",
  () => {
    assert.match(
      hardeningSql,
      /pg_try_advisory_xact_lock\s*\([\s\S]*?harborguard:hspp-post-positive-lifecycle-scan-state:/i,
    );

    assert.match(
      hardeningSql,
      /'CONTENDED'::text[\s\S]*?'hspp-post-positive-lifecycle-scan-state-v1'::text[\s\S]*?p_organization_id[\s\S]*?null::timestamptz[\s\S]*?null::uuid/i,
    );
  },
);


test(
  "CAS serialization is organization scoped and transaction local",
  () => {
    assert.match(
      hardeningSql,
      /pg_try_advisory_xact_lock\s*\([\s\S]*?harborguard:hspp-post-positive-lifecycle-scan-state:/i,
    );

    assert.match(
      hardeningSql,
      /public\.organizations/i,
    );

    assert.match(
      hardeningSql,
      /public\.hspp_post_positive_lifecycle_scan_states[\s\S]*?for\s+update/i,
    );
  },
);


test(
  "expected and proposed cursor identities are verified against immutable positive checkpoints",
  () => {
    assert.ok(
      (
        sql.match(
          /public\.hspp_assembly_positive_assessment_checkpoints/gi,
        ) ?? []
      ).length >= 2,
    );

    assert.match(
      sql,
      /positive\.organization_id\s*=\s*p_organization_id/i,
    );

    assert.match(
      sql,
      /positive\.id\s*=\s*p_expected_cursor_positive_checkpoint_id/i,
    );

    assert.match(
      sql,
      /positive\.id\s*=\s*p_proposed_cursor_positive_checkpoint_id/i,
    );
  },
);


test(
  "CAS distinguishes advancement exact retry no-change and stale state",
  () => {
    for (
      const state of
      [
        "ADVANCED",
        "EXACT_RETRY",
        "NO_CHANGE",
        "STALE",
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          `'${state}'`,
          "i",
        ),
      );
    }

    assert.match(
      sql,
      /previous_cursor_positive_assessed_at[\s\S]*?p_expected_cursor_positive_assessed_at/i,
    );

    assert.match(
      sql,
      /cursor_positive_assessed_at[\s\S]*?p_proposed_cursor_positive_assessed_at/i,
    );
  },
);


test(
  "stale writer returns without a scan-state update",
  () => {
    const staleIndex =
      sql.indexOf(
        "'STALE'::text",
      );

    const updateIndex =
      sql.indexOf(
        "update\n    public.hspp_post_positive_lifecycle_scan_states",
      );

    assert.ok(
      staleIndex >= 0,
    );

    assert.ok(
      updateIndex >
        staleIndex,
    );
  },
);


test(
  "CAS intentionally imposes no monotonic cursor ordering",
  () => {
    assert.doesNotMatch(
      sql,
      /p_proposed_cursor_positive_assessed_at\s*(?:>|>=|<|<=)\s*p_expected_cursor_positive_assessed_at/i,
    );

    assert.doesNotMatch(
      sql,
      /p_proposed_cursor_positive_checkpoint_id\s*(?:>|>=|<|<=)\s*p_expected_cursor_positive_checkpoint_id/i,
    );
  },
);


test(
  "migration mutates no HSPP authority outside its own scan-state table",
  () => {
    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.hspp_assembly_positive_assessment_checkpoints/i,
    );

    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
    );

    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.hspp_assembly_member_effective_cessations/i,
    );

    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.hspp_evidence_assembly_members/i,
    );

    assert.doesNotMatch(
      sql,
      /(?:insert\s+into|update|delete\s+from)\s+public\.hspp_evidence_assembly_reconstructions/i,
    );
  },
);


test(
  "TypeScript client owns exactly one RPC and no table mutation",
  () => {
    assert.match(
      runtime,
      /HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC\s*=\s*"compare_and_swap_hspp_post_positive_lifecycle_scan_state"/,
    );

    assert.equal(
      (
        runtime.match(
          /\bawait\s+supabase\.rpc\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    assert.doesNotMatch(
      runtime,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      runtime,
      /\.(?:insert|update|upsert|delete)\s*\(/,
    );
  },
);


test(
  "TypeScript client passes exact expected and proposed cursor identity",
  () => {
    assert.match(
      runtime,
      /p_expected_cursor_positive_assessed_at:[\s\S]*?normalizedExpectedCursor[\s\S]*?positiveAssessedAt/i,
    );

    assert.match(
      runtime,
      /p_expected_cursor_positive_checkpoint_id:[\s\S]*?normalizedExpectedCursor[\s\S]*?positiveCheckpointId/i,
    );

    assert.match(
      runtime,
      /p_proposed_cursor_positive_assessed_at:[\s\S]*?normalizedProposedCursor[\s\S]*?positiveAssessedAt/i,
    );

    assert.match(
      runtime,
      /p_proposed_cursor_positive_checkpoint_id:[\s\S]*?normalizedProposedCursor[\s\S]*?positiveCheckpointId/i,
    );
  },
);


test(
  "CAS client contains no lifecycle orchestration authority",
  () => {
    for (
      const forbidden of
      [
        "readHsppPostPositiveLifecycleWorkItems",
        "runHsppPostPositiveLifecycleCycle",
        "persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease",
        "persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease",
        "runHsppReservoirReevaluation",
        "runHsppReconstructionActivationCycle",
      ]
    ) {
      assert.doesNotMatch(
        runtime,
        new RegExp(
          forbidden,
        ),
      );
    }
  },
);


test(
  "scan-state migration contains no UTF-8 BOM",
  () => {
    assert.notEqual(
      migration.charCodeAt(0),
      0xfeff,
    );
  },
);



test(
  "TypeScript client preserves PostgreSQL microsecond cursor identity",
  () => {
    assert.match(
      runtime,
      /function\s+requireExactCursorTimestamp[\s\S]*?return\s+normalized;/i,
    );

    assert.match(
      runtime,
      /function\s+normalizeCursor[\s\S]*?positiveAssessedAt:[\s\S]*?requireExactCursorTimestamp\s*\(/i,
    );

    assert.match(
      runtime,
      /function\s+readPersistedCursor[\s\S]*?positiveAssessedAt:[\s\S]*?requireExactCursorTimestamp\s*\(/i,
    );

    assert.match(
      runtimeTestSource,
      /2026-08-23T10:00:00\.123456\+00:00/,
    );

    assert.match(
      runtimeTestSource,
      /2026-08-23T11:00:00\.654321\+00:00/,
    );

    assert.match(
      runtimeTestSource,
      /2026-08-23T12:00:00\.000001\+00:00/,
    );
  },
);
