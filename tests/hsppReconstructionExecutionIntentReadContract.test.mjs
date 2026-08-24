import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";


const migrationPath =
  "supabase/migrations/20260824063000_read_hspp_reconstruction_execution_intents.sql";


const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


const normalized =
  source
    .replace(/\s+/g, " ")
    .trim();


const functionMarker =
  "create or replace function public.read_hspp_reconstruction_execution_intents";


const functionStart =
  normalized.indexOf(
    functionMarker,
  );


assert.notEqual(
  functionStart,
  -1,
);


const functionSource =
  normalized.slice(
    functionStart,
  );


const executableFunctionSource =
  functionSource
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /--.*$/gm,
      "",
    );


test(
  "Q14ag31E adds the deterministic organization created-at intent-id discovery index",
  () => {
    assert.match(
      normalized,
      /create index if not exists hspp_recon_intent_org_created_id_desc_idx on public\.hspp_reconstruction_execution_intents \( organization_id, created_at desc, id desc \)/i,
    );
  },
);


test(
  "Q14ag31E creates exactly one durable reconstruction intent discovery RPC",
  () => {
    const matches =
      source.match(
        /create\s+or\s+replace\s+function\s+public\.read_hspp_reconstruction_execution_intents\s*\(/gi,
      ) ?? [];

    assert.equal(
      matches.length,
      1,
    );
  },
);


test(
  "Q14ag31E uses organization scope bounded limit and paired keyset cursor inputs",
  () => {
    assert.match(
      normalized,
      /p_organization_id uuid, p_limit integer default 100, p_before_created_at timestamptz default null, p_before_intent_id uuid default null/i,
    );

    assert.match(
      functionSource,
      /p_limit must be between 1 and 100/i,
    );

    assert.match(
      functionSource,
      /cursor requires both created_at and intent_id/i,
    );
  },
);


test(
  "Q14ag31E orders and paginates deterministically by created-at then intent id",
  () => {
    assert.match(
      functionSource,
      /intent\.created_at < p_before_created_at/i,
    );

    assert.match(
      functionSource,
      /intent\.created_at = p_before_created_at/i,
    );

    assert.match(
      functionSource,
      /intent\.id < p_before_intent_id/i,
    );

    assert.match(
      functionSource,
      /order by intent\.created_at desc, intent\.id desc limit p_limit/i,
    );

    assert.match(
      functionSource,
      /order by observed\.created_at desc, observed\.intent_id desc/i,
    );
  },
);


test(
  "Q14ag31E returns the exact immutable durable intent decision provenance",
  () => {
    for (
      const field of [
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
        "intent_version",
        "created_at",
      ]
    ) {
      assert.match(
        functionSource,
        new RegExp(
          `\\b${field}\\b`,
          "i",
        ),
      );
    }
  },
);


test(
  "Q14ag31E derives only claimed-not-persisted or reconstruction-persisted states",
  () => {
    assert.match(
      functionSource,
      /CLAIMED_NOT_PERSISTED/i,
    );

    assert.match(
      functionSource,
      /RECONSTRUCTION_PERSISTED/i,
    );

    assert.doesNotMatch(
      functionSource,
      /PENDING_EXECUTION|EXECUTING|COMPLETED|FAILED/i,
    );
  },
);


test(
  "Q14ag31E observes canonical child reconstruction and lifecycle state read only",
  () => {
    assert.match(
      functionSource,
      /public\.hspp_evidence_assemblies/i,
    );

    assert.match(
      functionSource,
      /public\.hspp_evidence_assembly_reconstructions/i,
    );

    assert.match(
      functionSource,
      /observed_assembly_state/i,
    );

    assert.match(
      functionSource,
      /observed_sealed_at/i,
    );

    assert.match(
      functionSource,
      /observed_reconstruction_id/i,
    );

    assert.match(
      functionSource,
      /observed_parent_assembly_id/i,
    );
  },
);


test(
  "Q14ag31E fails closed when child and reconstruction existence disagree",
  () => {
    assert.match(
      functionSource,
      /observed_child_id is null[\s\S]*?<>[\s\S]*?observed_reconstruction_id is null/i,
    );

    assert.match(
      functionSource,
      /contradictory child\/reconstruction persistence state/i,
    );
  },
);


test(
  "Q14ag31E fails closed when persisted policy identity disagrees with the durable intent",
  () => {
    assert.match(
      functionSource,
      /observed_child_membership_policy_version is distinct from observed\.membership_policy_version/i,
    );

    assert.match(
      functionSource,
      /observed_reconstruction_policy_version is distinct from observed\.reconstruction_policy_version/i,
    );

    assert.match(
      functionSource,
      /observed_reconstruction_reason is distinct from observed\.reconstruction_reason/i,
    );
  },
);


test(
  "Q14ag31E accepts only OPEN or SEALED persisted child lifecycle consistency",
  () => {
    assert.match(
      functionSource,
      /observed_assembly_state not in \( 'OPEN', 'SEALED' \)/i,
    );

    assert.match(
      functionSource,
      /observed_assembly_state = 'OPEN'[\s\S]*?observed_sealed_at is not null/i,
    );

    assert.match(
      functionSource,
      /observed_assembly_state = 'SEALED'[\s\S]*?observed_sealed_at is null/i,
    );
  },
);


test(
  "Q14ag31E discovery RPC performs no table mutation",
  () => {
    assert.doesNotMatch(
      executableFunctionSource,
      /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i,
    );
  },
);


test(
  "Q14ag31E grants discovery execution only to service_role",
  () => {
    assert.match(
      normalized,
      /security definer/i,
    );

    assert.match(
      normalized,
      /revoke\s+all\s+on\s+function\s+public\.read_hspp_reconstruction_execution_intents\s*\(\s*uuid\s*,\s*integer\s*,\s*timestamptz\s*,\s*uuid\s*\)\s+from\s+public/i,
    );

    assert.match(
      normalized,
      /from anon/i,
    );

    assert.match(
      normalized,
      /from authenticated/i,
    );

    assert.match(
      normalized,
      /grant\s+execute\s+on\s+function\s+public\.read_hspp_reconstruction_execution_intents\s*\(\s*uuid\s*,\s*integer\s*,\s*timestamptz\s*,\s*uuid\s*\)\s+to\s+service_role/i,
    );
  },
);


test(
  "Q14ag31E does not execute reconstruction or activate downstream lifecycle authority",
  () => {
    assert.doesNotMatch(
      executableFunctionSource,
      /persist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );

    assert.doesNotMatch(
      executableFunctionSource,
      /claim_hspp_reconstruction_execution_intent\s*\(/i,
    );

    assert.doesNotMatch(
      executableFunctionSource,
      /\b[a-z0-9_]*(?:seal|assessment|reservoir|scheduler|cron|queue)[a-z0-9_]*\s*\(/i,
    );
  },
);

