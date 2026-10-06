import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

test(
  "Safe Navigation reuses Route Safety prediction for environmental context",
  () => {
    assert.match(
      page,
      /\/api\/route-safety\/predict/
    );

    assert.match(
      page,
      /openWatercourseContext\?:/
    );

    assert.match(
      page,
      /mainDrainageContext\?:/
    );

    assert.match(
      page,
      /drainageCatchmentContext\?:/
    );

    assert.doesNotMatch(
      page,
      /\/api\/.*watercourse/
    );

    assert.doesNotMatch(
      page,
      /\/api\/.*drainage/
    );
  }
);

test(
  "Safe Navigation renders driver-facing environmental route context",
  () => {
    assert.match(
      page,
      /aria-label="Route environmental context"/
    );

    assert.match(
      page,
      /Environmental context/
    );

    assert.match(
      page,
      /Nearby watercourse:/
    );

    assert.match(
      page,
      /Nearby main drainage:/
    );

    assert.match(
      page,
      /Drainage catchment:/
    );
  }
);

test(
  "environmental context is explicitly informational only",
  () => {
    assert.match(
      page,
      /Route context only\. This does not by itself indicate/
    );

    assert.match(
      page,
      /flooding or an active road hazard\./
    );

    const environmentalStart =
      page.indexOf(
        'aria-label="Route environmental context"'
      );

    assert.notEqual(
      environmentalStart,
      -1,
      "Environmental context UI missing"
    );

    const weatherStart =
      page.indexOf(
        "{routeWeatherIntelligence &&",
        environmentalStart
      );

    assert.notEqual(
      weatherStart,
      -1,
      "Route Weather boundary missing"
    );

    const environmentalBlock =
      page.slice(
        environmentalStart,
        weatherStart
      );

    assert.doesNotMatch(
      environmentalBlock,
      /setSaferRouteOffer/
    );

    assert.doesNotMatch(
      environmentalBlock,
      /autoEscalat/
    );

    assert.doesNotMatch(
      environmentalBlock,
      /setActiveRouteSafetyThreats/
    );

    assert.doesNotMatch(
      environmentalBlock,
      /riskScore\s*=/
    );
  }
);

test(
  "environmental context follows prediction lifecycle cleanup",
  () => {
    assert.match(
      page,
      /setRouteEnvironmentalContext\(null\);[\s\S]{0,220}const requestId/
    );

    assert.match(
      page,
      /setRouteEnvironmentalContext\(\s*nextRouteEnvironmentalContext\s*\)/
    );

    const cleanupCount =
      (
        page.match(
          /setRouteEnvironmentalContext\(null\);/g
        ) || []
      ).length;

    assert.ok(
      cleanupCount >= 3,
      `Expected at least 3 cleanup paths, found ${cleanupCount}`
    );
  }
);