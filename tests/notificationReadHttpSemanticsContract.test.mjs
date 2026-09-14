import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/command-center/notifications/read/route.ts",
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
  "notification read remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: NextRequest\)/
    );
  }
);

test(
  "notification read remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "notification read requires application/json",
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
  "Content-Type gate runs before notification mutation",
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
  "notification mutations remain organization scoped",
  () => {
    assert.match(
      route,
      /\.from\("command_center_notifications"\)[\s\S]*?\.update\(\{[\s\S]*?\.eq\("organization_id", organizationId\)/
    );

    assert.match(
      route,
      /if \(!markAll && notificationId\)[\s\S]*?query = query\.eq\("id", notificationId\)/
    );
  }
);

test(
  "markAll remains limited by organization scope",
  () => {
    const orgFilterIndex =
      route.indexOf(
        '.eq("organization_id", organizationId)'
      );

    const markAllBranchIndex =
      route.indexOf(
        "if (!markAll && notificationId)"
      );

    assert.ok(orgFilterIndex >= 0);
    assert.ok(markAllBranchIndex > orgFilterIndex);
  }
);

test(
  "UI caller already sends application/json",
  () => {
    assert.match(
      uiCaller,
      /fetchWithAuth\("\/api\/command-center\/notifications\/read"[\s\S]*?method:\s*"POST"/
    );

    assert.match(
      uiCaller,
      /"Content-Type":\s*"application\/json"/
    );

    assert.match(
      uiCaller,
      /body:\s*JSON\.stringify\(\{[\s\S]*?notificationId:\s*id/
    );
  }
);

test(
  "service caller sends application/json for notification read",
  () => {
    assert.match(
      serviceCaller,
      /fetchWithAuth\("\/api\/command-center\/notifications\/read"[\s\S]*?method:\s*"POST"[\s\S]*?headers:\s*\{[\s\S]*?"Content-Type":\s*"application\/json"[\s\S]*?\}[\s\S]*?body:\s*JSON\.stringify\(\{\s*notificationId\s*\}\)/
    );
  }
);
