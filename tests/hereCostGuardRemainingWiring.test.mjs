import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(
    path,
    "utf8",
  );
}

test(
  "destination search reserves cost capacity before fetch",
  () => {
    const source =
      read(
        "app/api/navigation/search/route.ts",
      );

    const reservation =
      source.indexOf(
        "await reserveHereProviderRequest(",
      );

    const surface =
      source.indexOf(
        '"destination-search"',
        reservation,
      );

    const denial =
      source.indexOf(
        "!hereCostReservation.allowed",
        surface,
      );

    const fetch =
      source.indexOf(
        "fetch(",
      );

    assert.ok(
      reservation >= 0,
    );

    assert.ok(
      surface > reservation,
    );

    assert.ok(
      denial > surface,
    );

    assert.ok(
      fetch > denial,
    );

    assert.match(
      source,
      /"budget-exhausted"[\s\S]*\? 429[\s\S]*: 503/,
    );
  },
);

test(
  "routing checks provider cache before reserving paid capacity",
  () => {
    const source =
      read(
        "lib/routing/hereRouting.ts",
      );

    const cacheKey =
      source.indexOf(
        "const cacheKey",
      );

    const cacheLookup =
      source.indexOf(
        "getCachedHereRoutingProviderResponse(",
        cacheKey,
      );

    const missBranch =
      source.indexOf(
        "if (!data) {",
        cacheLookup,
      );

    const reservation =
      source.indexOf(
        "await reserveHereProviderRequest(",
        missBranch,
      );

    const surface =
      source.indexOf(
        '"routing"',
        reservation,
      );

    const denial =
      source.indexOf(
        "!hereCostReservation.allowed",
        surface,
      );

    const fetch =
      source.indexOf(
        "fetch(",
        denial,
      );

    assert.ok(
      cacheLookup >= 0,
      "routing cache lookup missing",
    );

    assert.ok(
      missBranch > cacheLookup,
      "cache miss must follow lookup",
    );

    assert.ok(
      reservation > missBranch,
      "budget reservation must be inside cache miss",
    );

    assert.ok(
      surface > reservation,
    );

    assert.ok(
      denial > surface,
    );

    assert.ok(
      fetch > denial,
      "HERE fetch must follow denial gate",
    );
  },
);

test(
  "speed limit reserves capacity before fetch and fails softly",
  () => {
    const source =
      read(
        "lib/routing/resolveHereRoadSpeedLimit.ts",
      );

    const reservation =
      source.indexOf(
        "await reserveHereProviderRequest(",
      );

    const surface =
      source.indexOf(
        '"speed-limit"',
        reservation,
      );

    const denial =
      source.indexOf(
        "!hereCostReservation.allowed",
        surface,
      );

    const denialReturn =
      source.indexOf(
        "return null;",
        denial,
      );

    const fetch =
      source.indexOf(
        "fetch(",
        denial,
      );

    assert.ok(
      reservation >= 0,
    );

    assert.ok(
      surface > reservation,
    );

    assert.ok(
      denial > surface,
    );

    assert.ok(
      denialReturn > denial,
    );

    assert.ok(
      fetch > denialReturn,
      "fetch must be unreachable when reservation denied",
    );
  },
);

test(
  "remaining HERE surfaces retain exactly one network fetch",
  () => {
    for (const path of [
      "app/api/navigation/search/route.ts",
      "lib/routing/hereRouting.ts",
      "lib/routing/resolveHereRoadSpeedLimit.ts",
    ]) {
      const source =
        read(path);

      const count =
        source
          .split("fetch(")
          .length - 1;

      assert.equal(
        count,
        1,
        `${path} fetch count changed`,
      );
    }
  },
);
