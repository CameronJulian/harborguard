import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation derives weather guidance from existing Route Weather intelligence",
  () => {
    assert.match(
      page,
      /function routeWeatherDriverGuidance\(/,
    );

    assert.match(
      page,
      /weather\.riskReasons/,
    );

    assert.match(
      page,
      /weather\.riskLevel/,
    );

    assert.match(
      page,
      /\/api\/route-safety\/predict/,
    );

    assert.doesNotMatch(
      page,
      /\/api\/weather\/current/,
    );
  },
);

test(
  "weather guidance covers provider-classified visibility precipitation wind and storms",
  () => {
    assert.match(
      page,
      /reasons\.includes\("visibility"\)/,
    );

    assert.match(
      page,
      /reasons\.includes\("precipitation"\)/,
    );

    assert.match(
      page,
      /reasons\.includes\("shower"\)/,
    );

    assert.match(
      page,
      /reasons\.includes\("wind"\)/,
    );

    assert.match(
      page,
      /reasons\.includes\("thunderstorm"\)/,
    );
  },
);

test(
  "weather guidance gives concrete driver actions",
  () => {
    assert.match(
      page,
      /Reduce speed and increase following distance\./,
    );

    assert.match(
      page,
      /Allow extra braking distance and avoid sudden manoeuvres\./,
    );

    assert.match(
      page,
      /Keep both hands on the wheel and allow extra space around high-sided vehicles\./,
    );

    assert.match(
      page,
      /prepared for rapidly changing road conditions\./,
    );
  },
);

test(
  "weather guidance preserves conservative fallback behavior",
  () => {
    assert.match(
      page,
      /weather\.riskLevel === "critical"/,
    );

    assert.match(
      page,
      /weather\.riskLevel === "high"/,
    );

    assert.match(
      page,
      /weather\.riskLevel === "medium"/,
    );

    assert.match(
      page,
      /No significant weather-related driving adjustment is currently indicated\./,
    );
  },
);

test(
  "Route Weather renders driver guidance while preserving provider reason",
  () => {
    assert.match(
      page,
      /aria-label="Weather driving guidance"/,
    );

    assert.match(
      page,
      /routeWeatherDriverGuidance\(\s*routeWeatherIntelligence\s*\)/,
    );

    assert.match(
      page,
      /\.riskReasons\[0\]/,
    );
  },
);