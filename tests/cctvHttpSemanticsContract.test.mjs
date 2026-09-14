import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource =
  fs.readFileSync(
    "app/api/command-center/cctv/route.ts",
    "utf8"
  );

const clientSource =
  fs.readFileSync(
    "components/command-center/CCTVMonitoring.tsx",
    "utf8"
  );

function extractFunction(source, name) {
  const marker =
    `export async function ${name}`;

  const start =
    source.indexOf(marker);

  assert.notEqual(
    start,
    -1,
    `${name} handler must exist`
  );

  const open =
    source.indexOf("{", start);

  assert.notEqual(
    open,
    -1,
    `${name} opening brace must exist`
  );

  let depth = 0;

  for (
    let index = open;
    index < source.length;
    index += 1
  ) {
    if (source[index] === "{") {
      depth += 1;
    } else if (
      source[index] === "}"
    ) {
      depth -= 1;

      if (depth === 0) {
        return source.slice(
          start,
          index + 1
        );
      }
    }
  }

  throw new Error(
    `Unable to extract ${name}`
  );
}

test("CCTV GET is read-only", () => {
  const getSource =
    extractFunction(
      routeSource,
      "GET"
    );

  assert.doesNotMatch(
    getSource,
    /\.insert\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /\.update\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /\.upsert\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /\.delete\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /loadCCTVCameras\s*\(/
  );

  assert.match(
    getSource,
    /loadPersistedCCTVDashboard\s*\(/
  );
});

test("CCTV POST refreshes provider and persists", () => {
  const postSource =
    extractFunction(
      routeSource,
      "POST"
    );

  assert.match(
    postSource,
    /loadCCTVCameras\s*\(/
  );

  assert.match(
    postSource,
    /\.from\("cctv_events"\)[\s\S]*?\.insert\(rows\)/
  );
});

test("first dashboard load uses POST", () => {
  assert.match(
    clientSource,
    /void loadCCTV\("POST"\);/
  );
});

test("polling and visibility refreshes use GET", () => {
  assert.match(
    clientSource,
    /async function loadCCTV\(method: "GET" \| "POST" = "GET"\)/
  );

  const defaultRefreshCalls =
    clientSource.match(
      /void loadCCTV\(\);/g
    ) || [];

  assert.ok(
    defaultRefreshCalls.length >= 1,
    "polling/visibility refresh must use default GET"
  );
});

test("manual Refresh CCTV uses POST", () => {
  assert.match(
    clientSource,
    /onClick=\{\(\) => loadCCTV\("POST"\)\}/
  );
});