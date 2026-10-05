import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

test(
  "refresh recovery exposes an explicit Resume Journey state",
  () => {
    assert.match(
      page,
      /refreshRecoveryAvailable/
    );

    assert.match(
      page,
      /setRefreshRecoveryAvailable\(true\)/
    );

    assert.match(
      page,
      /Resume Journey/
    );
  }
);

test(
  "refresh still restores destination convenience only",
  () => {
    assert.match(
      page,
      /setDestinationLat\(/
    );

    assert.match(
      page,
      /setDestinationLng\(/
    );

    assert.match(
      page,
      /setDestinationName\(/
    );

    assert.match(
      page,
      /setSelectedDestination\(/
    );

    assert.match(
      page,
      /setRoutingProfile\(/
    );

    assert.match(
      page,
      /setRoutes\(\[\]\)/
    );

    assert.match(
      page,
      /setNavigationInstructions\(\[\]\)/
    );

    assert.match(
      page,
      /setRecommendation\(null\)/
    );

    assert.match(
      page,
      /setVoiceEnabled\(false\)/
    );
  }
);

test(
  "refresh persistence still excludes stale active navigation state",
  () => {
    const persistMatch =
      page.match(
        /sessionStorage\.setItem\([\s\S]*?JSON\.stringify\(\{([\s\S]*?)\}\)/
      );

    assert.ok(
      persistMatch,
      "Expected refresh persistence payload."
    );

    const payload =
      persistMatch[1];

    for (const allowed of [
      "destinationLat",
      "destinationLng",
      "destinationName",
      "selectedDestination",
      "routingProfile",
    ]) {
      assert.match(
        payload,
        new RegExp(
          `\\b${allowed}\\b`
        )
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
      "position",
      "routePoints",
    ]) {
      assert.doesNotMatch(
        payload,
        new RegExp(
          `\\b${forbidden}\\b`
        )
      );
    }
  }
);

test(
  "Resume Journey reuses the existing calculateRoute action",
  () => {
    assert.match(
      page,
      /onClick=\{calculateRoute\}/
    );

    assert.match(
      page,
      /refreshRecoveryAvailable[\s\S]*?Resume Journey/
    );
  }
);

test(
  "calculateRoute requires current live GPS position",
  () => {
    const start =
      page.indexOf(
        "async function calculateRoute()"
      );

    assert.ok(
      start >= 0,
      "calculateRoute not found"
    );

    const nextFunction =
      page.indexOf(
        "\n  function ",
        start + 30
      );

    const block =
      page.slice(
        start,
        nextFunction > start
          ? nextFunction
          : start + 12000
      );

    assert.match(
      block,
      /if \(!gpsActive \|\| !position\)/
    );

    assert.match(
      block,
      /Start GPS before calculating a route\./
    );

    assert.match(
      block,
      /origin:\s*\{[\s\S]*?lat:\s*position\.lat,[\s\S]*?lng:\s*position\.lng/
    );
  }
);

test(
  "Resume Journey does not restore previous route geometry",
  () => {
    const recoveryStart =
      page.indexOf(
        "const refreshRecoveryStorageKey"
      );

    const recoveryEnd =
      page.indexOf(
        "useEffect(() => {",
        recoveryStart + 50
      );

    assert.ok(
      recoveryStart >= 0
    );

    const recoveryArea =
      page.slice(
        recoveryStart,
        recoveryStart + 5000
      );

    assert.doesNotMatch(
      recoveryArea,
      /parsed\.routes/
    );

    assert.doesNotMatch(
      recoveryArea,
      /parsed\.navigationInstructions/
    );

    assert.doesNotMatch(
      recoveryArea,
      /parsed\.position/
    );

    assert.doesNotMatch(
      recoveryArea,
      /parsed\.gpsWasActive/
    );
  }
);

test(
  "fresh route success completes refresh recovery",
  () => {
    const start =
      page.indexOf(
        "async function calculateRoute()"
      );

    const end =
      page.indexOf(
        "function ",
        start + 30
      );

    const block =
      page.slice(
        start,
        end > start
          ? end
          : start + 10000
      );

    assert.match(
      block,
      /if \(nextRoutes\.length > 0\) \{[\s\S]*?setRefreshRecoveryAvailable\(false\)/
    );
  }
);

test(
  "failed or empty route calculation does not falsely complete recovery",
  () => {
    const successIndex =
      page.indexOf(
        "setRefreshRecoveryAvailable(false)",
        page.indexOf(
          "async function calculateRoute()"
        )
      );

    assert.ok(
      successIndex >= 0
    );

    const preceding =
      page.slice(
        Math.max(0, successIndex - 120),
        successIndex + 80
      );

    assert.match(
      preceding,
      /nextRoutes\.length > 0/
    );
  }
);

test(
  "malformed refresh storage clears resume availability",
  () => {
    assert.match(
      page,
      /catch \{[\s\S]*?setRefreshRecoveryAvailable\(false\);[\s\S]*?sessionStorage\.removeItem/
    );
  }
);

test(
  "normal Calculate Safe Route remains available",
  () => {
    assert.match(
      page,
      /Calculate Safe Route/
    );

    assert.match(
      page,
      /Resume Journey/
    );
  }
);