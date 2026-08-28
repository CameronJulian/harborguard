import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260828091500_persist_route_safety_provider_snapshot_retrieval.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "defines one atomic provider snapshot persistence RPC",
  () => {
    assert.match(
      source,
      /create or replace function\s+public\.persist_route_safety_provider_snapshot_retrieval\s*\(/i
    );

    assert.match(
      source,
      /p_retrieval_id\s+uuid/i
    );

    assert.match(
      source,
      /p_assertions\s+jsonb/i
    );

    assert.match(
      source,
      /language plpgsql/i
    );
  }
);

test(
  "uses repository-supported invoker security and restricts RPC execution to service_role",
  () => {
    assert.match(
      source,
      /security invoker/i
    );

    assert.match(
      source,
      /set search_path = public/i
    );

    assert.match(
      source,
      /revoke all on function[\s\S]*from public/i
    );

    assert.match(
      source,
      /revoke all on function[\s\S]*from anon/i
    );

    assert.match(
      source,
      /revoke all on function[\s\S]*from authenticated/i
    );

    assert.match(
      source,
      /grant execute on function[\s\S]*to service_role/i
    );
  }
);

test(
  "persists provider-native snapshot identity independently from retrieval occurrence",
  () => {
    assert.match(
      source,
      /route_safety_provider_snapshots/i
    );

    assert.match(
      source,
      /snapshot_identity_kind/i
    );

    assert.match(
      source,
      /snapshot_identity_value/i
    );

    assert.match(
      source,
      /provider_source_updated_at/i
    );

    assert.match(
      source,
      /on conflict\s*\(\s*organization_id,\s*provider,\s*source_stream,\s*snapshot_identity_kind,\s*snapshot_identity_value\s*\)\s*do nothing/is
    );
  }
);

test(
  "allows repeated retrievals of one provider-native snapshot while giving each retrieval deterministic identity",
  () => {
    assert.match(
      source,
      /route_safety_provider_snapshot_retrievals/i
    );

    assert.match(
      source,
      /insert into[\s\S]*route_safety_provider_snapshot_retrievals[\s\S]*\(\s*id,\s*snapshot_id,\s*response_originated_at,\s*received_at,\s*provider_request_id/is
    );

    assert.match(
      source,
      /on conflict\s*\(\s*id\s*\)\s*do nothing/is
    );

    assert.match(
      source,
      /v_existing_retrieval_snapshot_id[\s\S]*is distinct from[\s\S]*v_snapshot_id/is
    );

    assert.match(
      source,
      /v_existing_received_at[\s\S]*is distinct from[\s\S]*p_received_at/is
    );
  }
);

test(
  "persists all assertions from one JSONB response set inside the same RPC",
  () => {
    assert.match(
      source,
      /jsonb_array_elements\s*\(\s*p_assertions\s*\)/is
    );

    assert.match(
      source,
      /route_safety_provider_snapshot_assertions/i
    );

    assert.match(
      source,
      /retrieval_id,\s*provider_message_id,\s*payload_schema_version,\s*event_observed_at,\s*provider_observation_id,\s*normalized_payload/is
    );
  }
);

test(
  "does not require incident event time for a current-present assertion",
  () => {
    assert.match(
      source,
      /v_event_observed_at\s*:=\s*null/i
    );

    assert.doesNotMatch(
      source,
      /eventObservedAt is required/i
    );
  }
);

test(
  "validates optional legacy provider-observation provenance without rewriting it",
  () => {
    assert.match(
      source,
      /from\s+public\.route_safety_provider_observations/is
    );

    assert.match(
      source,
      /observation\.observed_at/is
    );

    assert.match(
      source,
      /observation\.normalized_payload/is
    );

    assert.match(
      source,
      /provider observation link collision/i
    );

    assert.doesNotMatch(
      source,
      /insert into\s+public\.route_safety_provider_observations/i
    );

    assert.doesNotMatch(
      source,
      /update\s+public\.route_safety_provider_observations/i
    );
  }
);

test(
  "fails closed on assertion identity collisions",
  () => {
    assert.match(
      source,
      /on conflict\s*\(\s*retrieval_id,\s*provider_message_id,\s*payload_schema_version\s*\)\s*do nothing/is
    );

    assert.match(
      source,
      /assertion identity collision: eventObservedAt does not match/i
    );

    assert.match(
      source,
      /assertion identity collision: providerObservationId does not match/i
    );

    assert.match(
      source,
      /assertion identity collision: normalizedPayload does not match/i
    );
  }
);

test(
  "freezes the complete assertion set so an existing retrieval cannot be extended on retry",
  () => {
    assert.match(
      source,
      /if v_retrieval_created then[\s\S]*insert into[\s\S]*route_safety_provider_snapshot_assertions/is
    );

    assert.match(
      source,
      /Existing provider snapshot retrieval assertion set does not match this retry/i
    );

    assert.match(
      source,
      /v_actual_assertion_count[\s\S]*is distinct from[\s\S]*v_expected_assertion_count/is
    );

    assert.match(
      source,
      /assertion set cardinality does not match this retry/i
    );
  }
);

test(
  "does not mutate the legacy HSPP evidence model or immutable three-layer rows",
  () => {
    assert.doesNotMatch(
      source,
      /hspp_evidence/i
    );

    assert.doesNotMatch(
      source,
      /\bupdate\s+public\.route_safety_provider_snapshot/i
    );

    assert.doesNotMatch(
      source,
      /\bdelete\s+from\s+public\.route_safety_provider_snapshot/i
    );

    assert.doesNotMatch(
      source,
      /\btruncate\s+(table\s+)?public\.route_safety_provider_snapshot/i
    );
  }
);