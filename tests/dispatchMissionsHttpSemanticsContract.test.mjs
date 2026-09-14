import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/dispatch/missions/route.ts",
    "utf8"
  );

const assignmentHelper =
  fs.readFileSync(
    "lib/dispatch/missionAssignment.ts",
    "utf8"
  );

const optimization =
  fs.readFileSync(
    "lib/fleet/optimizationEngine.ts",
    "utf8"
  );

test(
  "dispatch missions remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: NextRequest\)/
    );
  }
);

test(
  "dispatch missions remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "dispatch missions requires application/json",
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
  "authentication precedes media-type enforcement",
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
  "Content-Type gate precedes dispatch mission mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const insertIndex =
      route.indexOf(
        ".insert(result.dispatchMission)"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(insertIndex > gateIndex);
  }
);

test(
  "dispatch mission carries authenticated organization ownership",
  () => {
    assert.match(
      assignmentHelper,
      /const dispatchMission\s*=\s*\{[\s\S]*?organization_id:\s*organizationId/
    );
  }
);

test(
  "dispatch mission uses the tenant-scoped selected vehicle",
  () => {
    assert.match(
      assignmentHelper,
      /assigned_vehicle_id:\s*vehicle\.vehicleId/
    );
  }
);

test(
  "fleet optimization keeps vehicles tenant scoped",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicles"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization keeps locations tenant scoped",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_locations"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization keeps alerts tenant scoped",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization keeps trips tenant scoped",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_trips"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "GET dispatch mission list remains organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("dispatch_missions"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);
