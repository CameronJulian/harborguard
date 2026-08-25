import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const driver = fs.readFileSync(
  "app/driver/page.tsx",
  "utf8"
);

test(
  "driver resets reroute identity when nearby alerts clear",
  () => {
    assert.match(
      driver,
      /if \(alerts\.length === 0\) \{[\s\S]*setLastAlertId\(null\)/
    );

    assert.match(
      driver,
      /setRouteOptions\(\[\]\)/
    );

    assert.match(
      driver,
      /setRouteRecommendation\(null\)/
    );
  }
);

test(
  "driver only reroutes when closest alert identity changes",
  () => {
    const guardIndex =
      driver.indexOf(
        "if (closest.id !== lastAlertId)"
      );

    const rerouteIndex =
      driver.indexOf(
        "await loadRerouteOptions("
      );

    assert.ok(guardIndex >= 0);
    assert.ok(rerouteIndex > guardIndex);
  }
);

test(
  "driver reroute remains inside alert identity guard",
  () => {
    const guardIndex =
      driver.indexOf(
        "if (closest.id !== lastAlertId)"
      );

    const notificationIndex =
      driver.indexOf(
        'if (typeof window !== "undefined"'
      );

    const guardedSection =
      driver.slice(
        guardIndex,
        notificationIndex
      );

    assert.match(
      guardedSection,
      /await loadRerouteOptions\(/
    );
  }
);
