import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation HUD uses six columns for six metrics",
  () => {
    assert.match(
      page,
      /gridTemplateColumns:\s*["']repeat\(6,\s*minmax\(0,\s*1fr\)\)["']/,
    );

    for (const label of [
      "ETA",
      "Distance",
      "Speed Limit",
      "Safety",
      "Risk",
    ]) {
      assert.match(
        page,
        new RegExp(`label=["']${label}["']`),
      );
    }

    assert.match(
      page,
      /\?\s*"OVERSPEED"\s*:\s*"Speed"/,
    );
  },
);

test(
  "Safe Navigation base CSS important rule uses six columns",
  () => {
    assert.match(
      page,
      /\.hg-navigation-metrics\s*\{\s*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
    );
  },
);
test(
  "Safe Navigation Risk metric preserves its empty state fallback",
  () => {
    assert.match(
      page,
      /selectedRoute\?\.riskScore\s*!=\s*null[\s\S]{0,180}\?\s*`\$\{Math\.round\(selectedRoute\.riskScore\)\}`[\s\S]{0,100}:\s*"--"/,
    );
  },
);

test(
  "Safe Navigation six-metric HUD does not use the old five-column layout",
  () => {
    const hudMatch = page.match(
      /gridTemplateColumns:\s*["']repeat\(6,\s*minmax\(0,\s*1fr\)\)["'][\s\S]{0,3000}?label=["']Risk["']/,
    );

    assert.ok(
      hudMatch,
      "Expected six-column Safe Navigation HUD containing the Risk metric",
    );

    assert.doesNotMatch(
      hudMatch[0],
      /repeat\(5,\s*minmax\(0,\s*1fr\)\)/,
    );
  },
);