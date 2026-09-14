import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/fleet/acknowledge-alert/route.ts",
    "utf8"
  );

test(
  "acknowledge alert remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "acknowledge alert preserves role authorization",
  () => {
    assert.match(
      route,
      /requireRole\(role,\s*\[[\s\S]*?"owner"[\s\S]*?"admin"[\s\S]*?"operator"[\s\S]*?"manager"/
    );
  }
);

test(
  "requested alert is looked up before acknowledgement",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.select\("id"\)/
    );
  }
);

test(
  "alert lookup matches the requested alert id",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.eq\("id", alertId\)/
    );
  }
);

test(
  "alert lookup is scoped to authenticated organization",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "alert lookup uses maybeSingle",
  () => {
    assert.match(
      route,
      /\.eq\("organization_id", organizationId\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "missing or foreign alert does not reach event insertion",
  () => {
    const missingIndex =
      route.indexOf(
        "if (!ownedAlert)"
      );

    const insertIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(missingIndex >= 0);
    assert.ok(insertIndex > missingIndex);
  }
);

test(
  "ownership lookup happens before emergency event mutation",
  () => {
    const ownershipIndex =
      route.indexOf(
        '.eq("organization_id", organizationId)'
      );

    const mutationIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(ownershipIndex >= 0);
    assert.ok(mutationIndex > ownershipIndex);
  }
);

test(
  "acknowledgement still records the validated alert id",
  () => {
    assert.match(
      route,
      /vehicle_alert_id:\s*alertId/
    );
  }
);

test(
  "cross-tenant ownership failure returns a non-disclosing not-found response",
  () => {
    assert.match(
      route,
      /if \(!ownedAlert\)[\s\S]*?error:\s*"Alert not found\."[\s\S]*?status:\s*404/
    );
  }
);

test(
  "HTTP hardening preserves the tenant boundary",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const lookupIndex =
      route.indexOf(
        '.from("vehicle_alerts")'
      );

    const alertIdIndex =
      route.indexOf(
        '.eq("id", alertId)'
      );

    const organizationIndex =
      route.indexOf(
        '.eq("organization_id", organizationId)'
      );

    const notFoundIndex =
      route.indexOf(
        "if (!ownedAlert)"
      );

    const mutationIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(gateIndex >= 0);
    assert.ok(lookupIndex > gateIndex);
    assert.ok(alertIdIndex > lookupIndex);
    assert.ok(organizationIndex > alertIdIndex);
    assert.ok(notFoundIndex > organizationIndex);
    assert.ok(mutationIndex > notFoundIndex);
  }
);
