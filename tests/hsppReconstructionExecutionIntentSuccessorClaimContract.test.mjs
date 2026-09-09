import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260901153000_create_hspp_reconstruction_execution_intent_successor_claim.sql",
  );

const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14ag33B creates one distinct successor claim RPC without replacing Q14ag31A",
  () => {
    const successorCreates =
      source.match(
        /create\s+or\s+replace\s+function\s+public\.claim_hspp_reconstruction_execution_intent_v2\s*\(/gi,
      ) ?? [];

    assert.equal(
      successorCreates.length,
      1,
    );

    assert.doesNotMatch(
      source,
      /create\s+or\s+replace\s+function\s+public\.claim_hspp_reconstruction_execution_intent\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /drop\s+function[\s\S]*?\bclaim_hspp_reconstruction_execution_intent\s*\(/i,
    );
  },
);


test(
  "Q14ag33B accepts explicit producer-specific and producer-neutral provenance inputs",
  () => {
    for (const token of [
      "p_selection_source text",
      "p_discovery_policy_version text",
      "p_pair_scheduling_version text",
      "p_reservoir_eligibility_policy_version text",
      "p_reevaluation_policy_version text",
      "p_membership_policy_version text",
      "p_reconstruction_policy_version text",
      "p_reconstruction_reason text",
    ]) {
      assert.ok(
        source.includes(token),
        `missing successor claim input: ${token}`,
      );
    }
  },
);


test(
  "Q14ag33B forbids discovery fabrication for scheduled-pair claims",
  () => {
    assert.match(
      source,
      /v_selection_source\s+not\s+in\s*\(\s*'B07B_DISCOVERY'\s*,\s*'SCHEDULED_PAIR'\s*\)[\s\S]*?if\s+v_selection_source\s*=\s*'B07B_DISCOVERY'\s+then[\s\S]*?\belse\b[\s\S]*?v_discovery_policy_version\s+is\s+not\s+null[\s\S]*?SCHEDULED_PAIR forbids fabricated discovery provenance/i,
    );

    assert.match(
      source,
      /SCHEDULED_PAIR requires pair scheduling provenance/i,
    );
  },
);


test(
  "Q14ag33B requires real discovery provenance and forbids pair scheduling provenance for B07B",
  () => {
    assert.match(
      source,
      /v_selection_source\s*=\s*'B07B_DISCOVERY'[\s\S]*?B07B_DISCOVERY requires discovery policy provenance/i,
    );

    assert.match(
      source,
      /B07B_DISCOVERY forbids pair scheduling provenance/i,
    );
  },
);


test(
  "Q14ag33B pins successor v1 to the deployed B06A eligibility policy while legacy identity exists",
  () => {
    assert.match(
      source,
      /v_reservoir_eligibility_policy_version\s*<>\s*'hspp-reservoir-eligibility-v1'/i,
    );

    assert.match(
      source,
      /supports only hspp-reservoir-eligibility-v1 while the legacy claim identity remains available/i,
    );
  },
);


test(
  "Q14ag33B preserves exact pair orientation and immutable SHA256 fingerprints",
  () => {
    assert.match(
      source,
      /p_selected_first_evidence_id\s*=\s*p_historical_evidence_id[\s\S]*?p_selected_second_evidence_id\s*=\s*p_replacement_evidence_id/i,
    );

    assert.match(
      source,
      /p_selected_first_evidence_id\s*=\s*p_replacement_evidence_id[\s\S]*?p_selected_second_evidence_id\s*=\s*p_historical_evidence_id/i,
    );

    const shaChecks =
      source.match(
        /!\~\s*'\^\[0-9a-f\]\{64\}\$'/g,
      ) ?? [];

    assert.equal(
      shaChecks.length,
      2,
    );
  },
);


test(
  "Q14ag33B exact recovery identity includes source, null-safe producer provenance and B06A",
  () => {
    assert.match(
      source,
      /intent\.selection_source\s*=\s*v_selection_source/i,
    );

    assert.match(
      source,
      /intent\.discovery_policy_version\s+is\s+not\s+distinct\s+from\s+v_discovery_policy_version/i,
    );

    assert.match(
      source,
      /intent\.pair_scheduling_version\s+is\s+not\s+distinct\s+from\s+v_pair_scheduling_version/i,
    );

    assert.match(
      source,
      /intent\.reservoir_eligibility_policy_version\s*=\s*v_reservoir_eligibility_policy_version/i,
    );

    assert.match(
      source,
      /intent\.reevaluation_policy_version\s*=\s*v_reevaluation_policy_version[\s\S]*?intent\.membership_policy_version\s*=\s*v_membership_policy_version[\s\S]*?intent\.reconstruction_policy_version\s*=\s*v_reconstruction_policy_version[\s\S]*?intent\.reconstruction_reason\s*=\s*v_reconstruction_reason/i,
    );
  },
);


test(
  "Q14ag33B inserts the complete successor durable identity",
  () => {
    assert.match(
      source,
      /insert\s+into\s+public\.hspp_reconstruction_execution_intents[\s\S]*?selection_source[\s\S]*?discovery_policy_version[\s\S]*?pair_scheduling_version[\s\S]*?reservoir_eligibility_policy_version[\s\S]*?reevaluation_policy_version[\s\S]*?membership_policy_version[\s\S]*?reconstruction_policy_version[\s\S]*?reconstruction_reason/i,
    );
  },
);


test(
  "Q14ag33B preserves conflict-to-exact-recovery concurrency behavior",
  () => {
    assert.match(
      source,
      /on\s+conflict\s+do\s+nothing/i,
    );

    const recoveryReads =
      source.match(
        /from\s+public\.hspp_reconstruction_execution_intents\s+as\s+intent/gi,
      ) ?? [];

    assert.ok(
      recoveryReads.length >= 2,
      "successor claim must read exact identity before and after the insert race",
    );

    assert.match(
      source,
      /Concurrent successor reconstruction intent claim conflict did not resolve to the exact durable decision/i,
    );
  },
);


test(
  "Q14ag33B returns canonical producer provenance and idempotent recovery state",
  () => {
    for (const token of [
      "selection_source text",
      "discovery_policy_version text",
      "pair_scheduling_version text",
      "reservoir_eligibility_policy_version text",
      "idempotent_recovery boolean",
    ]) {
      assert.ok(
        source.includes(token),
        `missing successor return field: ${token}`,
      );
    }

    assert.match(
      source,
      /v_existing\.child_assembly_id[\s\S]*?true;/i,
    );

    assert.match(
      source,
      /v_inserted\.child_assembly_id[\s\S]*?false;/i,
    );
  },
);


test(
  "Q14ag33B rejects fresh child UUID collisions before durable insertion",
  () => {
    assert.match(
      source,
      /existing_child\.child_assembly_id\s*=\s*p_proposed_child_assembly_id/i,
    );

    assert.match(
      source,
      /existing_assembly\.id\s*=\s*p_proposed_child_assembly_id/i,
    );

    assert.match(
      source,
      /New successor reconstruction intent child UUID became owned by an HSPP assembly before intent claim completed/i,
    );
  },
);


test(
  "Q14ag33B is service-role-only",
  () => {
    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        source,
        new RegExp(
          `revoke all on function[\\s\\S]*?claim_hspp_reconstruction_execution_intent_v2[\\s\\S]*?from ${role}`,
          "i",
        ),
      );
    }

    assert.match(
      source,
      /grant\s+execute\s+on\s+function[\s\S]*?claim_hspp_reconstruction_execution_intent_v2[\s\S]*?to\s+service_role/i,
    );
  },
);


test(
  "Q14ag33B writes only the durable execution-intent table",
  () => {
    const insertedTables =
      [
        ...source.matchAll(
          /insert\s+into\s+(?:public\.)?([a-z0-9_]+)/gi,
        ),
      ].map(
        (match) => match[1],
      );

    assert.deepEqual(
      insertedTables,
      [
        "hspp_reconstruction_execution_intents",
      ],
    );

    assert.doesNotMatch(
      source,
      /^\s*update\s+/im,
    );

    assert.doesNotMatch(
      source,
      /^\s*delete\s+from\s+/im,
    );
  },
);


test(
  "Q14ag33B owns no reconstruction execution or pair scheduling authority",
  () => {
    assert.doesNotMatch(
      source,
      /\bpersist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /\bread_hspp_reservoir_pair_page\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /\bcompare_and_swap_hspp_reservoir_pair/i,
    );

    assert.doesNotMatch(
      source,
      /\bseal_hspp/i,
    );

    assert.doesNotMatch(
      source,
      /\bupdate\s+public\.hspp_evidence\b/i,
    );
  },
);