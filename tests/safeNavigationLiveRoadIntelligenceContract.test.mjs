import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation reuses Route Safety predict for live road intelligence",
  () => {
    assert.match(
      page,
      /type\s+LiveRoadIntelligence\s*=/,
    );

    assert.match(
      page,
      /trafficRiskLevel:\s*string\s*\|\s*null/,
    );

    assert.match(
      page,
      /averageDelayMinutes:\s*number\s*\|\s*null/,
    );

    assert.match(
      page,
      /overallRiskScore:\s*number\s*\|\s*null/,
    );

    assert.match(
      page,
      /setLiveRoadIntelligence\(/,
    );

    assert.match(
      page,
      /result\?\.traffic\?\.summary\?\.averageDelay/,
    );

    assert.match(
      page,
      /result\?\.trafficRiskLevel/,
    );

    assert.match(
      page,
      /result\?\.riskScore/,
    );
  },
);

test(
  "Safe Navigation shows a compact driver-facing live road conditions summary",
  () => {
    assert.match(
      page,
      /Live road conditions/,
    );

    assert.match(
      page,
      /aria-label="Live road intelligence"/,
    );

    assert.match(
      page,
      /function\s+liveRoadIntelligenceLabel\s*\(/,
    );

    assert.match(
      page,
      /Traffic risk/,
    );

    assert.match(
      page,
      /min delay/,
    );

    assert.match(
      page,
      /Route risk/,
    );
  },
);

test(
  "live road intelligence does not introduce duplicate traffic or weather APIs",
  () => {
    assert.doesNotMatch(
      page,
      /\/api\/traffic-intelligence/,
    );

    assert.doesNotMatch(
      page,
      /\/api\/weather\/current/,
    );

    const predictMatches =
      page.match(
        /\/api\/route-safety\/predict/g,
      ) ?? [];

    assert.equal(
      predictMatches.length,
      2,
      "Expected one explanatory comment and one actual predict endpoint reference.",
    );
  },
);

test(
  "failed prediction work clears customer-facing live road intelligence",
  () => {
    const clearMatches =
      page.match(
        /setLiveRoadIntelligence\(null\)/g,
      ) ?? [];

    assert.ok(
      clearMatches.length >= 3,
      "Expected stale-route, failed-response and catch-path clearing.",
    );
  },
);