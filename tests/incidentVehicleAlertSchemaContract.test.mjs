import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "supabase/migrations/20260907150000_add_incidents_vehicle_alert_relationship.sql",
  "utf8",
);

test(
  "incidents gains nullable vehicle_alert_id",
  () => {
    assert.match(
      source,
      /alter\s+table\s+public\.incidents[\s\S]*add\s+column\s+if\s+not\s+exists\s+vehicle_alert_id\s+uuid/i,
    );

    assert.doesNotMatch(
      source,
      /vehicle_alert_id\s+uuid\s+not\s+null/i,
    );
  },
);

test(
  "incident vehicle_alert_id references vehicle_alerts",
  () => {
    assert.match(
      source,
      /foreign\s+key\s*\(\s*vehicle_alert_id\s*\)[\s\S]*references\s+public\.vehicle_alerts\s*\(\s*id\s*\)/i,
    );
  },
);

test(
  "deleting an alert preserves the incident",
  () => {
    assert.match(
      source,
      /on\s+delete\s+set\s+null/i,
    );

    assert.doesNotMatch(
      source,
      /on\s+delete\s+cascade/i,
    );
  },
);

test(
  "incident alert correlation is indexed but not unique",
  () => {
    assert.match(
      source,
      /create\s+index\s+if\s+not\s+exists\s+incidents_vehicle_alert_id_idx/i,
    );

    assert.doesNotMatch(
      source,
      /create\s+unique\s+index/i,
    );

    assert.doesNotMatch(
      source,
      /unique\s*\(\s*vehicle_alert_id\s*\)/i,
    );
  },
);