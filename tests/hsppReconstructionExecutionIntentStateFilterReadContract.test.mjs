import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const migrationPath =
  "supabase/migrations/20260824083500_filter_hspp_reconstruction_execution_intents.sql";


const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


const normalized =
  source
    .replace(
      /\s+/g,
      " ",
    )
    .trim();


const executable =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /--.*$/gm,
      "",
    );


test(
  "Q14ag31O removes the old four-argument overload before installing one canonical five-argument RPC",
  () => {
    assert.match(
      normalized,
      /drop function if exists public\.read_hspp_reconstruction_execution_intents\s*\(\s*uuid,\s*integer,\s*timestamptz,\s*uuid\s*\)/i,
    );

    assert.match(
      normalized,
      /create or replace function public\.read_hspp_reconstruction_execution_intents\s*\(\s*p_organization_id uuid,\s*p_limit integer default 100,\s*p_before_created_at timestamptz default null,\s*p_before_intent_id uuid default null,\s*p_persistence_state text default null\s*\)/i,
    );

    const creates =
      normalized.match(
        /create or replace function public\.read_hspp_reconstruction_execution_intents/g,
      ) ?? [];

    assert.equal(
      creates.length,
      1,
    );
  },
);


test(
  "Q14ag31O accepts only null or the two canonical derived persistence states",
  () => {
    assert.match(
      normalized,
      /p_persistence_state is not null[\s\S]*?p_persistence_state not in\s*\(\s*'CLAIMED_NOT_PERSISTED',\s*'RECONSTRUCTION_PERSISTED'\s*\)/i,
    );

    assert.match(
      source,
      /p_persistence_state must be null, CLAIMED_NOT_PERSISTED, or RECONSTRUCTION_PERSISTED/,
    );
  },
);


test(
  "Q14ag31O preserves the generic null-filter compatibility branch",
  () => {
    const start =
      source.indexOf(
        "Q14ag31O GENERIC NULL-FILTER COMPATIBILITY BRANCH",
      );

    const filtered =
      source.indexOf(
        "Q14ag31O STARVATION-SAFE FILTERED BRANCH",
      );

    assert.ok(
      start >=
      0,
    );

    assert.ok(
      filtered >
      start,
    );

    const generic =
      source.slice(
        start,
        filtered,
      );

    assert.match(
      generic,
      /if p_persistence_state is null then/,
    );

    const limit =
      generic.indexOf(
        "limit p_limit",
      );

    const observed =
      generic.indexOf(
        "observed as",
      );

    assert.ok(
      limit >=
      0,
    );

    assert.ok(
      observed >
      limit,
    );

    assert.match(
      generic,
      /'CLAIMED_NOT_PERSISTED'::text/,
    );

    assert.match(
      generic,
      /'RECONSTRUCTION_PERSISTED'::text/,
    );
  },
);


test(
  "Q14ag31O filtered mode observes derives and filters lifecycle state before bounded LIMIT",
  () => {
    const marker =
      source.indexOf(
        "Q14ag31O FILTERED RETURN PAGE",
      );

    assert.ok(
      marker >=
      0,
    );

    const filtered =
      source.slice(
        marker,
      );

    const candidateScope =
      filtered.indexOf(
        "candidate_scope as",
      );

    const observed =
      filtered.indexOf(
        "observed as",
      );

    const classified =
      filtered.indexOf(
        "classified as",
      );

    const stateFilter =
      filtered.indexOf(
        "classified.derived_persistence_state =",
      );

    const order =
      filtered.indexOf(
        "order by",
        stateFilter,
      );

    const limit =
      filtered.indexOf(
        "limit p_limit",
        stateFilter,
      );

    assert.ok(
      candidateScope >=
      0,
    );

    assert.ok(
      observed >
      candidateScope,
    );

    assert.ok(
      classified >
      observed,
    );

    assert.ok(
      stateFilter >
      classified,
    );

    assert.ok(
      order >
      stateFilter,
    );

    assert.ok(
      limit >
      order,
    );
  },
);


test(
  "Q14ag31O preserves organization scope paired cursor and limit bounds",
  () => {
    assert.match(
      normalized,
      /intent\.organization_id = p_organization_id/i,
    );

    assert.match(
      normalized,
      /intent\.created_at < p_before_created_at/i,
    );

    assert.match(
      normalized,
      /intent\.created_at = p_before_created_at/i,
    );

    assert.match(
      normalized,
      /intent\.id < p_before_intent_id/i,
    );

    assert.match(
      normalized,
      /p_limit is null or p_limit < 1 or p_limit > 100/i,
    );
  },
);


test(
  "Q14ag31O preserves the canonical contradiction fail-closed authority",
  () => {
    assert.match(
      source,
      /Durable reconstruction intent has contradictory child\/reconstruction persistence state/,
    );

    assert.match(
      executable,
      /observed_child_membership_policy_version[\s\S]*?membership_policy_version/,
    );

    assert.match(
      executable,
      /observed_reconstruction_policy_version[\s\S]*?reconstruction_policy_version/,
    );

    assert.match(
      executable,
      /observed_reconstruction_reason[\s\S]*?reconstruction_reason/,
    );

    assert.match(
      executable,
      /observed_assembly_state[\s\S]*?'OPEN'[\s\S]*?'SEALED'/,
    );
  },
);


test(
  "Q14ag31O preserves service-role-only read execution on the five-argument signature",
  () => {
    for (
      const role of [
        "public",
        "anon",
        "authenticated",
        "service_role",
      ]
    ) {
      assert.match(
        normalized,
        new RegExp(
          `revoke all on function public\\.read_hspp_reconstruction_execution_intents\\s*\\(\\s*uuid,\\s*integer,\\s*timestamptz,\\s*uuid,\\s*text\\s*\\) from ${role}`,
          "i",
        ),
      );
    }

    assert.match(
      normalized,
      /grant execute on function public\.read_hspp_reconstruction_execution_intents\s*\(\s*uuid,\s*integer,\s*timestamptz,\s*uuid,\s*text\s*\) to service_role/i,
    );
  },
);


test(
  "Q14ag31O remains read-only and does not activate durable reconstruction",
  () => {
    assert.doesNotMatch(
      executable,
      /\binsert\s+into\s+public\.hspp_reconstruction_execution_intents\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bupdate\s+public\.hspp_reconstruction_execution_intents\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bdelete\s+from\s+public\.hspp_reconstruction_execution_intents\b/i,
    );

    assert.doesNotMatch(
      executable,
      /\bclaim_hspp_reconstruction_execution_intent\s*\(/i,
    );

    assert.doesNotMatch(
      executable,
      /\bpersist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );
  },
);