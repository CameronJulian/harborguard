import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource =
  fs.readFileSync(
    "app/api/command-center/anpr/route.ts",
    "utf8"
  );

const dashboardSource =
  fs.readFileSync(
    "components/command-center/ANPRDashboard.tsx",
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

test("ANPR GET is read-only", () => {
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
    /loadANPRDetections\s*\(/
  );

  assert.match(
    getSource,
    /loadPersistedANPRDashboard\s*\(/
  );
});

test("ANPR POST performs explicit provider refresh and persistence", () => {
  const postSource =
    extractFunction(
      routeSource,
      "POST"
    );

  assert.match(
    postSource,
    /loadANPRDetections\s*\(/
  );

  assert.match(
    postSource,
    /\.from\("anpr_events"\)[\s\S]*?\.insert\(rows\)/
  );
});

test("first realtime refresh bootstraps ANPR with POST", () => {
  assert.match(
    dashboardSource,
    /const initialANPRRefreshRef = useRef\(true\);/
  );

  assert.match(
    dashboardSource,
    /initialANPRRefreshRef\.current\s*\?\s*"POST"\s*:\s*"GET"/s
  );

  assert.match(
    dashboardSource,
    /initialANPRRefreshRef\.current = false;/
  );
});

test("later realtime and polling refreshes use GET", () => {
  assert.match(
    dashboardSource,
    /async function loadANPR\(method: "GET" \| "POST" = "GET"\)/
  );

  assert.match(
    dashboardSource,
    /refresh:\s*refreshANPR/
  );

  assert.doesNotMatch(
    dashboardSource,
    /loadOnMount:\s*false/
  );
});

test("manual Refresh ANPR action uses POST", () => {
  assert.match(
    dashboardSource,
    /onClick=\{\(\) => loadANPR\("POST"\)\}/
  );
});

test("dashboard bootstrap does not use a state-setting mount effect", () => {
  assert.doesNotMatch(
    dashboardSource,
    /useEffect\(\(\) => \{[\s\S]*?loadANPR/
  );
});