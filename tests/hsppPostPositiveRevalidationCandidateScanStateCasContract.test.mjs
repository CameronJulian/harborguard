import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";


const ROOT =
  process.cwd();


const MIGRATION =
  "supabase/migrations/20260825160500_create_hspp_post_positive_revalidation_candidate_scan_state.sql";

const RUNTIME =
  "lib/hspp/compareAndSwapHsppPostPositiveRevalidationCandidateScanState.ts";


function read(
  relativePath,
) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath,
    ),
    "utf8",
  );
}


function readBytes(
  relativePath,
) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath,
    ),
  );
}


const sql =
  read(
    MIGRATION,
  );

const runtime =
  read(
    RUNTIME,
  );


test(
  "new candidate scan files are UTF-8 without BOM",
  () => {
    for (
      const relativePath of
      [
        MIGRATION,
        RUNTIME,
      ]
    ) {
      const bytes =
        readBytes(
          relativePath,
        );

      assert.equal(
        (
          bytes.length >= 3 &&
          bytes[0] === 0xef &&
          bytes[1] === 0xbb &&
          bytes[2] === 0xbf
        ),
        false,
      );
    }
  },
);


test(
  "scan state is scoped to immutable Q14p and exact historical C identity",
  () => {
    assert.match(
      sql,
      /positive_checkpoint_id\s+uuid[\s\S]*?primary\s+key[\s\S]*?references\s+public\.hspp_assembly_positive_assessment_checkpoints\s*\(\s*id\s*\)[\s\S]*?on\s+delete\s+restrict/i,
    );

    assert.match(
      sql,
      /foreign\s+key\s*\(\s*organization_id\s*,\s*subject_evidence_id\s*,\s*subject_integrity_fingerprint\s*\)[\s\S]*?references\s+public\.hspp_evidence\s*\(\s*organization_id\s*,\s*id\s*,\s*integrity_fingerprint\s*\)[\s\S]*?on\s+delete\s+restrict/i,
    );

    assert.match(
      sql,
      /select[\s\S]*?positive\.organization_id[\s\S]*?positive\.evidence_id[\s\S]*?positive\.integrity_fingerprint[\s\S]*?positive\.assessed_at[\s\S]*?from[\s\S]*?hspp_assembly_positive_assessment_checkpoints/i,
    );
  },
);


test(
  "current and previous candidate cursor pairs are complete and delete-restricted",
  () => {
    assert.match(
      sql,
      /hspp_post_positive_revalidation_candidate_scan_current_cursor_pair[\s\S]*?cursor_observed_at\s+is\s+null[\s\S]*?cursor_evidence_id\s+is\s+null[\s\S]*?cursor_observed_at\s+is\s+not\s+null[\s\S]*?cursor_evidence_id\s+is\s+not\s+null/i,
    );

    assert.match(
      sql,
      /hspp_post_positive_revalidation_candidate_scan_previous_cursor_pair[\s\S]*?previous_cursor_observed_at\s+is\s+null[\s\S]*?previous_cursor_evidence_id\s+is\s+null[\s\S]*?previous_cursor_observed_at\s+is\s+not\s+null[\s\S]*?previous_cursor_evidence_id\s+is\s+not\s+null/i,
    );

    assert.match(
      sql,
      /foreign\s+key\s*\(\s*cursor_evidence_id\s*\)[\s\S]*?references\s+public\.hspp_evidence\s*\(\s*id\s*\)[\s\S]*?on\s+delete\s+restrict/i,
    );

    assert.match(
      sql,
      /foreign\s+key\s*\(\s*previous_cursor_evidence_id\s*\)[\s\S]*?references\s+public\.hspp_evidence\s*\(\s*id\s*\)[\s\S]*?on\s+delete\s+restrict/i,
    );
  },
);


test(
  "CAS serializes one Q14p scope and preserves four-state retry semantics",
  () => {
    assert.match(
      sql,
      /security\s+definer[\s\S]*?set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /pg_advisory_xact_lock\s*\([\s\S]*?harborguard:hspp-post-positive-revalidation-candidate-scan-state:[\s\S]*?p_positive_checkpoint_id/i,
    );

    assert.match(
      sql,
      /for\s+key\s+share/i,
    );

    assert.match(
      sql,
      /for\s+update/i,
    );

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
          "'" + state + "'",
        ),
      );
    }

    assert.match(
      sql,
      /previous_cursor_observed_at\s*=\s*v_state\.cursor_observed_at[\s\S]*?previous_cursor_evidence_id\s*=\s*v_state\.cursor_evidence_id/i,
    );

    assert.doesNotMatch(
      sql,
      /p_proposed_cursor_observed_at\s*(?:>|>=|<|<=)\s*p_expected_cursor_observed_at/i,
    );
  },
);


test(
  "cursor candidates are structurally constrained but semantic qualification stays outside CAS",
  () => {
    for (
      const required of
      [
        "candidate.source_class",
        "'derived'",
        "candidate.source_provider",
        "'harborguard'",
        "candidate.source_stream",
        "'post-positive-revalidation'",
        "candidate.payload_schema_version",
        "'hspp-post-positive-revalidation-v1'",
        "candidate.parent_evidence_id",
        "candidate.parent_integrity_fingerprint",
        "candidate.derivation_type",
        "'post_positive_revalidation'",
        "candidate.derivation_version",
      ]
    ) {
      assert.match(
        sql,
        new RegExp(
          required.replace(
            /[.*+?^$(){}|[\]\\]/g,
            "\\$&",
          ),
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      sql,
      /normalized_payload/i,
    );

    assert.doesNotMatch(
      sql,
      /QUALIFYING_UNSUITABILITY_BASIS|R1_UNSUITABILITY_BASIS_CONFIRMED/i,
    );
  },
);


test(
  "direct mutation and CAS execution remain dormant",
  () => {
    assert.match(
      sql,
      /enable\s+row\s+level\s+security/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?on\s+table\s+public\.hspp_post_positive_revalidation_candidate_scan_states[\s\S]*?from\s+public[\s\S]*?anon[\s\S]*?authenticated[\s\S]*?service_role/i,
    );

    assert.match(
      sql,
      /grant\s+select[\s\S]*?on\s+table\s+public\.hspp_post_positive_revalidation_candidate_scan_states[\s\S]*?to\s+service_role/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*?on\s+function\s+public\.compare_and_swap_hspp_revalidation_candidate_scan_state[\s\S]*?from\s+public[\s\S]*?anon[\s\S]*?authenticated[\s\S]*?service_role/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+execute[\s\S]*?compare_and_swap_hspp_revalidation_candidate_scan_state[\s\S]*?service_role/i,
    );
  },
);


test(
  "TypeScript wrapper maps only caller-owned cursor identity into CAS RPC",
  () => {
    assert.match(
      runtime,
      /compare_and_swap_hspp_revalidation_candidate_scan_state/,
    );

    assert.match(
      runtime,
      /p_positive_checkpoint_id:\s*positiveCheckpointId/,
    );

    assert.match(
      runtime,
      /p_expected_cursor_observed_at:[\s\S]*?expectedCursor\?\.observedAt/,
    );

    assert.match(
      runtime,
      /p_expected_cursor_evidence_id:[\s\S]*?expectedCursor\?\.evidenceId/,
    );

    assert.match(
      runtime,
      /p_proposed_cursor_observed_at:[\s\S]*?proposedCursor\.observedAt/,
    );

    assert.match(
      runtime,
      /p_proposed_cursor_evidence_id:[\s\S]*?proposedCursor\.evidenceId/,
    );

    assert.doesNotMatch(
      runtime,
      /Date\.now|randomUUID|crypto\.randomUUID/,
    );
  },
);


test(
  "existing production reader selection lifecycle and cron remain unwired",
  () => {
    const activationSurface =
      [
        "lib/hspp/readHsppPostPositiveRevalidationCandidates.ts",
        "lib/hspp/runHsppPostPositiveRevalidationSelection.ts",
        "lib/hspp/runHsppPostPositiveLifecycleCycle.ts",
        "app/api/hspp/cron/post-positive-lifecycle/route.ts",
      ]
        .map(
          read,
        )
        .join(
          "\n",
        );


    assert.doesNotMatch(
      activationSurface,
      /compareAndSwapHsppPostPositiveRevalidationCandidateScanState|compare_and_swap_hspp_revalidation_candidate_scan_state/,
    );
  },
);
