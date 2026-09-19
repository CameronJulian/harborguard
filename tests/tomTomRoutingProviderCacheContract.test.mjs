import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/routing/tomTomRoutingProviderCache.ts",
    "utf8",
  );

test(
  "TomTom routing cache uses shared Redis",
  () => {
    assert.match(
      source,
      /getRedis/,
    );

    assert.match(
      source,
      /redis\.get/,
    );

    assert.match(
      source,
      /redis\.set/,
    );
  },
);

test(
  "TomTom routing cache has bounded TTL",
  () => {
    assert.match(
      source,
      /TOMTOM_ROUTING_CACHE_TTL_SECONDS\s*=\s*90/,
    );

    assert.match(
      source,
      /ex:\s*TOMTOM_ROUTING_CACHE_TTL_SECONDS/,
    );
  },
);

test(
  "TomTom routing cache key contains provider namespace",
  () => {
    assert.match(
      source,
      /"tomtom-routing"/,
    );

    assert.match(
      source,
      /"v1"/,
    );
  },
);

test(
  "TomTom routing cache key contains origin destination and profile",
  () => {
    assert.match(
      source,
      /input\.origin\.latitude/,
    );

    assert.match(
      source,
      /input\.origin\.longitude/,
    );

    assert.match(
      source,
      /input\.destination\.latitude/,
    );

    assert.match(
      source,
      /input\.destination\.longitude/,
    );

    assert.match(
      source,
      /input\.routingProfile/,
    );
  },
);

test(
  "TomTom routing cache fails softly",
  () => {
    assert.match(
      source,
      /return null/,
    );

    assert.match(
      source,
      /catch\s*\(error\)/,
    );
  },
);

test(
  "TomTom routing cache contains no provider network request",
  () => {
    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /api\.tomtom\.com/i,
    );
  },
);
