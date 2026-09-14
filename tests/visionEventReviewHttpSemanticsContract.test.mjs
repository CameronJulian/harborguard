import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/command-center/vision-events/review/route.ts",
    "utf8"
  );

const caller =
  fs.readFileSync(
    "components/command-center/DashcamMonitoring.tsx",
    "utf8"
  );

test(
  "vision-event review remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: Request\)/
    );
  }
);

test(
  "vision-event review remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "vision-event review requires application/json",
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
  "Content-Type gate precedes JSON body parsing",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const bodyIndex =
      route.indexOf(
        "const body = (await req.json()) as ReviewRequest;"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(bodyIndex > gateIndex);
  }
);

test(
  "Content-Type gate precedes vision-event mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const updateIndex =
      route.indexOf(
        ".update({"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(updateIndex > gateIndex);
  }
);

test(
  "vision-event lookup remains organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("vision_events"\)[\s\S]*?\.eq\("id", visionEventId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "vision-event update remains organization scoped",
  () => {
    const updateIndex =
      route.indexOf(
        ".update({"
      );

    const idIndex =
      route.indexOf(
        '.eq("id", visionEventId)',
        updateIndex
      );

    const orgIndex =
      route.indexOf(
        '.eq("organization_id", organizationId)',
        updateIndex
      );

    assert.ok(updateIndex >= 0);
    assert.ok(idIndex > updateIndex);
    assert.ok(orgIndex > idIndex);
  }
);

test(
  "incident lookup remains organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("incidents"\)[\s\S]*?\.eq\("id", incidentId\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "route intelligence preserves organization ownership",
  () => {
    assert.match(
      route,
      /\.from\("route_intelligence"\)[\s\S]*?organization_id:\s*organizationId/
    );
  }
);

test(
  "risk aggregation preserves organization argument",
  () => {
    assert.match(
      route,
      /aggregate_road_risk_intelligence[\s\S]*?p_organization_id:\s*organizationId/
    );
  }
);

test(
  "runtime caller already sends application/json",
  () => {
    assert.match(
      caller,
      /fetchWithAuth\([\s\S]*?"\/api\/command-center\/vision-events\/review"[\s\S]*?method:\s*"POST"/
    );

    assert.match(
      caller,
      /"Content-Type":\s*"application\/json"/
    );

    assert.match(
      caller,
      /body:\s*JSON\.stringify\(\{[\s\S]*?visionEventId:\s*eventId/
    );
  }
);
