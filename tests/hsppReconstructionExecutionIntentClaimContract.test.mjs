import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const path =
  "supabase/migrations/20260824053000_create_hspp_reconstruction_execution_intents.sql";

const source =
  fs.readFileSync(
    path,
    "utf8",
  );


test(
  "Q14ag31A creates one immutable durable reconstruction intent table",
  () => {
    assert.match(
      source,
      /create table\s+if not exists public\.hspp_reconstruction_execution_intents/i,
    );

    assert.match(
      source,
      /hspp-reconstruction-execution-intent-v1/,
    );

    assert.match(
      source,
      /before update or delete/i,
    );

    assert.match(
      source,
      /HSPP reconstruction execution intents are immutable/,
    );
  },
);


test(
  "Q14ag31A persists the canonical child and exact B07B evidence decision snapshot",
  () => {
    for (
      const field of [
        "child_assembly_id",
        "selected_first_evidence_id",
        "selected_second_evidence_id",
        "historical_evidence_id",
        "historical_evidence_integrity_fingerprint",
        "replacement_evidence_id",
        "replacement_evidence_integrity_fingerprint",
        "discovery_policy_version",
        "reevaluation_policy_version",
        "membership_policy_version",
        "reconstruction_policy_version",
        "reconstruction_reason",
      ]
    ) {
      assert.ok(
        source.includes(field),
        `missing durable reconstruction-intent field ${field}`,
      );
    }
  },
);


test(
  "Q14ag31A preserves exact pair orientation and historical/replacement roles",
  () => {
    assert.match(
      source,
      /hspp_recon_intent_pair_distinct/,
    );

    assert.match(
      source,
      /hspp_recon_intent_roles_distinct/,
    );

    assert.match(
      source,
      /hspp_recon_intent_pair_roles_exact/,
    );

    assert.match(
      source,
      /selected_first_evidence_id\s*=\s*historical_evidence_id[\s\S]*selected_second_evidence_id\s*=\s*replacement_evidence_id/i,
    );

    assert.match(
      source,
      /selected_first_evidence_id\s*=\s*replacement_evidence_id[\s\S]*selected_second_evidence_id\s*=\s*historical_evidence_id/i,
    );
  },
);


test(
  "Q14ag31A stores immutable lowercase SHA256 evidence fingerprints",
  () => {
    assert.match(
      source,
      /historical_evidence_integrity_fingerprint[\s\S]*\^\[0-9a-f\]\{64\}\$/,
    );

    assert.match(
      source,
      /replacement_evidence_integrity_fingerprint[\s\S]*\^\[0-9a-f\]\{64\}\$/,
    );

    assert.match(
      source,
      /public\.hspp_evidence/i,
    );

    assert.match(
      source,
      /v_matching_evidence_count\s*<>\s*2/,
    );
  },
);


test(
  "Q14ag31A uses a caller-proposed child UUID but recovers the canonical child by decision identity",
  () => {
    assert.match(
      source,
      /p_proposed_child_assembly_id uuid/,
    );

    assert.match(
      source,
      /hspp_recon_intent_child_unique/,
    );

    assert.match(
      source,
      /hspp_recon_intent_decision_unique/,
    );

    assert.match(
      source,
      /First recover by the immutable DECISION identity/i,
    );

    assert.match(
      source,
      /later process may generate a fresh proposed UUID/i,
    );

    assert.match(
      source,
      /v_existing\.child_assembly_id/,
    );

    assert.match(
      source,
      /idempotent_recovery boolean/,
    );
  },
);


test(
  "Q14ag31A exact decision identity includes pair evidence fingerprints and policy provenance",
  () => {
    const uniqueStart =
      source.indexOf(
        "constraint hspp_recon_intent_decision_unique",
      );

    assert.ok(uniqueStart >= 0);

    const uniqueBlock =
      source.slice(
        uniqueStart,
        source.indexOf(
          ")",
          source.indexOf(
            "reconstruction_reason",
            uniqueStart,
          ),
        ) + 1,
      );

    for (
      const field of [
        "organization_id",
        "selected_first_evidence_id",
        "selected_second_evidence_id",
        "historical_evidence_id",
        "historical_evidence_integrity_fingerprint",
        "replacement_evidence_id",
        "replacement_evidence_integrity_fingerprint",
        "discovery_policy_version",
        "reevaluation_policy_version",
        "membership_policy_version",
        "reconstruction_policy_version",
        "reconstruction_reason",
      ]
    ) {
      assert.ok(
        uniqueBlock.includes(field),
        `decision identity omits ${field}`,
      );
    }
  },
);


test(
  "Q14ag31A new claim rejects an already-owned HSPP assembly UUID",
  () => {
    assert.match(
      source,
      /public\.hspp_evidence_assemblies/,
    );

    assert.match(
      source,
      /Proposed reconstruction child UUID is already owned by an HSPP assembly/,
    );
  },
);


test(
  "Q14ag31A is service-role-only",
  () => {
    assert.match(
      source,
      /security definer/i,
    );

    assert.match(
      source,
      /revoke all[\s\S]*from public/i,
    );

    assert.match(
      source,
      /revoke all[\s\S]*from anon/i,
    );

    assert.match(
      source,
      /revoke all[\s\S]*from authenticated/i,
    );

    assert.match(
      source,
      /grant execute[\s\S]*to service_role/i,
    );
  },
);


test(
  "Q14ag31A does not execute reconstruction or activate production routing",
  () => {
    for (
      const forbidden of [
        "persist_hspp_evidence_assembly_reconstruction(",
        "seal_hspp_evidence_assembly(",
        "runHsppReservoirReconstruction",
        "NextRequest",
        "NextResponse",
        "schedule(",
      ]
    ) {
      assert.equal(
        source.includes(forbidden),
        false,
        `forbidden execution authority found: ${forbidden}`,
      );
    }
  },
);
