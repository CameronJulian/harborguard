import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath =
  path.resolve(
    process.cwd(),
    "app/api/route-safety/reroute/route.ts"
  );

const source =
  fs.readFileSync(
    routePath,
    "utf8"
  );

test(
  "reroute attaches advisory candidate traffic context",
  () => {
    assert.match(
      source,
      /buildCandidateTrafficContext/
    );

    assert.match(
      source,
      /candidateTrafficContext/
    );

    assert.match(
      source,
      /durationSeconds:\s*route\.durationSeconds/
    );

    assert.match(
      source,
      /baseDurationSeconds:\s*route\.baseDurationSeconds/
    );

    assert.match(
      source,
      /trafficDelaySeconds:\s*route\.trafficDelaySeconds/
    );
  }
);

test(
  "candidate traffic context is attached after provider route calculation",
  () => {
    const calculateIndex =
      source.indexOf(
        "await calculateRoutesWithProvider("
      );

    const contextIndex =
      source.indexOf(
        "buildCandidateTrafficContext({"
      );

    assert.ok(
      calculateIndex >= 0,
      "provider route calculation must exist"
    );

    assert.ok(
      contextIndex > calculateIndex,
      "traffic context must be advisory post-processing"
    );
  }
);

test(
  "4F does not alter ranking authority",
  () => {
    assert.doesNotMatch(
      source,
      /rankRoutes\s*\(/
    );

    assert.doesNotMatch(
      source,
      /safetyScore\s*=/
    );

    assert.doesNotMatch(
      source,
      /riskScore\s*=/
    );
  }
);

test(
  "4F does not add provider traffic requests",
  () => {
    assert.doesNotMatch(
      source,
      /traffic\.hereapi\.com/i
    );

    assert.doesNotMatch(
      source,
      /api\.tomtom\.com\/traffic/i
    );

    assert.doesNotMatch(
      source,
      /fetch\s*\(/i
    );
  }
);

test(
  "4F does not write stored traffic observations",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(["']traffic_flow_observations["']\)[\s\S]*?\.(insert|upsert|update)\s*\(/
    );
  }
);

test(
  "both route list and recommended route receive advisory context",
  () => {
    assert.match(
      source,
      /result\.routes\.map\(\s*withCandidateTrafficContext/
    );

    assert.match(
      source,
      /result\?\.recommendedRoute/
    );

    assert.match(
      source,
      /recommendedRoute,/
    );
  }
);
