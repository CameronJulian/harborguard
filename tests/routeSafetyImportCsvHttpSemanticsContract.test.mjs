import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/route-safety/import-csv/route.ts",
    "utf8"
  );

const caller =
  fs.readFileSync(
    "app/admin/route-safety-import/page.tsx",
    "utf8"
  );

test(
  "route safety CSV import remains POST",
  () => {
    assert.match(
      route,
      /export async function POST\(req: Request\)/
    );
  }
);

test(
  "CSV import remains organization authenticated",
  () => {
    assert.match(
      route,
      /await requireOrganization\(\)/
    );
  }
);

test(
  "CSV import requires text/csv media type",
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
      /mediaType !== "text\/csv"/
    );

    assert.match(
      route,
      /status:\s*415/
    );

    assert.match(
      route,
      /Content-Type text\/csv is required\./
    );
  }
);

test(
  "media type is normalized before comparison",
  () => {
    assert.match(
      route,
      /contentType[\s\S]*?\.split\(";", 1\)\[0\][\s\S]*?\.trim\(\)[\s\S]*?\.toLowerCase\(\)/
    );
  }
);

test(
  "Content-Type gate runs before body parsing",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "text/csv"'
      );

    const bodyIndex =
      route.indexOf(
        "const text = await req.text();"
      );

    assert.ok(gateIndex >= 0);
    assert.ok(bodyIndex > gateIndex);
  }
);

test(
  "Content-Type gate runs before route safety mutation",
  () => {
    const gateIndex =
      route.indexOf(
        'mediaType !== "text/csv"'
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
  "CSV import still scopes inserted rows to authenticated organization",
  () => {
    assert.match(
      route,
      /organization_id:\s*organizationId/
    );

    assert.match(
      route,
      /\.from\("route_safety_alerts"\)[\s\S]*?\.insert\(rows\)/
    );
  }
);

test(
  "legitimate admin caller already sends text/csv",
  () => {
    assert.match(
      caller,
      /fetchWithAuth\("\/api\/route-safety\/import-csv"/
    );

    assert.match(
      caller,
      /method:\s*"POST"/
    );

    assert.match(
      caller,
      /"Content-Type":\s*"text\/csv"/
    );

    assert.match(
      caller,
      /body:\s*csv/
    );
  }
);
