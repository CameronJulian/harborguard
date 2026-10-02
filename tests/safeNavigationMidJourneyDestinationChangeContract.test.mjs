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
  "selecting a new destination ends an active navigation lifecycle first",
  () => {
    const body = sliceBetween(
      "destinationResults.map",
      "setDestinationSearching(false);"
    );

    assert.match(
      body,
      /routes\.length\s*>\s*0/
    );

    assert.match(
      body,
      /navigationInstructions\.length\s*>\s*0/
    );

    assert.match(
      body,
      /autoRerouteActive/
    );

    assert.match(
      body,
      /endNavigation\(\);/
    );
  }
);

test(
  "new destination selection invalidates stale destination search ownership",
  () => {
    const body = sliceBetween(
      "destinationResults.map",
      "setRoutingMessage("
    );

    assert.match(
      body,
      /destinationSearchRequestIdRef\.current\s*\+=\s*1;/
    );

    assert.match(
      body,
      /destinationSearchAbortControllerRef\.current\?\.abort\(\);/
    );

    assert.match(
      body,
      /destinationSearchAbortControllerRef\.current\s*=\s*null;/
    );

    assert.match(
      body,
      /setDestinationSearching\(false\);/
    );
  }
);

test(
  "new destination selection invalidates stale manual route ownership",
  () => {
    const body = sliceBetween(
      "destinationResults.map",
      "setRoutingMessage("
    );

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
  "new destination selection invalidates stale automatic reroute ownership",
  () => {
    const body = sliceBetween(
      "destinationResults.map",
      "setRoutingMessage("
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
  }
);

test(
  "new destination result becomes the published destination",
  () => {
    const body = sliceBetween(
      "destinationResults.map",
      "setRoutingMessage("
    );

    assert.match(
      body,
      /setSelectedDestination\(\s*result\s*\);/
    );

    assert.match(
      body,
      /setDestinationName\(\s*result\.title\s*\);/
    );

    assert.match(
      body,
      /setDestinationLat\(\s*String\(result\.lat\)\s*\);/
    );

    assert.match(
      body,
      /setDestinationLng\(\s*String\(result\.lng\)\s*\);/
    );

    assert.match(
      body,
      /setDestinationResults\(\s*\[\]\s*\);/
    );
  }
);

test(
  "route changes clear simulator voice and off-route ownership before replacing guidance",
  () => {
    const body = sliceBetween(
      "onClick={() => {",
      "setFollowVehicle(true);"
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
      /clearOffRouteTimer\(\);/
    );

    assert.match(
      body,
      /offRouteStartedAtRef\.current\s*=\s*null;/
    );

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
  "replacement route publishes fresh instructions and resets route-selection state",
  () => {
    const body = sliceBetween(
      "onClick={() => {",
      "setFollowVehicle(true);"
    );

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
      /lastAutoRerouteAtRef\.current\s*=\s*0;/
    );

    assert.match(
      body,
      /setAutoRerouteMessage\(""\);/
    );

    assert.match(
      body,
      /setNavigationInstructions\(\s*instructionsForRoute\(route\)\s*\);/
    );
  }
);