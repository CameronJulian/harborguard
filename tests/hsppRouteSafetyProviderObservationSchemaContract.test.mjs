import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir =
  path.dirname(fileURLToPath(import.meta.url));

const repoRoot =
  path.resolve(testDir, "..");

const migrationPath =
  path.join(
    repoRoot,
    "supabase",
    "migrations",
    "20260820160000_create_route_safety_provider_observations.sql"
  );

const sql =
  fs.readFileSync(migrationPath, "utf8");

test(
  "HSPP-008B5 creates a dedicated Route Safety provider observation table",
  () => {
    assert.match(
      sql,
      /create table if not exists public\.route_safety_provider_observations/i
    );
  }
);

test(
  "provider observations preserve organization-scoped provider-native identity",
  () => {
    assert.match(
      sql,
      /organization_id uuid not null/i
    );

    assert.match(
      sql,
      /provider text not null/i
    );

    assert.match(
      sql,
      /source_stream text not null/i
    );

    assert.match(
      sql,
      /provider_message_id text not null/i
    );
  }
);

test(
  "provider observation identity is unique without using title or coordinates",
  () => {
    assert.match(
      sql,
      /unique\s*\(\s*organization_id,\s*provider,\s*source_stream,\s*provider_message_id\s*\)/is
    );

    assert.doesNotMatch(
      sql,
      /unique\s*\([^)]*(title|latitude|longitude)[^)]*\)/is
    );
  }
);

test(
  "provider observations distinguish observed received and persisted time",
  () => {
    assert.match(
      sql,
      /observed_at timestamptz not null/i
    );

    assert.match(
      sql,
      /received_at timestamptz not null default now\(\)/i
    );

    assert.match(
      sql,
      /created_at timestamptz not null default now\(\)/i
    );
  }
);

test(
  "provider observations preserve versioned normalized payloads",
  () => {
    assert.match(
      sql,
      /payload_schema_version text not null/i
    );

    assert.match(
      sql,
      /normalized_payload jsonb not null/i
    );

    assert.match(
      sql,
      /jsonb_typeof\(normalized_payload\) = 'object'/i
    );
  }
);

test(
  "provider observation identity fields fail closed on blank values",
  () => {
    assert.match(
      sql,
      /length\(trim\(provider\)\) > 0/i
    );

    assert.match(
      sql,
      /length\(trim\(source_stream\)\) > 0/i
    );

    assert.match(
      sql,
      /length\(trim\(provider_message_id\)\) > 0/i
    );

    assert.match(
      sql,
      /length\(trim\(payload_schema_version\)\) > 0/i
    );
  }
);

test(
  "provider observations use organization RLS and service-role persistence",
  () => {
    assert.match(
      sql,
      /alter table public\.route_safety_provider_observations\s+enable row level security/is
    );

    assert.match(
      sql,
      /organization_id = public\.current_user_org_id\(\)/i
    );

    assert.match(
      sql,
      /grant select\s+on public\.route_safety_provider_observations\s+to authenticated/is
    );

    assert.match(
      sql,
      /grant all\s+on public\.route_safety_provider_observations\s+to service_role/is
    );
  }
);

test(
  "HSPP evidence owns the optional provider-observation relationship",
  () => {
    assert.match(
      sql,
      /alter table public\.hspp_evidence\s+add column if not exists provider_observation_id uuid null/is
    );

    assert.match(
      sql,
      /references public\.route_safety_provider_observations\(id\)\s+on delete restrict/is
    );
  }
);

test(
  "one provider observation can back at most one HSPP evidence record",
  () => {
    assert.match(
      sql,
      /create unique index if not exists\s+hspp_evidence_provider_observation_unique/is
    );

    assert.match(
      sql,
      /on public\.hspp_evidence \(provider_observation_id\)\s+where provider_observation_id is not null/is
    );
  }
);

test(
  "HSPP-008B5 leaves mutable Route Safety alert projection untouched",
  () => {
    assert.doesNotMatch(
      sql,
      /alter table public\.route_safety_alerts/i
    );

    assert.doesNotMatch(
      sql,
      /route_safety_alert_id/i
    );
  }
);

test(
  "HSPP-008B5 does not authorize Crowd or ML usage",
  () => {
    assert.doesNotMatch(
      sql,
      /crowd_eligible\s+(?:boolean\s+)?(?:not null\s+)?default true/i
    );

    assert.doesNotMatch(
      sql,
      /training_eligible\s+(?:boolean\s+)?(?:not null\s+)?default true/i
    );

    assert.doesNotMatch(
      sql,
      /validation_eligible\s+(?:boolean\s+)?(?:not null\s+)?default true/i
    );
  }
);
