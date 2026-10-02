import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pagePath = new URL(
  "../app/safe-navigation/page.tsx",
  import.meta.url
);

const source = fs.readFileSync(pagePath, "utf8");

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    `Missing start marker: ${startMarker}`
  );

  const end = source.indexOf(
    endMarker,
    start + startMarker.length
  );

  assert.notEqual(
    end,
    -1,
    `Missing end marker after ${startMarker}: ${endMarker}`
  );

  return source.slice(start, end);
}

test(
  "manual route calculation invalidates previous simulator route ownership",
  () => {
    const body = sliceBetween(
      "async function calculateRoute()",
      "const currentLatitude ="
    );

    assert.match(
      body,
      /navigationOwnsSimulatorRouteRef\.current\s*=\s*false;/
    );

    assert.match(
      body,
      /clearSimulatorTimer\(\);/
    );

    assert.match(
      body,
      /setSimulatorRunning\(false\);/
    );

    assert.match(
      body,
      /simulatorPointsRef\.current\s*=\s*\[\];/
    );

    assert.match(
      body,
      /simulatorIndexRef\.current\s*=\s*0;/
    );

    assert.match(
      body,
      /DEV simulator stopped for route recalculation/
    );
  }
);

test(
  "new manual journey invalidates stale automatic reroute work",
  () => {
    const body = sliceBetween(
      "async function calculateRoute()",
      "const currentLatitude ="
    );

    assert.match(
      body,
      /autoRerouteRequestIdRef\.current\s*\+=\s*1;/
    );

    assert.match(
      body,
      /autoRerouteAbortControllerRef\.current\?\.abort\(\);/
    );

    assert.match(
      body,
      /autoRerouteAbortControllerRef\.current\s*=\s*null;/
    );

    assert.match(
      body,
      /autoRerouteInFlightRef\.current\s*=\s*false;/
    );

    assert.match(
      body,
      /setAutoRerouteActive\(false\);/
    );

    assert.match(
      body,
      /setAutoRerouteMessage\(""\);/
    );
  }
);

test(
  "successful new journey publishes fresh route and instructions",
  () => {
    const body = sliceBetween(
      "async function calculateRoute()",
      "const currentLatitude ="
    );

    assert.match(
      body,
      /const\s+nextRoutes\s*=\s*result\.routes\s*\?\?\s*\[\];/
    );

    assert.match(
      body,
      /navigationOwnsSimulatorRouteRef\.current\s*=\s*nextRoutes\.length\s*>\s*0;/
    );

    assert.match(
      body,
      /setNavigationInstructions\([\s\S]*?instructionsForRoute\([\s\S]*?nextRoutes\[0\][\s\S]*?result\.recommendedRoute/
    );

    assert.match(
      body,
      /setRoutes\(nextRoutes\);/
    );

    assert.match(
      body,
      /setSelectedRouteIndex\(0\);/
    );

    assert.match(
      body,
      /lastAutoRerouteAtRef\.current\s*=\s*0;/
    );

    assert.match(
      body,
      /setFollowVehicle\(true\);/
    );
  }
);

test(
  "arrival is derived from the current journey instead of stored as stale terminal state",
  () => {
    const body = sliceBetween(
      "const destinationDistanceMeters =",
      "const activeSpeedLimitKph ="
    );

    assert.match(
      body,
      /const\s+destinationDistanceMeters\s*=[\s\S]*?currentPosition\s*&&\s*arrivalTarget/
    );

    assert.match(
      body,
      /const\s+hasReachedDestination\s*=\s*gpsActive\s*&&/
    );

    assert.match(
      body,
      /navigationInstructions\.length\s*>\s*0/
    );

    assert.match(
      body,
      /activeInstructionIndex\s*>=[\s\S]*?navigationInstructions\.length\s*-\s*2/
    );

    assert.match(
      body,
      /destinationDistanceMeters\s*!=\s*null/
    );

    assert.match(
      body,
      /destinationDistanceMeters\s*<=\s*arrivalThresholdMeters/
    );
  }
);

test(
  "arrival stops stale auto reroute ownership before another journey begins",
  () => {
    assert.match(
      source,
      /autoRerouteRequestIdRef\.current\s*\+=\s*1;[\s\S]*?autoRerouteAbortControllerRef\.current\?\.abort\(\);[\s\S]*?autoRerouteInFlightRef\.current\s*=\s*false;[\s\S]*?clearOffRouteTimer\(\);[\s\S]*?offRouteStartedAtRef\.current\s*=\s*null;/
    );

    assert.match(
      source,
      /const\s+normalizeArrivalState\s*=[\s\S]*?setAutoRerouteActive\(false\);[\s\S]*?setAutoRerouteMessage\(""\);/
    );
  }
);

test(
  "route replacement resets spoken instruction ownership",
  () => {
    assert.match(
      source,
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?lastSpokenAnnouncementRef\.current\.clear\(\);[\s\S]*?window\.speechSynthesis\.cancel\(\);[\s\S]*?\},\s*\[[\s\S]*?selectedRoute,[\s\S]*?navigationInstructions,[\s\S]*?\]\);/
    );
  }
);

test(
  "DEV simulator can build playback for the newly owned route",
  () => {
    const body = sliceBetween(
      "function startSyntheticDrive()",
      "function endNavigation()"
    );

    assert.match(
      body,
      /if\s*\(!navigationOwnsSimulatorRouteRef\.current\)/
    );

    assert.match(
      body,
      /let\s+points\s*=\s*simulatorPointsRef\.current;/
    );

    assert.match(
      body,
      /if\s*\(points\.length\s*<\s*2\)[\s\S]*?buildSimulatorPlaybackPoints\(\)/
    );

    assert.match(
      body,
      /simulatorPointsRef\.current\s*=\s*points;/
    );

    assert.match(
      body,
      /simulatorIndexRef\.current\s*=\s*0;/
    );

    assert.match(
      body,
      /setSimulatorRunning\(true\);/
    );

    assert.match(
      body,
      /applySimulatorPoint\([\s\S]*?simulatorIndexRef\.current/
    );
  }
);