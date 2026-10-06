import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

const predict = fs.readFileSync(
  "app/api/route-safety/predict/route.ts",
  "utf8"
);

test(
  "Safe Navigation continues using the existing Route Safety prediction pipeline",
  () => {
    assert.match(
      page,
      /\/api\/route-safety\/predict/
    );

    assert.doesNotMatch(
      page,
      /\/api\/route-safety\/active/
    );

    assert.doesNotMatch(
      page,
      /\/api\/route-safety\/nearby/
    );

    assert.doesNotMatch(
      page,
      /\/api\/road-incidents/
    );
  }
);

test(
  "prediction pipeline already carries route threat severity",
  () => {
    assert.match(
      predict,
      /severity/
    );

    assert.match(
      predict,
      /threats: routeThreats/
    );
  }
);

test(
  "existing Safe Navigation threat model already carries severity",
  () => {
    assert.match(
      page,
      /type ActiveRouteSafetyThreat = \{[\s\S]*severity\?: string \| null;/
    );
  }
);

test(
  "Safety Alert Ahead visibly exposes hazard severity",
  () => {
    assert.match(
      page,
      /aria-label="Route hazard severity"/
    );

    assert.match(
      page,
      /Severity:\{" "\}/
    );

    assert.match(
      page,
      /activeRouteSafetyWarning\.threat\.severity/
    );
  }
);

test(
  "hazard severity is normalized for compact driver display",
  () => {
    assert.match(
      page,
      /\.trim\(\)\s*\.toUpperCase\(\)/
    );
  }
);

test(
  "existing incident type title and distance-ahead UI remain present",
  () => {
    assert.match(
      page,
      /Safety alert ahead/
    );

    assert.match(
      page,
      /activeRouteSafetyVoiceTitle/
    );

    assert.match(
      page,
      /m ahead on your current route/
    );
  }
);

test(
  "existing live hazard recommendation remains visible",
  () => {
    assert.match(
      page,
      /activeRouteSafetyWarning\.threat\.recommendation/
    );

    assert.match(
      page,
      /Stay alert and continue with caution/
    );
  }
);

test(
  "existing voice hazard warning remains intact",
  () => {
    assert.match(
      page,
      /Safety alert ahead\. \$\{title\}\. \$\{distanceMeters\} metres ahead\./
    );
  }
);

test(
  "Increment 42 introduces no direct duplicate incident data source",
  () => {
    assert.doesNotMatch(
      page,
      /\/api\/route-safety\/active/
    );

    assert.doesNotMatch(
      page,
      /\/api\/route-safety\/nearby/
    );

    assert.doesNotMatch(
      page,
      /\/api\/road-incidents/
    );
  }
);