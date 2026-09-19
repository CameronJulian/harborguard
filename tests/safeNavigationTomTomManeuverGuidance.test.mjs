import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8",
  );

test(
  "safe navigation accepts verified TomTom maneuver guidance",
  () => {
    assert.match(
      source,
      /maneuverGuidance/,
    );

    for (const maneuver of [
      "keepLeft",
      "keepRight",
      "mergeLeftLane",
      "mergeRightLane",
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${maneuver}"`,
        ),
      );
    }
  },
);

test(
  "safe navigation renders polished maneuver guidance phrases",
  () => {
    for (const phrase of [
      "Keep left",
      "Keep right",
      "Merge into the left lane",
      "Merge into the right lane",
    ]) {
      assert.match(
        source,
        new RegExp(phrase),
      );
    }
  },
);

test(
  "safe navigation preserves maneuver guidance on instructions",
  () => {
    assert.match(
      source,
      /maneuverGuidance:\s*action\.maneuverGuidance\s*\?\?\s*null/,
    );
  },
);

test(
  "safe navigation does not invent physical lane topology",
  () => {
    for (const forbidden of [
      "laneGuidance",
      "recommendedLane",
      "recommendedLaneIndex",
      "laneCount",
      "laneArrows",
    ]) {
      assert.doesNotMatch(
        source,
        new RegExp(
          `\\b${forbidden}\\b`,
        ),
      );
    }
  },
);
