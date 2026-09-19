import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root =
  process.cwd();

const selectorPath =
  path.join(
    root,
    "lib",
    "routing",
    "routingProviderSelector.ts",
  );

const reroutePath =
  path.join(
    root,
    "app",
    "api",
    "route-safety",
    "reroute",
    "route.ts",
  );

const source =
  fs.readFileSync(
    selectorPath,
    "utf8",
  );

const rerouteSource =
  fs.readFileSync(
    reroutePath,
    "utf8",
  );

test(
  "routing provider selector is server-only",
  () => {
    assert.match(
      source,
      /import "server-only";/,
    );
  },
);

test(
  "selector imports both routing providers",
  () => {
    assert.match(
      source,
      /calculateHereRoutes/,
    );

    assert.match(
      source,
      /calculateTomTomRoutes/,
    );
  },
);

test(
  "provider normalization defaults to HERE",
  () => {
    assert.match(
      source,
      /return "here";/,
    );

    assert.match(
      source,
      /normalized === "tomtom"/,
    );
  },
);

test(
  "dispatcher adapts common HarborGuard request to TomTom",
  () => {
    assert.match(
      source,
      /calculateTomTomRoutes\(\{/,
    );

    assert.match(
      source,
      /roadRiskSegments,/,
    );

    assert.match(
      source,
      /routingProfile,/,
    );
  },
);

test(
  "dispatcher adapts common HarborGuard request to HERE",
  () => {
    assert.match(
      source,
      /return calculateHereRoutes\(/,
    );

    assert.match(
      source,
      /request\.origin/,
    );

    assert.match(
      source,
      /request\.destination/,
    );
  },
);

test(
  "HarborGuard routing profile is normalized before provider dispatch",
  () => {
    const profileIndex =
      source.indexOf(
        "normalizeRoutingProfile(",
      );

    const tomTomIndex =
      source.indexOf(
        "calculateTomTomRoutes({",
      );

    const hereIndex =
      source.indexOf(
        "return calculateHereRoutes(",
      );

    assert.ok(
      profileIndex >= 0,
    );

    assert.ok(
      tomTomIndex >
        profileIndex,
    );

    assert.ok(
      hereIndex >
        profileIndex,
    );
  },
);

test(
  "live reroute remains HERE-only during selector introduction",
  () => {
    assert.match(
      rerouteSource,
      /calculateHereRoutes/,
    );

    assert.doesNotMatch(
      rerouteSource,
      /calculateTomTomRoutes/,
    );

    assert.doesNotMatch(
      rerouteSource,
      /calculateRoutesWithProvider/,
    );
  },
);
