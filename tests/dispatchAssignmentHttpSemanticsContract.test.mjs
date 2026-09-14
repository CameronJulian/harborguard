import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/dispatch/assignment/route.ts",
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
  "dispatch assignment remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: NextRequest\)/
    );
  }
);

test(
  "dispatch assignment remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "dispatch assignment requires application/json",
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
  "Content-Type gate precedes route-assignment mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const insertIndex =
      route.indexOf(
        ".insert(result.routeAssignment)"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(insertIndex > gateIndex);
  }
);

test(
  "route assignment carries authenticated organization ownership",
  () => {
    assert.match(
      assignmentHelper,
      /const routeAssignment\s*=\s*\{[\s\S]*?organization_id:\s*organizationId/
    );

    assert.match(
      assignmentHelper,
      /vehicle_id:\s*vehicle\.vehicleId/
    );
  }
);

test(
  "dispatch mission shape also carries authenticated organization ownership",
  () => {
    assert.match(
      assignmentHelper,
      /const dispatchMission\s*=\s*\{[\s\S]*?organization_id:\s*organizationId/
    );
  }
);

test(
  "fleet optimization scopes vehicles to the organization",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicles"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization scopes vehicle locations to the organization",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_locations"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization scopes vehicle alerts to the organization",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_alerts"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "fleet optimization scopes vehicle trips to the organization",
  () => {
    assert.match(
      optimization,
      /\.from\("vehicle_trips"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "selected dispatch candidates originate from tenant-scoped vehicles",
  () => {
    assert.match(
      optimization,
      /const candidates = \(vehiclesResult\.data \|\| \[\]\)\.map/
    );

    assert.match(
      optimization,
      /vehicleId:\s*vehicle\.id/
    );

    assert.match(
      optimization,
      /bestCandidate:\s*candidates\[0\] \|\| null/
    );
  }
);
