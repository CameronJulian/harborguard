import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const surfaces = [
  {
    path:
      "lib/here/traffic.ts",
    surface:
      "traffic-flow",
  },
  {
    path:
      "lib/route-safety/providers/importHereIncidents.ts",
    surface:
      "traffic-incidents",
  },
  {
    path:
      "app/api/route-safety/ingest/here/route.ts",
    surface:
      "traffic-incidents",
  },
];

for (const {
  path,
  surface,
} of surfaces) {
  test(
    `${path} reserves HERE cost capacity before fetch`,
    () => {
      const source =
        fs.readFileSync(
          path,
          "utf8",
        );

      const reserveIndex =
        source.indexOf(
          "reserveHereProviderRequest",
        );

      const surfaceIndex =
        source.indexOf(
          `"${surface}"`,
          reserveIndex,
        );

      const denialIndex =
        source.indexOf(
          "!hereCostReservation.allowed",
          surfaceIndex,
        );

      const fetchIndex =
        source.indexOf(
          "fetch(",
        );

      assert.ok(
        reserveIndex >= 0,
        "reservation function missing",
      );

      assert.ok(
        surfaceIndex > reserveIndex,
        "cost surface missing after reservation import",
      );

      assert.ok(
        denialIndex > surfaceIndex,
        "denial branch missing",
      );

      assert.ok(
        fetchIndex > denialIndex,
        "HERE fetch is reachable before the cost guard denial branch",
      );
    },
  );
}

test(
  "Traffic Flow uses its isolated daily bucket",
  () => {
    const source =
      fs.readFileSync(
        "lib/here/traffic.ts",
        "utf8",
      );

    assert.match(
      source,
      /reserveHereProviderRequest\(\s*"traffic-flow",?\s*\)/,
    );
  },
);

test(
  "both HERE incident paths share the traffic-incidents bucket",
  () => {
    for (const path of [
      "lib/route-safety/providers/importHereIncidents.ts",
      "app/api/route-safety/ingest/here/route.ts",
    ]) {
      const source =
        fs.readFileSync(
          path,
          "utf8",
        );

      assert.match(
        source,
        /reserveHereProviderRequest\(\s*"traffic-incidents",?\s*\)/,
      );
    }
  },
);

test(
  "direct ingest exposes 429 for exhausted budget and 503 for unavailable guard",
  () => {
    const source =
      fs.readFileSync(
        "app/api/route-safety/ingest/here/route.ts",
        "utf8",
      );

    assert.match(
      source,
      /"budget-exhausted"/,
    );

    assert.match(
      source,
      /\? 429[\s\S]*: 503/,
    );
  },
);
