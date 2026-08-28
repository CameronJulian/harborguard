import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/20260828070000_create_route_safety_provider_snapshot_assertions.sql",
    import.meta.url
  ),
  "utf8"
);

function tableDefinition(name) {
  const pattern = new RegExp(
    String.raw`create\s+table\s+public\.${name}\s*\([\s\S]*?\n\);`,
    "i"
  );

  const match = sql.match(pattern);

  assert.ok(
    match,
    `Missing table definition: ${name}`
  );

  return match[0];
}

const snapshots =
  tableDefinition(
    "route_safety_provider_snapshots"
  );

const retrievals =
  tableDefinition(
    "route_safety_provider_snapshot_retrievals"
  );

const assertions =
  tableDefinition(
    "route_safety_provider_snapshot_assertions"
  );


test(
  "provider snapshot/version contains provider-native version provenance only",
  () => {
    assert.match(
      snapshots,
      /snapshot_identity_kind\s+text\s+not\s+null/i
    );

    assert.match(
      snapshots,
      /snapshot_identity_value\s+text\s+not\s+null/i
    );

    assert.match(
      snapshots,
      /provider_source_updated_at\s+timestamptz\s+null/i
    );

    assert.match(
      snapshots,
      /unique\s*\(\s*organization_id\s*,\s*provider\s*,\s*source_stream\s*,\s*snapshot_identity_kind\s*,\s*snapshot_identity_value\s*\)/is
    );

    assert.doesNotMatch(
      snapshots,
      /\bresponse_originated_at\b/i
    );

    assert.doesNotMatch(
      snapshots,
      /\breceived_at\b/i
    );
  }
);


test(
  "retrieval occurrence is separate from provider snapshot/version",
  () => {
    assert.match(
      retrievals,
      /\bid\s+uuid\s+primary\s+key\s*,/i
    );

    assert.match(
      retrievals,
      /snapshot_id\s+uuid\s+not\s+null[\s\S]*?references\s+public\.route_safety_provider_snapshots\s*\(\s*id\s*\)/i
    );

    assert.match(
      retrievals,
      /response_originated_at\s+timestamptz\s+null/i
    );

    assert.match(
      retrievals,
      /received_at\s+timestamptz\s+not\s+null/i
    );

    assert.doesNotMatch(
      retrievals,
      /unique\s*\(\s*snapshot_id/is
    );
  }
);


test(
  "multiple retrieval occurrences may reference one provider snapshot/version",
  () => {
    assert.match(
      sql,
      /Multiple retrieval rows may reference the same snapshot_id/i
    );

    assert.match(
      sql,
      /same HTTP response must reuse this UUID/i
    );
  }
);


test(
  "assertions bind to retrieval occurrence rather than provider snapshot directly",
  () => {
    assert.match(
      assertions,
      /retrieval_id\s+uuid\s+not\s+null[\s\S]*?references\s+public\.route_safety_provider_snapshot_retrievals\s*\(\s*id\s*\)/i
    );

    assert.doesNotMatch(
      assertions,
      /\bsnapshot_id\b/i
    );

    assert.match(
      assertions,
      /unique\s*\(\s*retrieval_id\s*,\s*provider_message_id\s*,\s*payload_schema_version\s*\)/is
    );
  }
);


test(
  "incident event time remains optional and separate from response time",
  () => {
    assert.match(
      assertions,
      /event_observed_at\s+timestamptz\s+null/i
    );

    assert.match(
      retrievals,
      /response_originated_at\s+timestamptz\s+null/i
    );

    assert.match(
      retrievals,
      /received_at\s+timestamptz\s+not\s+null/i
    );
  }
);


test(
  "same provider observation may be reasserted across retrieval occurrences",
  () => {
    assert.match(
      assertions,
      /provider_observation_id\s+uuid\s+null[\s\S]*?references\s+public\.route_safety_provider_observations/i
    );

    assert.doesNotMatch(
      assertions,
      /unique\s*\(\s*provider_observation_id\s*\)/is
    );
  }
);


test(
  "three-layer foundation is additive and does not rewrite existing HSPP identity",
  () => {
    assert.doesNotMatch(
      sql,
      /alter\s+table\s+public\.route_safety_provider_observations/is
    );

    assert.doesNotMatch(
      sql,
      /alter\s+table\s+public\.hspp_evidence/is
    );

    assert.doesNotMatch(
      sql,
      /update\s+public\.route_safety_provider_observations/is
    );

    assert.doesNotMatch(
      sql,
      /update\s+public\.hspp_evidence/is
    );
  }
);


test(
  "all three provenance layers are database-enforced append-only",
  () => {
    assert.match(
      sql,
      /route_safety_provider_snapshots_immutable[\s\S]*?before\s+update\s+or\s+delete\s+or\s+truncate/is
    );

    assert.match(
      sql,
      /route_safety_provider_snapshot_retrievals_immutable[\s\S]*?before\s+update\s+or\s+delete\s+or\s+truncate/is
    );

    assert.match(
      sql,
      /route_safety_provider_snapshot_assertions_immutable[\s\S]*?before\s+update\s+or\s+delete\s+or\s+truncate/is
    );

    assert.match(
      sql,
      /errcode\s*=\s*'55000'/i
    );

    assert.doesNotMatch(
      sql,
      /on\s+delete\s+cascade/i
    );
  }
);


test(
  "immutability trigger function uses valid PostgreSQL dollar quoting",
  () => {
    assert.match(
      sql,
      /set\s+search_path\s*=\s*public\s+as\s+\$\$\s*begin[\s\S]*?return\s+null;\s*end;\s*\$\$;/i
    );

    assert.doesNotMatch(
      sql,
      /^\s*as\s+\$\s*$/im
    );

    assert.doesNotMatch(
      sql,
      /^\s*\$;\s*$/im
    );
  }
);