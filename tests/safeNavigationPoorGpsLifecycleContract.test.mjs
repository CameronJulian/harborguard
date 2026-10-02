import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation defines poor GPS above 200 meter accuracy",
  () => {
    assert.match(
      page,
      /const\s+GPS_POOR_ACCURACY_METERS\s*=\s*200;/,
    );

    assert.match(
      page,
      /numericAccuracy\s*>\s*GPS_POOR_ACCURACY_METERS/,
    );
  },
);

test(
  "poor GPS suppresses turn ownership and progression",
  () => {
    assert.match(
      page,
      /let\s+activeInstructionIndex\s*=\s*navigationInstructions\.length\s*>\s*0\s*&&\s*!gpsAccuracyPoor\s*\?\s*0\s*:\s*-1;/,
    );

    assert.match(
      page,
      /routeProgress\s*&&\s*!gpsAccuracyPoor[\s\S]{0,1200}?activeInstructionIndex\s*=\s*index;/,
    );
  },
);

test(
  "poor GPS blocks arrival and speed limit guidance",
  () => {
    assert.match(
      page,
      /const\s+hasReachedDestination\s*=\s*gpsActive\s*&&\s*!gpsAccuracyPoor/,
    );

    assert.match(
      page,
      /const\s+activeSpeedLimitKph\s*=\s*gpsActive\s*&&\s*!hasReachedDestination\s*&&\s*!gpsAccuracyPoor/,
    );
  },
);

test(
  "poor GPS suppresses voice guidance",
  () => {
    assert.match(
      page,
      /!voiceEnabled\s*\|\|\s*!gpsActive\s*\|\|\s*gpsAccuracyPoor\s*\|\|\s*routing/,
    );

    assert.match(
      page,
      /!voiceEnabled\s*\|\|\s*gpsAccuracyPoor\s*\|\|\s*!overspeedVoiceArmedRef\.current/,
    );
  },
);

test(
  "poor GPS blocks automatic rerouting and clears pending off-route state",
  () => {
    assert.match(
      page,
      /!gpsActive\s*\|\|\s*gpsAccuracyPoor\s*\|\|[\s\S]{0,500}?clearOffRouteTimer\(\);[\s\S]{0,180}?offRouteStartedAtRef\.current\s*=\s*null;/,
    );

    assert.match(
      page,
      /gpsAccuracyIsPoor\(\s*latestPosition\.accuracy\s*\)[\s\S]{0,220}?offRouteStartedAtRef\.current\s*=\s*null;[\s\S]{0,80}?return;/,
    );
  },
);

test(
  "DEV poor GPS simulator creates a stationary 250 meter accuracy fix",
  () => {
    const poorGpsMatch = page.match(
      /function\s+forceSimulatorPoorGps\(\)\s*\{([\s\S]*?)function\s+pauseSyntheticDrive/,
    );

    assert.ok(
      poorGpsMatch,
      "Expected forceSimulatorPoorGps function",
    );

    const body = poorGpsMatch[1];

    assert.match(
      body,
      /clearSimulatorTimer\(\);/,
    );

    assert.match(
      body,
      /setSimulatorRunning\(false\);/,
    );

    assert.match(
      body,
      /speedKmh:\s*0/,
    );

    assert.match(
      body,
      /accuracy:\s*250/,
    );

    assert.match(
      body,
      /DEV poor GPS - accuracy 250 m\. Waiting for a better location fix\./,
    );

    assert.match(
      body,
      /Poor GPS test active - simulated accuracy 250 m\./,
    );
  },
);

test(
  "transient GPS watch errors remain recoverable while permission denial is terminal",
  () => {
    assert.match(
      page,
      /const\s+isTerminalPermissionError\s*=\s*error\.code\s*===\s*error\.PERMISSION_DENIED;/,
    );

    assert.match(
      page,
      /if\s*\(\s*isTerminalPermissionError\s*&&[\s\S]{0,300}?navigator\.geolocation\.clearWatch/,
    );

    assert.match(
      page,
      /setGpsActive\(!isTerminalPermissionError\);/,
    );
  },
);