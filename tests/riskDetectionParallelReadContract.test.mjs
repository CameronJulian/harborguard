import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/risk-detection.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "latest location remains sequential before parallel risk reads",
  () => {
    const latestGuard =
      source.indexOf(
        "if (latestError || !latest) continue;"
      );

    const parallelReads =
      source.indexOf(
        "await Promise.all(["
      );

    assert.ok(
      latestGuard >= 0
    );

    assert.ok(
      parallelReads > latestGuard
    );
  }
);

test(
  "open alerts and driver-fatigue active trip execute concurrently",
  () => {
    assert.match(
      source,
      /await Promise\.all\(\[[\s\S]*?\.from\("vehicle_alerts"\)[\s\S]*?\.from\("vehicle_trips"\)[\s\S]*?\]\);/
    );
  }
);

test(
  "driver fatigue active-trip query semantics remain unchanged",
  () => {
    assert.match(
      source,
      /\.select\("id, actual_departure, status"\)/
    );

    assert.match(
      source,
      /\.not\("actual_departure", "is", null\)/
    );

    assert.match(
      source,
      /\.order\("actual_departure", \{ ascending: false \}\)/
    );

    for (
      const status of [
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
        "emergency",
      ]
    ) {
      assert.ok(
        source.includes(
          `"${status}"`
        )
      );
    }
  }
);

test(
  "open-alert failure still skips before fatigue result handling",
  () => {
    const openAlertGuard =
      source.indexOf(
        "if (openAlertsError) continue;"
      );

    const activeTripError =
      source.indexOf(
        "if (activeTripError)"
      );

    assert.ok(
      openAlertGuard >= 0
    );

    assert.ok(
      activeTripError > openAlertGuard
    );
  }
);