import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/command-center/notifications/resolve/route.ts",
    "utf8"
  );

const uiCaller =
  fs.readFileSync(
    "components/command-center/NotificationCenter.tsx",
    "utf8"
  );

const serviceCaller =
  fs.readFileSync(
    "lib/services/command-center.service.ts",
    "utf8"
  );

test(
  "notification resolve remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: NextRequest\)/
    );
  }
);

test(
  "notification resolve remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "notification resolve requires application/json",
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
        "const body = await req.json().catch(() => ({}));"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(bodyIndex > gateIndex);
  }
);

test(
  "Content-Type gate runs before resolve mutation",
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
  "resolve mutation remains organization and notification scoped",
  () => {
    assert.match(
      route,
      /\.from\("command_center_notifications"\)[\s\S]*?\.update\(\{[\s\S]*?\.eq\("organization_id", organizationId\)[\s\S]*?\.eq\("id", notificationId\)/
    );
  }
);

test(
  "UI resolve caller already sends application/json",
  () => {
    assert.match(
      uiCaller,
      /fetchWithAuth\("\/api\/command-center\/notifications\/resolve"[\s\S]*?method:\s*"POST"/
    );

    assert.match(
      uiCaller,
      /"Content-Type":\s*"application\/json"/
    );

    assert.match(
      uiCaller,
      /body:\s*JSON\.stringify\(/
    );
  }
);

test(
  "service resolve caller sends application/json",
  () => {
    assert.match(
      serviceCaller,
      /fetchWithAuth\("\/api\/command-center\/notifications\/resolve"[\s\S]*?method:\s*"POST"[\s\S]*?headers:\s*\{[\s\S]*?"Content-Type":\s*"application\/json"[\s\S]*?\}[\s\S]*?body:\s*JSON\.stringify\(\{\s*notificationId\s*\}\)/
    );
  }
);
