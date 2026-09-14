import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource =
  fs.readFileSync(
    "app/api/command-center/dashcam/route.ts",
    "utf8"
  );

const clientSource =
  fs.readFileSync(
    "components/command-center/DashcamMonitoring.tsx",
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
    } else if (source[index] === "}") {
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

test("dashcam GET is read-only", () => {
  const getSource =
    extractFunction(
      routeSource,
      "GET"
    );

  assert.doesNotMatch(
    getSource,
    /\.(insert|update|upsert|delete)\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /loadDashcams\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /analyseNewDashcamSnapshots\s*\(/
  );

  assert.doesNotMatch(
    getSource,
    /analyseFrame\s*\(/
  );
});

test("dashcam POST owns provider refresh and persistence", () => {
  const postSource =
    extractFunction(
      routeSource,
      "POST"
    );

  assert.match(
    postSource,
    /loadDashcams\s*\(/
  );

  assert.match(
    postSource,
    /\.from\("dashcam_events"\)[\s\S]*?\.insert\(rows\)/
  );
});

test("dashcam POST owns automatic vision trigger", () => {
  const postSource =
    extractFunction(
      routeSource,
      "POST"
    );

  assert.match(
    postSource,
    /analyseNewDashcamSnapshots\s*\(/
  );
});

test("first dashboard load uses POST", () => {
  assert.match(
    clientSource,
    /void loadDashcams\("POST"\);/
  );
});

test("polling and visibility refresh use GET", () => {
  assert.match(
    clientSource,
    /async function loadDashcams\(method: "GET" \| "POST" = "GET"\)/
  );

  assert.match(
    clientSource,
    /void loadDashcams\(\);/
  );
});

test("manual Refresh Cameras uses POST", () => {
  assert.match(
    clientSource,
    /onClick=\{\(\) => loadDashcams\("POST"\)\}/
  );
});

test("GET polling preserves the latest automatic vision result", () => {
  assert.match(
    clientSource,
    /if \(method === "POST"\) \{[\s\S]*?setAutomaticVision/
  );
});