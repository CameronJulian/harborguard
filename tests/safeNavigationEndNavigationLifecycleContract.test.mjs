import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

const endNavigationMatch = page.match(
  /function\s+endNavigation\(\)\s*\{([\s\S]*?)async function searchDestination/,
);

assert.ok(
  endNavigationMatch,
  "Expected endNavigation function",
);

const endNavigationBody = endNavigationMatch[1];

test(
  "End Navigation invalidates async navigation work",
  () => {
    assert.match(
      endNavigationBody,
      /destinationSearchRequestIdRef\.current\s*\+=\s*1;/,
    );

    assert.match(
      endNavigationBody,
      /manualRouteRequestIdRef\.current\s*\+=\s*1;/,
    );

    assert.match(
      endNavigationBody,
      /autoRerouteRequestIdRef\.current\s*\+=\s*1;/,
    );

    assert.match(
      endNavigationBody,
      /autoRerouteAbortControllerRef\.current\?\.abort\(\);/,
    );

    assert.match(
      endNavigationBody,
      /clearOffRouteTimer\(\);/,
    );
  },
);

test(
  "End Navigation stops simulator playback",
  () => {
    assert.match(
      endNavigationBody,
      /pauseSyntheticDrive\(\);/,
    );

    assert.match(
      endNavigationBody,
      /simulatorPointsRef\.current\s*=\s*\[\];/,
    );

    assert.match(
      endNavigationBody,
      /simulatorIndexRef\.current\s*=\s*0;/,
    );
  },
);

test(
  "End Navigation cancels spoken guidance",
  () => {
    assert.match(
      endNavigationBody,
      /window\.speechSynthesis\.cancel\(\);/,
    );

    assert.match(
      endNavigationBody,
      /lastSpokenAnnouncementRef\.current\.clear\(\);/,
    );
  },
);

test(
  "End Navigation clears active route and instruction source",
  () => {
    assert.match(
      endNavigationBody,
      /setRoutes\(\[\]\);/,
    );

    assert.match(
      endNavigationBody,
      /setSelectedRouteIndex\(0\);/,
    );

    assert.match(
      endNavigationBody,
      /setNavigationInstructions\(\[\]\);/,
    );

    assert.match(
      endNavigationBody,
      /setRecommendation\(null\);/,
    );
  },
);

test(
  "active instruction is derived from navigation instructions",
  () => {
    assert.match(
      page,
      /let\s+activeInstructionIndex\s*=[\s\S]{0,180}?navigationInstructions\.length\s*>\s*0/,
    );

    assert.match(
      page,
      /const\s+activeInstruction\s*=\s*activeInstructionIndex\s*>=\s*0[\s\S]{0,160}?navigationInstructions\[/,
    );
  },
);

test(
  "End Navigation clears reroute and routing UI state",
  () => {
    assert.match(
      endNavigationBody,
      /setAutoRerouteActive\(false\);/,
    );

    assert.match(
      endNavigationBody,
      /setAutoRerouteMessage\(""\);/,
    );

    assert.match(
      endNavigationBody,
      /setRouting\(false\);/,
    );

    assert.match(
      endNavigationBody,
      /setFollowVehicle\(true\);/,
    );
  },
);

test(
  "End Navigation retains destination for fresh recalculation",
  () => {
    assert.doesNotMatch(
      endNavigationBody,
      /setDestination\(null\);/,
    );

    assert.doesNotMatch(
      endNavigationBody,
      /setSelectedDestination\(null\);/,
    );

    assert.doesNotMatch(
      endNavigationBody,
      /removeItem\(/,
    );

    assert.match(
      endNavigationBody,
      /Navigation ended\. Destination retained - calculate a route when you are ready\./,
    );
  },
);