import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/fleet/acknowledge-route/route.ts",
    "utf8"
  );

test(
  "acknowledge route remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "acknowledge route requires application/json",
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
  "authentication precedes media type enforcement",
  () => {
    const authIndex =
      route.indexOf(
        "await requireOrganization()"
      );

    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    assert.ok(authIndex >= 0);
    assert.ok(gateIndex > authIndex);
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
        "const body = await req.json();"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(bodyIndex > gateIndex);
  }
);

test(
  "assignment id still comes from the parsed body",
  () => {
    assert.match(
      route,
      /const assignmentId = String\(body\.assignmentId \|\| ""\)\.trim\(\)/
    );
  }
);

test(
  "route assignment mutation remains assignment scoped",
  () => {
    assert.match(
      route,
      /\.from\("route_assignments"\)[\s\S]*?\.eq\("id", assignmentId\)/
    );
  }
);

test(
  "route assignment mutation remains organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("route_assignments"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "assignment id scope precedes organization scope",
  () => {
    const idIndex =
      route.indexOf(
        '.eq("id", assignmentId)'
      );

    const organizationIndex =
      route.indexOf(
        '.eq("organization_id", organizationId)'
      );

    assert.ok(idIndex >= 0);
    assert.ok(organizationIndex > idIndex);
  }
);

test(
  "Content-Type gate precedes route assignment mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const mutationIndex =
      route.indexOf(
        '.from("route_assignments")'
      );

    assert.ok(gateIndex >= 0);
    assert.ok(mutationIndex > gateIndex);
  }
);

test(
  "acknowledged state mutation remains intact",
  () => {
    assert.match(
      route,
      /status:\s*"acknowledged"/
    );

    assert.match(
      route,
      /acknowledged_at:\s*new Date\(\)\.toISOString\(\)/
    );
  }
);

test(
  "unsupported media type response is non-mutating",
  () => {
    const responseIndex =
      route.indexOf(
        "status: 415"
      );

    const mutationIndex =
      route.indexOf(
        '.from("route_assignments")'
      );

    assert.ok(responseIndex >= 0);
    assert.ok(mutationIndex > responseIndex);
  }
);
