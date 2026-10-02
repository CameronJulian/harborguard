import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation restores destination convenience only after refresh",
  () => {
    assert.match(
      page,
      /Destination restored after refresh\. Calculate a route when you are ready\./,
    );

    assert.match(
      page,
      /const\s+hasRecoverableDestination\s*=/,
    );

    assert.match(
      page,
      /destinationLat/,
    );

    assert.match(
      page,
      /destinationLng/,
    );

    assert.match(
      page,
      /destinationName/,
    );

    assert.match(
      page,
      /selectedDestination/,
    );

    assert.match(
      page,
      /routingProfile/,
    );
  },
);

test(
  "Safe Navigation does not restore active navigation state after refresh",
  () => {
    assert.doesNotMatch(
      page,
      /gpsWasActive\s*:/,
    );

    assert.doesNotMatch(
      page,
      /parsed\.gpsWasActive/,
    );

    assert.doesNotMatch(
      page,
      /Navigation restored after refresh\./,
    );

    assert.match(
      page,
      /setRoutes\(\[\]\)/,
    );

    assert.match(
      page,
      /setNavigationInstructions\(\[\]\)/,
    );

    assert.match(
      page,
      /setRecommendation\(null\)/,
    );

    assert.match(
      page,
      /setVoiceEnabled\(false\)/,
    );
  },
);

test(
  "Refresh persistence payload excludes active route state",
  () => {
    const persistMatch = page.match(
      /sessionStorage\.setItem\([\s\S]*?JSON\.stringify\(\{([\s\S]*?)\}\)/,
    );

    assert.ok(
      persistMatch,
      "Expected destination persistence block",
    );

    const payload =
      persistMatch[1];

    for (const field of [
      "destinationLat",
      "destinationLng",
      "destinationName",
      "selectedDestination",
      "routingProfile",
    ]) {
      assert.match(
        payload,
        new RegExp(`\\b${field}\\b`),
      );
    }

    for (const forbidden of [
      "routes",
      "selectedRouteIndex",
      "navigationInstructions",
      "recommendation",
      "routingMessage",
      "followVehicle",
      "voiceEnabled",
      "gpsWasActive",
    ]) {
      assert.doesNotMatch(
        payload,
        new RegExp(`\\b${forbidden}\\b`),
      );
    }
  },
);

test(
  "End Navigation no longer deletes destination recovery storage",
  () => {
    const endNavigationMatch = page.match(
      /function\s+endNavigation\(\)\s*\{([\s\S]*?)async function searchDestination/,
    );

    assert.ok(
      endNavigationMatch,
      "Expected endNavigation function",
    );

    assert.doesNotMatch(
      endNavigationMatch[1],
      /sessionStorage\.removeItem\(/,
    );

    assert.match(
      endNavigationMatch[1],
      /setRoutes\(\[\]\)/,
    );

    assert.match(
      endNavigationMatch[1],
      /setNavigationInstructions\(\[\]\)/,
    );

    assert.match(
      endNavigationMatch[1],
      /setRecommendation\(null\)/,
    );
  },
);