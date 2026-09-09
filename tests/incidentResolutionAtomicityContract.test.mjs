import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260909202300_resolve_incident_with_linked_alert_atomically.sql",
    import.meta.url
  ),
  "utf8"
);

const route = fs.readFileSync(
  new URL(
    "../app/api/incidents/resolve/route.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "incident resolution is owned by one database RPC",
  () => {
    assert.match(
      migration,
      /create\s+or\s+replace\s+function\s+public\.resolve_incident_with_linked_alert\s*\(/i
    );

    assert.match(
      route,
      /\.rpc\(\s*["']resolve_incident_with_linked_alert["']/i
    );
  }
);

test(
  "route no longer directly mutates incidents or vehicle alerts",
  () => {
    assert.doesNotMatch(
      route,
      /\.from\(\s*["']incidents["']\s*\)[\s\S]*?\.update\(/i
    );

    assert.doesNotMatch(
      route,
      /\.from\(\s*["']vehicle_alerts["']\s*\)[\s\S]*?\.update\(/i
    );
  }
);

test(
  "RPC preserves organization authorization boundary",
  () => {
    assert.match(
      migration,
      /auth\.uid\(\)\s+is\s+null/i
    );

    assert.match(
      migration,
      /public\.current_user_org_id\(\)/i
    );

    assert.match(
      migration,
      /v_caller_organization_id\s*<>\s*p_organization_id/i
    );

    assert.match(
      migration,
      /raise\s+exception\s+'Permission denied'/i
    );
  }
);

test(
  "RPC locks incident before lifecycle mutation",
  () => {
    assert.match(
      migration,
      /from\s+public\.incidents\s+as\s+incident_row[\s\S]*?for\s+update/i
    );
  }
);

test(
  "RPC locks linked alert before lifecycle mutation",
  () => {
    assert.match(
      migration,
      /from\s+public\.vehicle_alerts\s+as\s+alert_row[\s\S]*?for\s+update/i
    );
  }
);

test(
  "RPC resolves incident and linked alert inside one function",
  () => {
    assert.match(
      migration,
      /update\s+public\.incidents\s+as\s+incident_row/i
    );

    assert.match(
      migration,
      /update\s+public\.vehicle_alerts\s+as\s+alert_row/i
    );
  }
);

test(
  "incident and linked alert share one resolution timestamp",
  () => {
    assert.match(
      migration,
      /v_now\s+timestamptz\s*:=\s*now\(\)/i
    );

    const resolvedAtAssignments =
      migration.match(
        /resolved_at\s*=\s*v_now/gi
      ) ?? [];

    assert.equal(
      resolvedAtAssignments.length,
      2
    );
  }
);

test(
  "linked alert failure fails the transaction closed",
  () => {
    assert.match(
      migration,
      /Linked vehicle alert not found in incident organization/i
    );

    assert.match(
      migration,
      /Linked vehicle alert did not resolve atomically/i
    );
  }
);

test(
  "RPC execution is closed to public and anon",
  () => {
    assert.match(
      migration,
      /revoke\s+all\s+on\s+function\s+public\.resolve_incident_with_linked_alert[\s\S]*?from\s+public,\s*anon/i
    );

    assert.match(
      migration,
      /grant\s+execute\s+on\s+function\s+public\.resolve_incident_with_linked_alert[\s\S]*?to\s+authenticated/i
    );
  }
);

test(
  "route preserves incident audit logging",
  () => {
    assert.match(
      route,
      /createAuditLog/
    );

    assert.match(
      route,
      /action:\s*["']incident\.resolved["']/i
    );

    assert.match(
      route,
      /atomicLifecycleResolution:\s*true/i
    );
  }
);
