import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperSource =
  fs.readFileSync(
    "lib/security/missionEvidenceStoragePath.ts",
    "utf8"
  );

const routeSource =
  fs.readFileSync(
    "app/api/dispatch/missions/[id]/evidence/route.ts",
    "utf8"
  );

test("mission evidence storage keys are constrained to one safe object segment", () => {
  assert.match(
    helperSource,
    /objectName\.includes\("\/"\)/
  );

  assert.match(
    helperSource,
    /objectName\.includes\("\\\\"\)/
  );

  assert.match(
    helperSource,
    /objectName\.includes\("%"\)/
  );

  assert.match(
    helperSource,
    /objectName === "\.\."/
  );

  assert.match(
    helperSource,
    /\^\[A-Za-z0-9\._-\]\+\$/
  );
});

test("POST rejects malformed mission storage-style keys", () => {
  assert.match(
    routeSource,
    /looksLikeMissionEvidenceStorageKey\(body\.filePath\)/
  );

  assert.match(
    routeSource,
    /!isMissionEvidenceStorageKey\(body\.filePath,\s*id\)/
  );

  assert.match(
    routeSource,
    /Invalid mission evidence storage path/
  );
});

test("GET signs only strict mission-owned storage keys", () => {
  assert.match(
    routeSource,
    /if\s*\(!isMissionEvidenceStorageKey\(filePath,\s*id\)\)\s*\{\s*return item;\s*\}/s
  );

  assert.match(
    routeSource,
    /\.createSignedUrl\(filePath,\s*600\)/
  );

  assert.doesNotMatch(
    routeSource,
    /filePath\.startsWith\(missionStoragePrefix\)/
  );
});

test("plain inline driver filenames do not enter storage-key validation branch", () => {
  assert.match(
    helperSource,
    /value\.startsWith\("missions\/"\)/
  );

  assert.match(
    routeSource,
    /looksLikeMissionEvidenceStorageKey\(body\.filePath\)/
  );
});