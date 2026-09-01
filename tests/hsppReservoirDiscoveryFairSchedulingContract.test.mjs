import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260831112000_create_hspp_reservoir_discovery_fair_scan.sql",
    "utf8",
  );

const reader =
  fs.readFileSync(
    "lib/hspp/readHsppReservoirCandidates.ts",
    "utf8",
  );

const pageWrapper =
  fs.readFileSync(
    "lib/hspp/readHsppReservoirDiscoveryPage.ts",
    "utf8",
  );

const casWrapper =
  fs.readFileSync(
    "lib/hspp/compareAndSwapHsppReservoirDiscoveryScanState.ts",
    "utf8",
  );

const recoveryRoute =
  fs.readFileSync(
    "app/api/hspp/cron/recovery/route.ts",
    "utf8",
  );

const pairEvaluator =
  fs.readFileSync(
    "lib/hspp/evaluateHsppReservoirReevaluation.ts",
    "utf8",
  );


test(
  "Reservoir fairness owns a dedicated organization-scoped scheduling state",
  () => {
    assert.match(
      migration,
      /create table if not exists\s+public\.hspp_reservoir_discovery_scan_states/i,
    );

    assert.match(
      migration,
      /organization_id uuid primary key[\s\S]*?references public\.organizations\(id\)/i,
    );

    assert.match(
      migration,
      /hspp-reservoir-discovery-scheduling-v1/,
    );

    assert.match(
      migration,
      /cursor_observed_at timestamp with time zone/,
    );

    assert.match(
      migration,
      /cursor_evidence_id uuid/,
    );

    assert.match(
      migration,
      /previous_cursor_observed_at timestamp with time zone/,
    );

    assert.match(
      migration,
      /previous_cursor_evidence_id uuid/,
    );
  },
);


test(
  "Reservoir fairness adds the exact generic observed_at plus id keyset index",
  () => {
    assert.match(
      migration,
      /hspp_evidence_reservoir_discovery_scan_idx[\s\S]*?organization_id,[\s\S]*?observed_at asc,[\s\S]*?id asc/i,
    );
  },
);


test(
  "Reservoir page is circular and read-only with a proposed final raw-row cursor",
  () => {
    assert.match(
      migration,
      /read_hspp_reservoir_discovery_page/,
    );

    assert.match(
      migration,
      /\(\s*evidence\.observed_at,\s*evidence\.id\s*\)\s*>\s*\(\s*v_cursor_observed_at,\s*v_cursor_evidence_id\s*\)/s,
    );

    assert.match(
      migration,
      /\(\s*evidence\.observed_at,\s*evidence\.id\s*\)\s*<=\s*\(\s*v_cursor_observed_at,\s*v_cursor_evidence_id\s*\)/s,
    );

    assert.match(
      migration,
      /p_limit < 1[\s\S]*?p_limit > 100/,
    );

    assert.match(
      migration,
      /proposed_cursor[\s\S]*?candidate_position desc[\s\S]*?limit 1/i,
    );

    const readFunctionStart =
      migration.indexOf(
        "public.read_hspp_reservoir_discovery_page(",
      );

    const casFunctionStart =
      migration.indexOf(
        "public.compare_and_swap_hspp_reservoir_discovery_scan_state(",
      );

    assert.ok(
      readFunctionStart >= 0,
    );

    assert.ok(
      casFunctionStart >
        readFunctionStart,
    );

    const readBody =
      migration.slice(
        readFunctionStart,
        casFunctionStart,
      );

    assert.doesNotMatch(
      readBody,
      /\binsert into\b|\bupdate\b|\bdelete from\b/i,
    );
  },
);


test(
  "Reservoir cursor CAS validates exact organization evidence identity and supports circular movement",
  () => {
    assert.match(
      migration,
      /compare_and_swap_hspp_reservoir_discovery_scan_state/,
    );

    assert.match(
      migration,
      /proposed_evidence\.organization_id\s*=\s*p_organization_id/,
    );

    assert.match(
      migration,
      /proposed_evidence\.id\s*=\s*p_proposed_cursor_evidence_id/,
    );

    assert.match(
      migration,
      /proposed_evidence\.observed_at[\s\S]*?is not distinct from[\s\S]*?p_proposed_cursor_observed_at/,
    );

    assert.match(
      migration,
      /'CREATED'::text/,
    );

    assert.match(
      migration,
      /'ADVANCED'::text/,
    );

    assert.match(
      migration,
      /'NO_CHANGE'::text/,
    );

    assert.match(
      migration,
      /'STALE'::text/,
    );

    assert.doesNotMatch(
      migration,
      /p_proposed_cursor_observed_at\s*>\s*v_state\.cursor_observed_at/,
    );
  },
);


test(
  "Reservoir scheduling RPC authority is service-role only",
  () => {
    for (
      const role of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `revoke all on function[\\s\\S]*?read_hspp_reservoir_discovery_page[\\s\\S]*?from ${role}`,
          "i",
        ),
      );

      assert.match(
        migration,
        new RegExp(
          `revoke all on function[\\s\\S]*?compare_and_swap_hspp_reservoir_discovery_scan_state[\\s\\S]*?from ${role}`,
          "i",
        ),
      );
    }

    assert.match(
      migration,
      /grant execute on function[\s\S]*?read_hspp_reservoir_discovery_page[\s\S]*?to service_role/i,
    );

    assert.match(
      migration,
      /grant execute on function[\s\S]*?compare_and_swap_hspp_reservoir_discovery_scan_state[\s\S]*?to service_role/i,
    );
  },
);


test(
  "B06B preserves semantic policy v1 and delegates only raw-page scheduling",
  () => {
    assert.match(
      reader,
      /hspp-reservoir-discovery-v1/,
    );

    assert.match(
      reader,
      /readHsppReservoirDiscoveryPage/,
    );

    assert.doesNotMatch(
      reader,
      /\.from\(\s*"hspp_evidence"\s*\)/,
    );
    assert.match(
      reader,
      /readHsppReservoirEligibleEvidenceByIds/,
    );

    assert.doesNotMatch(
      reader,
      /\breadHsppEvidenceBatchForOperationalUse\s*\(/,
    );

    assert.doesNotMatch(
      reader,
      /\bevaluateHsppReservoirEligibility\s*\(/,
    );

    assert.match(
      reader,
      /rawEvidenceCount:\s*discoveryPage\s*\.items\.length/,
    );
  },
);


test(
  "page and CAS wrappers each own exactly one RPC and no direct table mutation",
  () => {
    assert.equal(
      (
        pageWrapper.match(
          /\.rpc\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      (
        casWrapper.match(
          /\.rpc\s*\(/g,
        ) ?? []
      ).length,
      1,
    );

    for (
      const source of [
        pageWrapper,
        casWrapper,
      ]
    ) {
      assert.doesNotMatch(
        source,
        /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
      );
    }
  },
);


test(
  "recovery cursor advances only after both B07B consumers have been attempted",
  () => {
    const initialH1Index =
      recoveryRoute.indexOf(
        "await persistHsppReservoirAssemblyCandidate({",
      );

    const reconstructionIndex =
      recoveryRoute.indexOf(
        "await runHsppReconstructionActivationCycle({",
      );

    const casIndex =
      recoveryRoute.indexOf(
        "await compareAndSwapHsppReservoirDiscoveryScanState({",
      );

    assert.ok(
      initialH1Index >= 0,
    );

    assert.ok(
      reconstructionIndex >
        initialH1Index,
    );

    assert.ok(
      casIndex >
        reconstructionIndex,
    );

    assert.match(
      recoveryRoute,
      /\breservoirScheduling\b/,
    );

    assert.match(
      recoveryRoute,
      /"STALE"\s+as const/,
    );
  },
);


test(
  "this patch leaves B07A pair fairness deliberately unchanged",
  () => {
    assert.match(
      pairEvaluator,
      /HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS\s*=\s*100/,
    );

    assert.match(
      pairEvaluator,
      /first\.evidenceId\.localeCompare\(second\.evidenceId\)/,
    );

    assert.doesNotMatch(
      pairEvaluator,
      /ReservoirDiscoveryScan|discovery-scheduling|pairCursor|pair_cursor/,
    );
  },
);