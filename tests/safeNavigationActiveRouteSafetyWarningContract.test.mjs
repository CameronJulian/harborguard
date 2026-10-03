import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(
  new URL(
    "../app/safe-navigation/page.tsx",
    import.meta.url
  )
);

const source =
  fs.readFileSync(pagePath, "utf8");

test(
  "Safe Navigation consumes the existing Route Safety prediction contract",
  () => {
    assert.match(
      source,
      /\/api\/route-safety\/predict/
    );

    assert.match(
      source,
      /result\?\.threats/
    );

    assert.match(
      source,
      /setActiveRouteSafetyThreats/
    );
  }
);

test(
  "route threats are projected onto the selected navigation route",
  () => {
    assert.match(
      source,
      /calculateRouteProgress\(\s*\[latitude,\s*longitude\],\s*routePoints\s*\)/
    );

    assert.match(
      source,
      /threatProgress\.progressMeters\s*-\s*routeProgress\.progressMeters/
    );

    assert.match(
      source,
      /distanceAheadMeters/
    );
  }
);

test(
  "warning suppresses stale behind-driver and distant threats",
  () => {
    assert.match(
      source,
      /distanceAheadMeters\s*<\s*-50/
    );

    assert.match(
      source,
      /distanceAheadMeters\s*>\s*3000/
    );

    assert.match(
      source,
      /distanceFromRouteMeters\s*>/
    );
  }
);

test(
  "customer sees one simple active-route warning",
  () => {
    assert.match(
      source,
      /Safety alert ahead/
    );

    assert.match(
      source,
      /m ahead on your current route/
    );

    assert.match(
      source,
      /activeRouteSafetyWarning\.threat\.recommendation/
    );
  }
);

test(
  "first increment remains visual-only",
  () => {
    const warningStart =
      source.indexOf(
        'className="hg-active-route-safety-warning"'
      );

    assert.notEqual(
      warningStart,
      -1
    );

    const warningBlock =
      source.slice(
        warningStart,
        warningStart + 4000
      );

    assert.doesNotMatch(
      warningBlock,
      /speechSynthesis|speakNavigationInstruction/
    );
  }
);
test(
  "threat prediction lifecycle is route-owned rather than GPS-tick-owned",
  () => {
    const incrementStart =
      source.indexOf(
        "CUSTOMER INCREMENT #1"
      );

    assert.notEqual(
      incrementStart,
      -1
    );

    const incrementEnd =
      source.indexOf(
        "const activeRouteSafetyWarning",
        incrementStart
      );

    assert.notEqual(
      incrementEnd,
      -1
    );

    const threatEffect =
      source.slice(
        incrementStart,
        incrementEnd
      );

    assert.match(
      threatEffect,
      /lat:\s*firstRoutePoint\[0\]/
    );

    assert.match(
      threatEffect,
      /lng:\s*firstRoutePoint\[1\]/
    );

    assert.match(
      threatEffect,
      /lat:\s*lastRoutePoint\[0\]/
    );

    assert.match(
      threatEffect,
      /lng:\s*lastRoutePoint\[1\]/
    );

    const dependencyStart =
      threatEffect.lastIndexOf("}, [");

    assert.notEqual(
      dependencyStart,
      -1
    );

    const dependencies =
      threatEffect.slice(
        dependencyStart
      );

    assert.doesNotMatch(
      dependencies,
      /\bcurrentPosition\b/
    );

    assert.doesNotMatch(
      dependencies,
      /\bdestination\b/
    );

    assert.match(
      dependencies,
      /\bselectedRouteIndex\b/
    );

    assert.match(
      dependencies,
      /\broutingProfile\b/
    );

    assert.match(
      dependencies,
      /\broutePoints\b/
    );
  }
);

test(
  "route safety request identity includes route geometry",
  () => {
    assert.match(
      source,
      /routePoints\.flatMap/
    );

    assert.match(
      source,
      /lat\.toFixed\(6\)/
    );

    assert.match(
      source,
      /lng\.toFixed\(6\)/
    );
  }
);