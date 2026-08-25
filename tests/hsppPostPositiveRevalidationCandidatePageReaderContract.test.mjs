import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const root =
  process.cwd();

const migrationPath =
  "supabase/migrations/20260825162500_read_hspp_post_positive_revalidation_candidate_page.sql";

const readerPath =
  "lib/hspp/readHsppPostPositiveRevalidationCandidatePage.ts";


function readText(
  relativePath,
) {
  return fs.readFileSync(
    path.join(
      root,
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
      root,
      relativePath,
    ),
  );
}


const migration =
  readText(
    migrationPath,
  );

const reader =
  readText(
    readerPath,
  );


test(
  "new circular candidate page files are UTF-8 without BOM",
  () => {
    for (
      const relativePath
      of [
        migrationPath,
        readerPath,
        "tests/hsppPostPositiveRevalidationCandidatePageReader.test.ts",
        "tests/hsppPostPositiveRevalidationCandidatePageReaderContract.test.mjs",
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
        relativePath + " unexpectedly contains UTF-8 BOM",
      );
    }
  },
);


test(
  "migration adds a dedicated partial structural R1 keyset index",
  () => {
    assert.match(
      migration,
      /create index if not exists\s+hspp_evidence_post_positive_revalidation_candidate_scan_idx/i,
    );

    assert.match(
      migration,
      /on public\.hspp_evidence\s*\(\s*organization_id,\s*parent_evidence_id,\s*parent_integrity_fingerprint,\s*observed_at asc,\s*id asc\s*\)/i,
    );

    assert.match(
      migration,
      /where\s+source_class\s*=\s*'derived'[\s\S]*?source_provider\s*=\s*'harborguard'[\s\S]*?source_stream\s*=\s*'post-positive-revalidation'[\s\S]*?payload_schema_version\s*=\s*'hspp-post-positive-revalidation-v1'[\s\S]*?derivation_type\s*=\s*'post_positive_revalidation'[\s\S]*?derivation_version\s*=\s*'hspp-post-positive-revalidation-v1'/i,
    );
  },
);


test(
  "read RPC is Q14p scoped bounded stable and security definer",
  () => {
    assert.match(
      migration,
      /read_hspp_post_positive_revalidation_candidate_page\s*\(\s*p_positive_checkpoint_id uuid,\s*p_limit integer\s*\)/i,
    );

    assert.match(
      migration,
      /returns table\s*\([\s\S]*?cursor_expected_observed_at timestamptz[\s\S]*?cursor_expected_evidence_id uuid[\s\S]*?cursor_proposed_observed_at timestamptz[\s\S]*?cursor_proposed_evidence_id uuid[\s\S]*?candidate_evidence_id uuid[\s\S]*?candidate_observed_at timestamptz[\s\S]*?candidate_position integer/i,
    );

    assert.match(
      migration,
      /language plpgsql\s+stable\s+security definer\s+set search_path = public/i,
    );

    assert.match(
      migration,
      /p_limit > 25/i,
    );
  },
);


test(
  "read RPC derives immutable authority from Q14p and validates persisted scan scope",
  () => {
    assert.match(
      migration,
      /from\s+public\.hspp_assembly_positive_assessment_checkpoints\s+as positive[\s\S]*?positive\.id\s*=\s*p_positive_checkpoint_id/i,
    );

    assert.match(
      migration,
      /positive\.organization_id[\s\S]*?positive\.assembly_id[\s\S]*?positive\.evidence_id[\s\S]*?positive\.integrity_fingerprint[\s\S]*?positive\.assessed_at/i,
    );

    assert.match(
      migration,
      /from\s+public\.hspp_post_positive_revalidation_candidate_scan_states\s+as scan_state[\s\S]*?scan_state\.positive_checkpoint_id\s*=\s*p_positive_checkpoint_id/i,
    );

    assert.match(
      migration,
      /hspp-post-positive-revalidation-candidate-scan-state-v1/i,
    );

    assert.match(
      migration,
      /v_state_organization_id[\s\S]*?v_organization_id[\s\S]*?v_state_subject_evidence_id[\s\S]*?v_subject_evidence_id[\s\S]*?v_state_subject_integrity_fingerprint[\s\S]*?v_subject_integrity_fingerprint/i,
    );
  },
);


test(
  "candidate selection is structural circular and bounded",
  () => {
    assert.match(
      migration,
      /row\(\s*eligible\.observed_at,\s*eligible\.evidence_id\s*\)\s*>\s*row\(\s*v_cursor_observed_at,\s*v_cursor_evidence_id\s*\)/i,
    );

    assert.match(
      migration,
      /row\(\s*eligible\.observed_at,\s*eligible\.evidence_id\s*\)\s*<=\s*row\(\s*v_cursor_observed_at,\s*v_cursor_evidence_id\s*\)/i,
    );

    assert.match(
      migration,
      /order by\s+eligible\.observed_at asc,\s*eligible\.evidence_id asc[\s\S]*?limit p_limit/i,
    );

    assert.match(
      migration,
      /greatest\(\s*p_limit - selected_count,\s*0\s*\)/i,
    );

    assert.match(
      migration,
      /order by\s+selected_page\.page_position desc\s*limit 1/i,
    );

    assert.doesNotMatch(
      migration,
      /normalized_payload|integrity_state|validation_state|trust_state/i,
    );
  },
);


test(
  "RPC is read only and privilege dormant",
  () => {
    const functionMatch =
      migration.match(
        /create or replace function\s+public\.read_hspp_post_positive_revalidation_candidate_page[\s\S]*?\$function\$;/i,
      );

    assert.ok(
      functionMatch,
      "candidate page function body not found",
    );

    const executable =
      functionMatch[0]
        .replace(
          /--.*$/gm,
          "",
        )
        .replace(
          /\/\*[\s\S]*?\*\//g,
          "",
        );

    assert.doesNotMatch(
      executable,
      /\b(insert|update|delete|upsert)\b/i,
    );

    assert.doesNotMatch(
      executable,
      /compare_and_swap_hspp_post_positive_revalidation_candidate_scan_state/i,
    );

    assert.doesNotMatch(
      migration,
      /grant\s+execute/i,
    );

    for (
      const role
      of [
        "public",
        "anon",
        "authenticated",
        "service_role",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          "revoke all[\\s\\S]*?read_hspp_post_positive_revalidation_candidate_page[\\s\\S]*?from " +
            role +
            ";",
          "i",
        ),
      );
    }
  },
);


test(
  "TypeScript wrapper owns only read RPC mapping and cursor validation",
  () => {
    assert.match(
      reader,
      /HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION[\s\S]*?hspp-post-positive-revalidation-candidate-page-reader-v1/i,
    );

    assert.match(
      reader,
      /read_hspp_post_positive_revalidation_candidate_page/i,
    );

    assert.equal(
      (
        reader.match(
          /\.rpc\s*\(/g,
        ) || []
      ).length,
      1,
    );

    assert.doesNotMatch(
      reader,
      /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );

    assert.doesNotMatch(
      reader,
      /compareAndSwapHsppPostPositiveRevalidationCandidateScanState|readAndVerifyHsppEvidence|evaluateHsppPostPositiveRevalidationEvidence|persistHsppMemberUnsuitability|runHsppPostPositiveLifecycleCycle/,
    );

    assert.doesNotMatch(
      reader,
      /Date\.now\(|new Date\s*\(|randomUUID/,
    );

    assert.match(
      reader,
      /expectedCursor[\s\S]*?proposedCursor[\s\S]*?candidates/,
    );
  },
);
