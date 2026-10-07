import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "lib/route-safety/providers/importTomTomIncidents.ts";

const source =
  fs.readFileSync(
    path,
    "utf8",
  );

test(
  "TomTom incident importer reserves traffic incident budget before fetch",
  () => {
    const reserveIndex =
      source.indexOf(
        "reserveTomTomProviderRequest(",
      );

    const surfaceIndex =
      source.indexOf(
        '"traffic-incidents"',
        reserveIndex,
      );

    const denialIndex =
      source.indexOf(
        "!tomTomCostReservation.allowed",
        surfaceIndex,
      );

    const fetchIndex =
      source.indexOf(
        "fetch(",
        denialIndex,
      );

    assert.ok(reserveIndex >= 0);
    assert.ok(surfaceIndex > reserveIndex);
    assert.ok(denialIndex > surfaceIndex);
    assert.ok(fetchIndex > denialIndex);
  },
);

test(
  "TomTom incident importer remains bounded to exactly one network fetch",
  () => {
    assert.equal(
      source.split("fetch(").length - 1,
      1,
    );
  },
);

test(
  "TomTom incident importer fails closed before provider fetch",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!tomTomCostReservation\.allowed\s*\)/,
    );

    assert.match(
      source,
      /TomTom Traffic incident import blocked by cost guard/,
    );
  },
);

test(
  "TomTom incident importer uses dedicated traffic incident budget surface",
  () => {
    assert.match(
      source,
      /reserveTomTomProviderRequest\(\s*"traffic-incidents",?\s*\)/,
    );
  },
);