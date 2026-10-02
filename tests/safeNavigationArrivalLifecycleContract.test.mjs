import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation exposes terminal arrival UI state",
  () => {
    assert.match(
      page,
      /hasReachedDestination[\s\S]{0,1200}?"You have arrived"/,
    );

    assert.match(
      page,
      /hasReachedDestination[\s\S]{0,1800}?Arrived at \$\{destinationName\}/,
    );
  },
);

test(
  "arrival invalidates and aborts stale reroute work",
  () => {
    assert.match(
      page,
      /if\s*\(!hasReachedDestination\)\s*\{\s*return;\s*\}[\s\S]{0,1200}?autoRerouteRequestIdRef\.current\s*\+=\s*1;/,
    );

    assert.match(
      page,
      /autoRerouteAbortControllerRef\.current\?\.abort\(\);/,
    );

    assert.match(
      page,
      /autoRerouteInFlightRef\.current\s*=\s*false;/,
    );

    assert.match(
      page,
      /clearOffRouteTimer\(\);/,
    );
  },
);

test(
  "arrival clears reroute UI state",
  () => {
    assert.match(
      page,
      /setAutoRerouteActive\(false\);/,
    );

    assert.match(
      page,
      /setAutoRerouteMessage\(""\);/,
    );
  },
);

test(
  "arrival supports audible destination guidance",
  () => {
    assert.match(
      page,
      /You have arrived at \$\{destinationName\}/,
    );

    assert.match(
      page,
      /Destination is on the \$\{arrivalSide\}/,
    );
  },
);

test(
  "simulator playback includes final route point and stops at destination",
  () => {
    assert.match(
      page,
      /const finalPoint\s*=\s*routePoints\[routePoints\.length\s*-\s*1\]/,
    );

    assert.match(
      page,
      /points\.push\(finalPoint\)/,
    );

    assert.match(
      page,
      /index\s*>=\s*points\.length\s*-\s*1[\s\S]{0,120}?\?\s*0/,
    );
  },
);