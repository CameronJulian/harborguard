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

function routingProfileHandler() {
  const start = source.indexOf(
    'aria-label="Routing preference"'
  );

  assert.notEqual(
    start,
    -1,
    "Routing preference selector must exist"
  );

  const end = source.indexOf(
    "</select>",
    start
  );

  assert.notEqual(
    end,
    -1,
    "Routing preference selector boundary must exist"
  );

  return source.slice(start, end);
}

test(
  "active routing-profile changes terminate the existing navigation lifecycle",
  () => {
    const body = routingProfileHandler();

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
  "inactive routing-profile changes invalidate stale manual route work",
  () => {
    const body = routingProfileHandler();

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
  "inactive routing-profile changes invalidate stale automatic reroute work",
  () => {
    const body = routingProfileHandler();

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
  "new routing profile is published only after prior lifecycle cleanup",
  () => {
    const body = routingProfileHandler();

    const endNavigationIndex =
      body.indexOf("endNavigation();");

    const setProfileIndex =
      body.indexOf("setRoutingProfile(");

    assert.notEqual(
      endNavigationIndex,
      -1,
      "endNavigation must exist in the active-profile path"
    );

    assert.notEqual(
      setProfileIndex,
      -1,
      "setRoutingProfile must exist"
    );

    assert.ok(
      endNavigationIndex < setProfileIndex,
      "existing navigation must be terminated before the new profile is stored"
    );

    assert.match(
      body,
      /setRoutingProfile\(\s*nextRoutingProfile\s*\);/
    );
  }
);

test(
  "profile change requires explicit route recalculation",
  () => {
    const body = routingProfileHandler();

    assert.match(
      body,
      /Routing preference changed\. Calculate a new route\./
    );

    assert.doesNotMatch(
      body,
      /calculateRoute\(\);/
    );
  }
);

test(
  "endNavigation clears route simulator voice and reroute ownership",
  () => {
    const body = sliceBetween(
      "function endNavigation()",
      "async function searchDestination()"
    );

    assert.match(
      body,
      /navigationOwnsSimulatorRouteRef\.current\s*=\s*false;/
    );

    assert.match(
      body,
      /pauseSyntheticDrive\(\);/
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
      /window\.speechSynthesis\.cancel\(\);/
    );

    assert.match(
      body,
      /lastSpokenAnnouncementRef\.current\.clear\(\);/
    );

    assert.match(
      body,
      /setRoutes\(\[\]\);/
    );

    assert.match(
      body,
      /setNavigationInstructions\(\[\]\);/
    );

    assert.match(
      body,
      /setRecommendation\(null\);/
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
  "manual route calculation sends the selected routing profile to the API",
  () => {
    const body = sliceBetween(
      "async function calculateRoute()",
      "const currentLatitude ="
    );

    assert.match(
      body,
      /"\/api\/route-safety\/reroute"/
    );

    assert.match(
      body,
      /body:\s*JSON\.stringify\(\{[\s\S]*?routingProfile,/
    );
  }
);