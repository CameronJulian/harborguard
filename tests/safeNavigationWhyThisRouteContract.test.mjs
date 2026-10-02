import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation explains route safety and risk to the driver",
  () => {
    assert.match(
      page,
      /function\s+routeSafetyExplanation\s*\(/,
    );

    assert.match(
      page,
      /function\s+matchedRiskSegmentLabel\s*\(/,
    );

    assert.match(
      page,
      /Why this route\?/,
    );

    assert.match(
      page,
      /selectedRoute\.safetyScore/,
    );

    assert.match(
      page,
      /selectedRoute\.riskScore/,
    );

    assert.match(
      page,
      /matchedRiskSegmentCount/,
    );

    assert.match(
      page,
      /High safety score with low calculated road risk\./,
    );

    assert.match(
      page,
      /Elevated calculated road risk\./,
    );

    assert.match(
      page,
      /HarborGuard assessment:/,
    );

    assert.match(
      page,
      /\{recommendation\}/,
    );
  },
);

test(
  "Why this route explanation handles matched risk segment grammar",
  () => {
    assert.match(
      page,
      /count === 1 \? "" : "s"/,
    );

    assert.match(
      page,
      /matched road risk segment/,
    );
  },
);

test(
  "Why this route remains presentation-only",
  () => {
    assert.doesNotMatch(
      page,
      /fetch\([^)]*why-this-route/i,
    );

    assert.doesNotMatch(
      page,
      /\.from\(["']road_risk_segments["']\)/,
    );
  },
);