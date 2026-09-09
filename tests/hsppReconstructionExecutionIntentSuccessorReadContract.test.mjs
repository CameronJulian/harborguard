import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260901154500_create_hspp_reconstruction_execution_intent_successor_reader.sql",
  );

const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14ag33C creates one distinct successor reader without replacing the legacy reader",
  () => {
    const successorCreates =
      source.match(
        /create\s+or\s+replace\s+function\s+public\.read_hspp_reconstruction_execution_intents_v2\s*\(/gi,
      ) ?? [];

    assert.equal(
      successorCreates.length,
      1,
    );

    assert.doesNotMatch(
      source,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_reconstruction_execution_intents\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /drop\s+function[\s\S]*?read_hspp_reconstruction_execution_intents\s*\(/i,
    );
  },
);


test(
  "Q14ag33C delegates canonical filtering and pagination to Q14ag31O",
  () => {
    assert.match(
      source,
      /from\s+public\.read_hspp_reconstruction_execution_intents\s*\(\s*p_organization_id\s*,\s*p_limit\s*,\s*p_before_created_at\s*,\s*p_before_intent_id\s*,\s*p_persistence_state\s*\)\s+as\s+legacy/i,
    );
  },
);


test(
  "Q14ag33C exposes complete successor selection provenance",
  () => {
    for (const field of [
      "selection_source text",
      "discovery_policy_version text",
      "pair_scheduling_version text",
      "reservoir_eligibility_policy_version text",
      "reevaluation_policy_version text",
      "membership_policy_version text",
      "reconstruction_policy_version text",
      "reconstruction_reason text",
    ]) {
      assert.ok(
        source.includes(field),
        `missing successor read field: ${field}`,
      );
    }
  },
);


test(
  "Q14ag33C enriches only the exact canonical durable intent identity",
  () => {
    assert.match(
      source,
      /join\s+public\.hspp_reconstruction_execution_intents\s+as\s+durable/i,
    );

    assert.match(
      source,
      /durable\.id\s*=\s*legacy\.intent_id/i,
    );

    assert.match(
      source,
      /durable\.organization_id\s*=\s*legacy\.organization_id/i,
    );

    assert.match(
      source,
      /durable\.child_assembly_id\s*=\s*legacy\.child_assembly_id/i,
    );

    assert.match(
      source,
      /durable\.discovery_policy_version\s+is\s+not\s+distinct\s+from\s+legacy\.discovery_policy_version/i,
    );
  },
);


test(
  "Q14ag33C returns source-specific provenance from the durable row",
  () => {
    assert.match(
      source,
      /durable\.selection_source[\s\S]*?durable\.discovery_policy_version[\s\S]*?durable\.pair_scheduling_version[\s\S]*?durable\.reservoir_eligibility_policy_version/i,
    );
  },
);


test(
  "Q14ag33C preserves deterministic canonical page ordering",
  () => {
    assert.match(
      source,
      /order\s+by\s+legacy\.created_at\s+desc\s*,\s*legacy\.intent_id\s+desc/i,
    );
  },
);


test(
  "Q14ag33C does not reimplement persistence-state classification",
  () => {
    assert.doesNotMatch(
      source,
      /'CLAIMED_NOT_PERSISTED'\s*::\s*text/i,
    );

    assert.doesNotMatch(
      source,
      /'RECONSTRUCTION_PERSISTED'\s*::\s*text/i,
    );

    assert.doesNotMatch(
      source,
      /\bobserved_child_id\b/i,
    );

    assert.doesNotMatch(
      source,
      /\bderived_persistence_state\b/i,
    );
  },
);


test(
  "Q14ag33C does not filter out either selection producer",
  () => {
    assert.doesNotMatch(
      source,
      /where[\s\S]*?selection_source\s*=/i,
    );

    assert.doesNotMatch(
      source,
      /p_selection_source/i,
    );
  },
);


test(
  "Q14ag33C remains read-only",
  () => {
    assert.doesNotMatch(
      source,
      /^\s*insert\s+into\s+/im,
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
  "Q14ag33C is service-role-only",
  () => {
    for (const role of [
      "public",
      "anon",
      "authenticated",
      "service_role",
    ]) {
      assert.match(
        source,
        new RegExp(
          `revoke all on function[\\s\\S]*?read_hspp_reconstruction_execution_intents_v2[\\s\\S]*?from ${role}`,
          "i",
        ),
      );
    }

    assert.match(
      source,
      /grant\s+execute\s+on\s+function[\s\S]*?read_hspp_reconstruction_execution_intents_v2[\s\S]*?to\s+service_role/i,
    );
  },
);


test(
  "Q14ag33C owns no claim reconstruction hydration or pair-scheduler authority",
  () => {
    assert.doesNotMatch(
      source,
      /\bclaim_hspp_reconstruction_execution_intent_v2\s*\(/i,
    );

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
  },
);