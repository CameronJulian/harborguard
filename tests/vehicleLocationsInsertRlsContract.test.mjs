import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260907143000_add_vehicle_locations_authenticated_insert_policy.sql";

const source =
  readFileSync(
    migrationPath,
    "utf8",
  );

test(
  "vehicle_locations authenticated inserts are explicitly authorized",
  () => {
    assert.match(
      source,
      /create\s+policy\s+"Users can insert vehicle locations in their organization"/i,
    );

    assert.match(
      source,
      /on\s+public\.vehicle_locations[\s\S]*for\s+insert[\s\S]*to\s+authenticated/i,
    );
  },
);

test(
  "vehicle_locations insert policy requires caller organization membership",
  () => {
    assert.match(
      source,
      /vehicle_locations\.organization_id\s+in\s*\([\s\S]*select\s+profiles\.organization_id[\s\S]*from\s+public\.profiles[\s\S]*profiles\.id\s*=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "vehicle_locations insert policy requires vehicle and organization agreement",
  () => {
    assert.match(
      source,
      /exists\s*\([\s\S]*from\s+public\.vehicles\s+as\s+vehicle[\s\S]*vehicle\.id\s*=\s*vehicle_locations\.vehicle_id[\s\S]*vehicle\.organization_id\s*=\s*vehicle_locations\.organization_id/i,
    );
  },
);

test(
  "vehicle_locations insert policy validates optional trip ownership",
  () => {
    assert.match(
      source,
      /vehicle_locations\.trip_id\s+is\s+null[\s\S]*or\s+exists\s*\([\s\S]*from\s+public\.vehicle_trips\s+as\s+trip/i,
    );

    assert.match(
      source,
      /trip\.id\s*=\s*vehicle_locations\.trip_id/i,
    );

    assert.match(
      source,
      /trip\.organization_id\s*=\s*vehicle_locations\.organization_id/i,
    );

    assert.match(
      source,
      /trip\.vehicle_id\s*=\s*vehicle_locations\.vehicle_id/i,
    );
  },
);

test(
  "vehicle_locations insert policy never degrades to unconditional authorization",
  () => {
    assert.doesNotMatch(
      source,
      /with\s+check\s*\(\s*true\s*\)/i,
    );
  },
);