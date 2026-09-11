import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const typesSource = fs.readFileSync(
  "lib/road-context/types.ts",
  "utf8"
);

const citySource = fs.readFileSync(
  "lib/road-context/providers/cityOfCapeTown.ts",
  "utf8"
);

const hereSource = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test(
  "shared road context contract exposes an optional timeout",
  () => {
    assert.match(
      typesSource,
      /\btimeoutMs\s*\?:\s*number/
    );
  }
);

test(
  "City road context preserves the ten second shared default",
  () => {
    assert.match(
      citySource,
      /const\s+DEFAULT_TIMEOUT_MS\s*=\s*10_000\s*;/
    );

    assert.match(
      citySource,
      /timeoutMs\s*=\s*DEFAULT_TIMEOUT_MS/
    );
  }
);

test(
  "City road timeout is bounded and configurable",
  () => {
    assert.match(
      citySource,
      /Math\.min\(\s*10_000/
    );

    assert.match(
      citySource,
      /Math\.max\(\s*1/
    );

    assert.match(
      citySource,
      /Number\(timeoutMs\)/
    );
  }
);

test(
  "HERE alone requests a two second road-context timeout",
  () => {
    assert.match(
      hereSource,
      /const\s+HERE_ROAD_CONTEXT_TIMEOUT_MS\s*=\s*2_000\s*;/
    );

    assert.match(
      hereSource,
      /timeoutMs\s*:\s*HERE_ROAD_CONTEXT_TIMEOUT_MS/
    );

    assert.match(
      hereSource,
      /maxLookups\s*:\s*1/
    );
  }
);