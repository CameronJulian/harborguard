import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260901150000_add_hspp_reconstruction_intent_selection_provenance.sql",
  );

const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14ag33A adds explicit immutable selection-origin provenance",
  () => {
    assert.match(
      source,
      /add\s+column\s+if\s+not\s+exists\s+selection_source\s+text\s+not\s+null\s+default\s+'B07B_DISCOVERY'/i,
    );

    assert.match(
      source,
      /selection_source\s+in\s*\(\s*'B07B_DISCOVERY'\s*,\s*'SCHEDULED_PAIR'\s*\)/i,
    );
  },
);


test(
  "Q14ag33A adds producer-specific scheduled-pair provenance",
  () => {
    assert.match(
      source,
      /add\s+column\s+if\s+not\s+exists\s+pair_scheduling_version\s+text/i,
    );

    assert.match(
      source,
      /pair_scheduling_version\s+is\s+null[\s\S]*?length\s*\(\s*trim\s*\(\s*pair_scheduling_version\s*\)\s*\)\s+between\s+1\s+and\s+128/i,
    );
  },
);


test(
  "Q14ag33A permits nullable discovery provenance only under the successor source contract",
  () => {
    assert.match(
      source,
      /alter\s+column\s+discovery_policy_version\s+drop\s+not\s+null/i,
    );

    assert.match(
      source,
      /selection_source\s*=\s*'B07B_DISCOVERY'[\s\S]*?discovery_policy_version\s+is\s+not\s+null[\s\S]*?pair_scheduling_version\s+is\s+null/i,
    );

    assert.match(
      source,
      /selection_source\s*=\s*'SCHEDULED_PAIR'[\s\S]*?discovery_policy_version\s+is\s+null[\s\S]*?pair_scheduling_version\s+is\s+not\s+null/i,
    );
  },
);


test(
  "Q14ag33A creates a normalized producer-neutral durable decision identity",
  () => {
    assert.match(
      source,
      /create\s+unique\s+index\s+if\s+not\s+exists\s+hspp_recon_intent_decision_identity_v2_unique/i,
    );

    assert.match(
      source,
      /hspp_recon_intent_decision_identity_v2_unique[\s\S]*?selected_first_evidence_id[\s\S]*?selected_second_evidence_id[\s\S]*?historical_evidence_id[\s\S]*?historical_evidence_integrity_fingerprint[\s\S]*?replacement_evidence_id[\s\S]*?replacement_evidence_integrity_fingerprint/i,
    );

    assert.match(
      source,
      /hspp_recon_intent_decision_identity_v2_unique[\s\S]*?selection_source[\s\S]*?coalesce\s*\(\s*discovery_policy_version\s*,\s*''\s*\)[\s\S]*?coalesce\s*\(\s*pair_scheduling_version\s*,\s*''\s*\)/i,
    );
  },
);


test(
  "Q14ag33A includes B06A eligibility provenance in the successor decision identity",
  () => {
    assert.match(
      source,
      /hspp_recon_intent_decision_identity_v2_unique[\s\S]*?reservoir_eligibility_policy_version[\s\S]*?reevaluation_policy_version[\s\S]*?membership_policy_version[\s\S]*?reconstruction_policy_version[\s\S]*?reconstruction_reason/i,
    );
  },
);


test(
  "Q14ag33A preserves the legacy B07B decision constraint as a compatibility guard",
  () => {
    assert.doesNotMatch(
      source,
      /drop\s+constraint\s+(?:if\s+exists\s+)?hspp_recon_intent_decision_unique/i,
    );
  },
);


test(
  "Q14ag33A does not change the deployed reconstruction claim RPC",
  () => {
    assert.doesNotMatch(
      source,
      /create\s+or\s+replace\s+function[\s\S]*?claim_hspp_reconstruction_execution_intent\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /drop\s+function[\s\S]*?claim_hspp_reconstruction_execution_intent\s*\(/i,
    );
  },
);


test(
  "Q14ag33A does not change the deployed reconstruction reader RPC",
  () => {
    assert.doesNotMatch(
      source,
      /create\s+or\s+replace\s+function[\s\S]*?read_hspp_reconstruction_execution_intents\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /drop\s+function[\s\S]*?read_hspp_reconstruction_execution_intents\s*\(/i,
    );
  },
);


test(
  "Q14ag33A performs no row DML",
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
  "Q14ag33A grants no reconstruction execution or pair-scheduler activation authority",
  () => {
    assert.doesNotMatch(
      source,
      /create\s+or\s+replace\s+function/i,
    );

    assert.doesNotMatch(
      source,
      /\bgrant\s+execute\b/i,
    );

    assert.doesNotMatch(
      source,
      /\bcompare_and_swap_hspp_reservoir_pair/i,
    );
  },
);