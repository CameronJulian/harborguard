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

function calculateRouteBody() {
  return sliceBetween(
    "async function calculateRoute()",
    "const currentLatitude ="
  );
}

test(
  "manual recalculation drops old simulator route ownership",
  () => {
    const body = calculateRouteBody();

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
  }
);

test(
  "manual recalculation explicitly reports simulator route replacement",
  () => {
    const body = calculateRouteBody();

    assert.match(
      body,
      /DEV simulator stopped for route recalculation/
    );

    assert.match(
      body,
      /Simulator stopped for route recalculation\./
    );
  }
);

test(
  "manual recalculation supersedes automatic reroute work",
  () => {
    const body = calculateRouteBody();

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
  }
);

test(
  "manual recalculation creates a new request generation and abort controller",
  () => {
    const body = calculateRouteBody();

    assert.match(
      body,
      /const requestId\s*=\s*manualRouteRequestIdRef\.current\s*\+\s*1;/
    );

    assert.match(
      body,
      /manualRouteRequestIdRef\.current\s*=\s*requestId;/
    );

    assert.match(
      body,
      /manualRouteAbortControllerRef\.current\?\.abort\(\);/
    );

    assert.match(
      body,
      /const manualRouteAbortController\s*=\s*new AbortController\(\);/
    );
  }
);

test(
  "manual recalculation uses the current position as the new origin",
  () => {
    const body = calculateRouteBody();

    assert.match(
      body,
      /origin:\s*\{\s*lat:\s*position\.lat,\s*lng:\s*position\.lng,\s*\}/
    );
  }
);

test(
  "manual recalculation retains the selected destination and routing profile",
  () => {
    const body = calculateRouteBody();

    assert.match(
      body,
      /destination:\s*routingDestination/
    );

    assert.match(
      body,
      /routingProfile,/
    );

    assert.doesNotMatch(
      body,
      /setSelectedDestination\(null\);/
    );

    assert.doesNotMatch(
      body,
      /setDestinationLat\(""\);/
    );

    assert.doesNotMatch(
      body,
      /setDestinationLng\(""\);/
    );
  }
);

test(
  "only the newest manual recalculation may publish route state",
  () => {
    const body = calculateRouteBody();

    assert.match(
      body,
      /requestId\s*!==\s*manualRouteRequestIdRef\.current/
    );

    assert.match(
      body,
      /const nextRoutes\s*=\s*result\.routes\s*\?\?\s*\[\];/
    );

    assert.match(
      body,
      /setNavigationInstructions\(/
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
      /setRecommendation\(/
    );

    assert.match(
      body,
      /setFollowVehicle\(true\);/
    );
  }
);