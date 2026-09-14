import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/command-center/computer-vision/route.ts",
    "utf8"
  );

const caller =
  fs.readFileSync(
    "components/command-center/ComputerVisionAnalytics.tsx",
    "utf8"
  );

test(
  "computer vision analysis remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: Request\)/
    );
  }
);

test(
  "computer vision POST remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "computer vision POST requires application/json",
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
  "Content-Type gate runs before JSON body parsing",
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
  "Content-Type gate runs before vision event mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "application/json"'
      );

    const insertIndex =
      route.indexOf(
        ".insert(rows)"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(insertIndex > gateIndex);
  }
);

test(
  "computer vision event rows remain organization scoped",
  () => {
    assert.match(
      route,
      /organization_id:\s*organizationId/
    );

    assert.match(
      route,
      /\.from\("vision_events"\)[\s\S]*?\.insert\(rows\)/
    );
  }
);

test(
  "legitimate computer vision caller already sends application/json",
  () => {
    assert.match(
      caller,
      /fetchWithAuth\([\s\S]*?"\/api\/command-center\/computer-vision"[\s\S]*?method:\s*"POST"/
    );

    assert.match(
      caller,
      /"Content-Type":\s*"application\/json"/
    );

    assert.match(
      caller,
      /body:\s*JSON\.stringify\(/
    );
  }
);
