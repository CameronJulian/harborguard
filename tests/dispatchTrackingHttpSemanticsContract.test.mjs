import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/dispatch/tracking/route.ts",
    "utf8"
  );

const mapClient =
  fs.readFileSync(
    "components/command-center/LiveFleetOperationsMap.tsx",
    "utf8"
  );

const dashboardClient =
  fs.readFileSync(
    "components/command-center/LiveMissionTrackingDashboard.tsx",
    "utf8"
  );

function extractFunction(source, marker) {
  const start =
    source.indexOf(marker);

  assert.notEqual(
    start,
    -1,
    `${marker} must exist`
  );

  const open =
    source.indexOf("{", start);

  assert.notEqual(
    open,
    -1
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
    `Unable to extract ${marker}`
  );
}

test(
  "Dispatch Tracking GET is read-only",
  () => {
    const getSource =
      extractFunction(
        route,
        "export async function GET"
      );

    assert.match(
      getSource,
      /loadTracking\(false\)/
    );

    assert.doesNotMatch(
      getSource,
      /\.(insert|update|upsert|delete)\s*\(/
    );

    assert.doesNotMatch(
      getSource,
      /createMissionTimelineEvent\s*\(/
    );
  }
);

test(
  "Dispatch Tracking POST requires JSON and owns transition authority",
  () => {
    const postSource =
      extractFunction(
        route,
        "export async function POST"
      );

    assert.match(
      postSource,
      /application\/json/
    );

    assert.match(
      postSource,
      /request\.json\(\)/
    );

    assert.match(
      postSource,
      /loadTracking\(true\)/
    );
  }
);

test(
  "automatic mission transitions use status compare-and-set",
  () => {
    assert.match(
      route,
      /\.update\(update\)[\s\S]*?\.eq\(\s*"organization_id"[\s\S]*?\.eq\("id", mission\.id\)[\s\S]*?\.eq\(\s*"status",\s*previousStatus\s*\)[\s\S]*?\.select\("id, status"\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "only the compare-and-set winner creates a timeline event",
  () => {
    assert.match(
      route,
      /if \(transitionedMission\) \{[\s\S]*?createMissionTimelineEvent/
    );

    assert.match(
      route,
      /source:\s*"dispatch_tracking_auto"/
    );

    assert.match(
      route,
      /fromStatus:[\s\S]*?previousStatus/
    );

    assert.match(
      route,
      /toStatus:[\s\S]*?transitionedMission\.status/
    );
  }
);

test(
  "CAS loser does not claim an auto transition",
  () => {
    assert.match(
      route,
      /else \{\s*autoTransition = null;\s*\}/
    );
  }
);

for (const [
  name,
  source,
] of [
  [
    "LiveFleetOperationsMap",
    mapClient,
  ],
  [
    "LiveMissionTrackingDashboard",
    dashboardClient,
  ],
]) {
  test(
    `${name} preserves automatic transition cadence with JSON POST`,
    () => {
      assert.match(
        source,
        /fetchWithAuth\("\/api\/dispatch\/tracking", \{[\s\S]*?method: "POST"/
      );

      assert.match(
        source,
        /"Content-Type": "application\/json"/
      );

      assert.match(
        source,
        /body: JSON\.stringify\(\{\}\)/
      );

      assert.match(
        source,
        /pollingMs:\s*15000/
      );

      assert.match(
        source,
        /onClick=\{loadTracking\}/
      );
    }
  );
}

test(
  "tracking engine keeps HSPP gate before automatic transition evaluation",
  () => {
    const hsppIndex =
      route.indexOf(
        "readHsppEvidenceForOperationalUse"
      );

    const transitionIndex =
      route.indexOf(
        'previousStatus === "Accepted"'
      );

    assert.ok(
      hsppIndex >= 0
    );

    assert.ok(
      transitionIndex > hsppIndex
    );
  }
);