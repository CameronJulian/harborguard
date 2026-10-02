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

function routeOptionHandler() {
  const start = source.indexOf(
    "routes.slice(0, 4).map"
  );

  assert.notEqual(
    start,
    -1,
    "Route option map must exist"
  );

  const end = source.indexOf(
    "</button>",
    start
  );

  assert.notEqual(
    end,
    -1,
    "Route option button boundary must exist"
  );

  return source.slice(start, end);
}

test(
  "route option switch stops stale simulator playback",
  () => {
    const body = routeOptionHandler();

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
      /Simulator stopped after route change\./
    );
  }
);

test(
  "route option switch invalidates stale manual route work",
  () => {
    const body = routeOptionHandler();

    assert.match(
      body,
      /manualRouteRequestIdRef\.current\s*\+=\s*1;/
    );

    assert.match(
      body,
      /manualRouteAbortControllerRef\.current\?\.abort\(\);/
    );

    assert.match(
      body,
      /manualRouteAbortControllerRef\.current\s*=\s*null;/
    );

    assert.match(
      body,
      /setRouting\(false\);/
    );
  }
);

test(
  "route option switch invalidates stale automatic reroute work",
  () => {
    const body = routeOptionHandler();

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

    assert.match(
      body,
      /lastAutoRerouteAtRef\.current\s*=\s*0;/
    );
  }
);

test(
  "route option switch clears off-route confirmation state",
  () => {
    const body = routeOptionHandler();

    assert.match(
      body,
      /clearOffRouteTimer\(\);/
    );

    assert.match(
      body,
      /offRouteStartedAtRef\.current\s*=\s*null;/
    );
  }
);

test(
  "route option switch resets stale voice announcement ownership",
  () => {
    const body = routeOptionHandler();

    assert.match(
      body,
      /lastSpokenAnnouncementRef\.current\.clear\(\);/
    );

    assert.match(
      body,
      /overspeedVoiceArmedRef\.current\s*=\s*true;/
    );

    assert.match(
      body,
      /window\.speechSynthesis\.cancel\(\);/
    );
  }
);

test(
  "route option switch publishes the selected route and fresh guidance",
  () => {
    const body = routeOptionHandler();

    assert.match(
      body,
      /setSelectedRouteIndex\(index\);/
    );

    assert.match(
      body,
      /setRecommendation\(null\);/
    );

    assert.match(
      body,
      /setNavigationInstructions\(\s*instructionsForRoute\(route\)\s*\);/
    );

    assert.match(
      body,
      /setFollowVehicle\(true\);/
    );
  }
);

test(
  "DEV simulator rebuilds playback from the newly selected route",
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
  }
);