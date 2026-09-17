import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard =
  fs.readFileSync(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8"
  );

test("dashboard redirects authenticated users without an organization to onboarding", () => {
  assert.match(
    dashboard,
    /if\s*\(\s*!profile\?\.organization_id\s*\)\s*\{[\s\S]*?window\.location\.replace\(\s*["']\/onboarding["']\s*\)[\s\S]*?return\s*;[\s\S]*?\}/
  );
});

test("dashboard does not silently return when organization_id is missing", () => {
  assert.doesNotMatch(
    dashboard,
    /if\s*\(\s*!profile\?\.organization_id\s*\)\s*return\s*;/
  );
});