import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation reuses Route Safety weather without another weather request",
  () => {
    assert.match(
      page,
      /\/api\/route-safety\/predict/,
    );

    assert.doesNotMatch(
      page,
      /\/api\/weather\/current/,
    );

    assert.match(
      page,
      /weatherRiskScore\?:\s*number\s*\|\s*null/,
    );

    assert.match(
      page,
      /weatherContribution\?:\s*number\s*\|\s*null/,
    );

    assert.match(
      page,
      /weatherError\?:\s*string\s*\|\s*null/,
    );
  },
);

test(
  "prediction weather is normalized and published into route-owned state",
  () => {
    assert.match(
      page,
      /const weather\s*=\s*result\?\.weather\s*\?\?\s*null/,
    );

    assert.match(
      page,
      /setRouteWeatherIntelligence\(\s*nextRouteWeatherIntelligence\s*\)/,
    );
  },
);

test(
  "Route Weather is customer-visible inside the route recommendation",
  () => {
    assert.match(
      page,
      /aria-label="Route weather intelligence"/,
    );

    assert.match(
      page,
      />\s*Route weather\s*</,
    );

    assert.match(
      page,
      /routeWeatherIntelligenceLabel\(/,
    );
  },
);

test(
  "Route Weather follows Live Road lifecycle cleanup",
  () => {
    const liveRoadResets =
      (
        page.match(
          /setLiveRoadIntelligence\(\s*null\s*\)/g,
        ) || []
      ).length;

    const weatherResets =
      (
        page.match(
          /setRouteWeatherIntelligence\(\s*null\s*\)/g,
        ) || []
      ).length;

    const weatherPublishes =
      (
        page.match(
          /setRouteWeatherIntelligence\(\s*nextRouteWeatherIntelligence\s*\)/g,
        ) || []
      ).length;

    assert.equal(
      liveRoadResets,
      3,
    );

    assert.equal(
      weatherResets,
      liveRoadResets,
    );

    assert.equal(
      weatherPublishes,
      1,
    );
  },
);