import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pagePath = new URL(
  "../app/safe-navigation/page.tsx",
  import.meta.url
);

const source = fs.readFileSync(pagePath, "utf8");

function functionBody(name, nextName) {
  const startMarker = `function ${name}()`;
  const start = source.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    `${name} must exist`
  );

  if (!nextName) {
    return source.slice(start);
  }

  const endMarker = `function ${nextName}()`;
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(
    end,
    -1,
    `${nextName} must exist after ${name}`
  );

  return source.slice(start, end);
}

test(
  "Stop GPS clears real GPS ownership and simulator playback without deleting simulator progress",
  () => {
    const body = functionBody("stopGps", "startGps");

    assert.match(
      body,
      /navigator\.geolocation\.clearWatch\(\s*watchIdRef\.current\s*\)/
    );

    assert.match(
      body,
      /watchIdRef\.current\s*=\s*null;/
    );

    assert.match(
      body,
      /clearSimulatorTimer\(\);/
    );

    assert.match(
      body,
      /setSimulatorRunning\(false\);/
    );

    assert.doesNotMatch(
      body,
      /simulatorIndexRef\.current\s*=\s*0;/
    );

    assert.doesNotMatch(
      body,
      /simulatorPointsRef\.current\s*=\s*\[\];/
    );
  }
);

test(
  "Stop GPS preserves the last map position while zeroing stale speed",
  () => {
    const body = functionBody("stopGps", "startGps");

    assert.match(
      body,
      /setPosition\(\(current\)\s*=>[\s\S]*?\.\.\.current,[\s\S]*?speedKmh:\s*0/
    );

    assert.match(
      body,
      /setGpsActive\(false\);/
    );

    assert.match(
      body,
      /setGpsMessage\("GPS stopped"\);/
    );

    assert.doesNotMatch(
      body,
      /setPosition\(null\)/
    );
  }
);

test(
  "Start GPS explicitly starts the real browser geolocation watch",
  () => {
    const start = source.indexOf("function startGps()");
    const end = source.indexOf(
      "const clearOffRouteTimer",
      start
    );

    assert.notEqual(
      start,
      -1,
      "startGps must exist"
    );

    assert.notEqual(
      end,
      -1,
      "clearOffRouteTimer boundary must exist after startGps"
    );

    const body = source.slice(start, end);

    assert.match(
      body,
      /navigator\.geolocation\.watchPosition\(/
    );

    assert.match(
      body,
      /setPosition\(\{[\s\S]*?lat:\s*gps\.coords\.latitude,[\s\S]*?lng:\s*gps\.coords\.longitude/
    );

    assert.match(
      body,
      /setGpsActive\(true\);/
    );
  }
);

test(
  "DEV simulator start first stops real GPS ownership",
  () => {
    const body = functionBody(
      "startSyntheticDrive",
      "endNavigation"
    );

    assert.match(
      body,
      /stopGps\(\);/
    );

    assert.match(
      body,
      /clearSimulatorTimer\(\);/
    );
  }
);

test(
  "DEV simulator resume reuses preserved playback points and index",
  () => {
    const body = functionBody(
      "startSyntheticDrive",
      "endNavigation"
    );

    assert.match(
      body,
      /let points\s*=\s*simulatorPointsRef\.current;/
    );

    assert.match(
      body,
      /if\s*\(points\.length\s*<\s*2\)[\s\S]*?simulatorIndexRef\.current\s*=\s*0;/
    );

    assert.match(
      body,
      /applySimulatorPoint\(\s*points,\s*simulatorIndexRef\.current\s*\);/
    );

    assert.match(
      body,
      /const nextIndex\s*=\s*simulatorIndexRef\.current\s*\+\s*1;/
    );
  }
);

test(
  "Reset to Route Start remains the explicit simulator index reset",
  () => {
    const body = functionBody(
      "resetSyntheticDrive",
      "startSyntheticDrive"
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
      /applySimulatorPoint\(\s*points,\s*0\s*\);/
    );
  }
);

test(
  "real GPS and DEV simulator ownership remain distinguishable",
  () => {
    assert.match(
      source,
      /const hasRealGpsWatch\s*=\s*watchIdRef\.current\s*!==\s*null;/
    );

    assert.match(
      source,
      /const simulatorOwnsPosition\s*=\s*watchIdRef\.current\s*===\s*null\s*&&\s*gpsActive;/
    );
  }
);