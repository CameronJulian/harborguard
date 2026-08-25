import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/route-safety/ingest/here/route.ts",
  "utf8"
);

test(
  "manual HERE incident ingest is guarded by intelligence source registry",
  () => {
    assert.match(
      route,
      /getIntelligenceSourceConfiguration/
    );

    assert.match(
      route,
      /"here_traffic"/
    );

    assert.match(
      route,
      /!hereTrafficConfiguration\.enabled/
    );

    assert.match(
      route,
      /!hereTrafficConfiguration\.approvedForIngestion/
    );

    assert.match(
      route,
      /HERE Traffic ingestion is disabled by the intelligence source registry/
    );
  }
);

test(
  "manual HERE registry guard runs before paid HERE request",
  () => {
    const guardIndex =
      route.indexOf(
        "configuration: hereTrafficConfiguration"
      );

    const fetchIndex =
      route.indexOf(
        "const response = await fetch"
      );

    assert.ok(guardIndex >= 0);
    assert.ok(fetchIndex > guardIndex);
  }
);
