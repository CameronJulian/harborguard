import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

const routePath = path.join(
  repoRoot,
  "app",
  "api",
  "dispatch",
  "missions",
  "[id]",
  "evidence",
  "route.ts"
);

const routeSource = fs.readFileSync(routePath, "utf8");

test("mission evidence GET signs only authorized mission Storage paths", () => {
  assert.match(
    routeSource,
    /isMissionEvidenceStorageKey\(filePath,\s*id\)/
  );

  assert.match(
    routeSource,
    /\.from\("mission-evidence"\)/
  );

  assert.match(
    routeSource,
    /\.createSignedUrl\(filePath,\s*600\)/
  );
});

test("mission evidence GET preserves non-matching and non-file evidence", () => {
  assert.match(
    routeSource,
    /if\s*\(!isMissionEvidenceStorageKey\(filePath,\s*id\)\)\s*\{\s*return item;\s*\}/s
  );

  assert.match(
    routeSource,
    /typeof item\.file_path === "string"\s*\?\s*item\.file_path\s*:\s*""/s
  );
});

test("mission evidence GET enriches response without persisting signed URL", () => {
  assert.match(
    routeSource,
    /file_url:\s*signedUrlData\.signedUrl/
  );

  assert.match(
    routeSource,
    /evidence:\s*evidenceWithSignedUrls/
  );

  const insertSection =
    routeSource.split("export async function GET(")[0];

  assert.doesNotMatch(
    insertSection,
    /createSignedUrl/
  );

  assert.doesNotMatch(
    insertSection,
    /signedUrlData\.signedUrl/
  );
});

test("mission evidence signed URL expires after ten minutes", () => {
  assert.match(
    routeSource,
    /\.createSignedUrl\(filePath,\s*600\)/
  );
});
