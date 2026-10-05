import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "automatic off-route recovery requires sustained route deviation",
  () => {
    assert.match(
      page,
      /const AUTO_REROUTE_OFF_ROUTE_THRESHOLD = 45;/,
    );

    assert.match(
      page,
      /const AUTO_REROUTE_ACCURACY_MULTIPLIER = 1\.5;/,
    );

    assert.match(
      page,
      /const AUTO_REROUTE_SUSTAINED_MS = 4000;/,
    );

    assert.match(
      page,
      /offRouteTimerRef\.current\s*=\s*setTimeout\(\(\)\s*=>\s*\{[\s\S]*?void autoRerouteFromCurrentPosition\(\s*latestPosition\s*\);[\s\S]*?\},\s*AUTO_REROUTE_SUSTAINED_MS\);/,
    );
  },
);

test(
  "automatic off-route recovery enforces cooldown and single-request ownership",
  () => {
    assert.match(
      page,
      /const AUTO_REROUTE_COOLDOWN_MS = 15000;/,
    );

    assert.match(
      page,
      /autoRerouteInFlightRef\.current/,
    );

    assert.match(
      page,
      /lastAutoRerouteAtRef\.current[\s\S]{0,500}?AUTO_REROUTE_COOLDOWN_MS/,
    );

    assert.match(
      page,
      /autoRerouteRequestIdRef\.current\s*\+\s*1/,
    );

    assert.match(
      page,
      /autoRerouteAbortControllerRef\.current\?\.\s*abort\(\)/,
    );
  },
);

test(
  "automatic reroute uses the driver's current position and current destination",
  () => {
    assert.match(
      page,
      /origin:\s*\{[\s\S]{0,180}?lat:\s*reroutePosition\.lat[\s\S]{0,180}?lng:\s*reroutePosition\.lng/,
    );

    assert.match(
      page,
      /destination:\s*routingDestination/,
    );

    assert.match(
      page,
      /routingProfile/,
    );

    assert.match(
      page,
      /signal:\s*autoRerouteAbortController\.signal/,
    );
  },
);

test(
  "off-route rerouting is customer-visible while recalculation is active",
  () => {
    assert.match(
      page,
      /setAutoRerouteActive\(true\)/,
    );

    assert.match(
      page,
      /"Off route detected - recalculating\.\.\."/,
    );

    assert.match(
      page,
      /"Off route detected\. Calculating a new safe route\.\.\."/,
    );
  },
);

test(
  "stale automatic reroute responses cannot publish navigation state",
  () => {
    assert.match(
      page,
      /requestId\s*!==\s*autoRerouteRequestIdRef\.current/,
    );

    assert.match(
      page,
      /autoRerouteRequestIdRef\.current\s*\+=\s*1/,
    );

    assert.match(
      page,
      /autoRerouteAbortControllerRef\.current\?\.\s*abort\(\)/,
    );
  },
);

test(
  "navigation termination clears automatic off-route ownership",
  () => {
    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,2200}?autoRerouteRequestIdRef\.current \+= 1/,
    );

    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,2400}?autoRerouteAbortControllerRef\.current\?\.\s*abort\(\)/,
    );

    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,2600}?offRouteStartedAtRef\.current = null/,
    );

    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,2800}?autoRerouteInFlightRef\.current = false/,
    );

    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,4200}?setAutoRerouteActive\(false\)/,
    );

    assert.match(
      page,
      /function endNavigation\(\)[\s\S]{0,4400}?setAutoRerouteMessage\(""\)/,
    );
  },
);