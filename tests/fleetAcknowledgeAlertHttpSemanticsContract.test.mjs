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
  "acknowledge alert requires application/json",
  () => {
    assert.match(
      route,
      /req\.headers\.get\("content-type"\) \|\| ""/
    );

    assert.match(
      route,
      /\.split\(";", 1\)\[0\]/
    );

    assert.match(
      route,
      /mediaType !== "application\/json"/
    );

    assert.match(
      route,
      /status:\s*415/
    );

    assert.match(
      route,
      /Content-Type application\/json is required\./
    );
  }
);

test(
  "application/json media type allows parameters",
  () => {
    assert.match(
      route,
      /contentType[\s\S]*?\.split\(";", 1\)\[0\][\s\S]*?\.trim\(\)[\s\S]*?\.toLowerCase\(\)/
    );
  }
);

test(
  "authentication and role authorization precede media type gate",
  () => {
    const authIndex =
      route.indexOf(
        "await requireOrganization()"
      );

    const roleIndex =
      route.indexOf(
        "requireRole(role, ["
      );

    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    assert.ok(authIndex >= 0);
    assert.ok(roleIndex > authIndex);
    assert.ok(gateIndex > roleIndex);
  }
);

test(
  "Content-Type gate precedes JSON body parsing",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const bodyIndex =
      route.indexOf(
        "const { alertId } = await req.json();"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(bodyIndex > gateIndex);
  }
);

test(
  "tenant ownership lookup remains present",
  () => {
    assert.match(
      route,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.eq\("id", alertId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "cross-tenant alert rejection remains before mutation",
  () => {
    const notFoundIndex =
      route.indexOf(
        "if (!ownedAlert)"
      );

    const mutationIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(notFoundIndex >= 0);
    assert.ok(mutationIndex > notFoundIndex);
  }
);

test(
  "Content-Type gate precedes tenant lookup and mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const lookupIndex =
      route.indexOf(
        '.from("vehicle_alerts")'
      );

    const mutationIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(gateIndex >= 0);
    assert.ok(lookupIndex > gateIndex);
    assert.ok(mutationIndex > lookupIndex);
  }
);

test(
  "acknowledgement still records validated alert id",
  () => {
    assert.match(
      route,
      /vehicle_alert_id:\s*alertId/
    );
  }
);

test(
  "unsupported media type response is non-mutating",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const responseIndex =
      route.indexOf(
        "status: 415"
      );

    const mutationIndex =
      route.indexOf(
        '.from("emergency_response_events")'
      );

    assert.ok(gateIndex >= 0);
    assert.ok(responseIndex > gateIndex);
    assert.ok(mutationIndex > responseIndex);
  }
);
