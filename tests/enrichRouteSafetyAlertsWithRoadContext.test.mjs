import test from "node:test";
import assert from "node:assert/strict";

import {
  enrichRouteSafetyAlertsWithRoadContext,
} from "../lib/route-safety/enrichRouteSafetyAlertsWithRoadContext.ts";

function makeRow(overrides = {}) {
  return {
    organization_id: "org-1",
    type: "road_closure",
    title: "Road incident",
    description: "Provider incident",
    latitude: -33.9249,
    longitude: 18.4241,
    radius_meters: 1000,
    severity: "medium",
    source: "here_traffic",
    status: "active",
    expires_at: null,
    verified_at: "2026-08-13T09:00:00.000Z",
    road_name: null,
    road_from: null,
    road_to: null,
    provider_geometry: null,
    ...overrides,
  };
}

test("fills missing road name from road context", async () => {
  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [makeRow()],
      async () => ({
        roadName: "Grand Parade",
      })
    );

  assert.equal(
    result.rows[0].road_name,
    "Grand Parade"
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.enriched, 1);
  assert.equal(result.unavailable, 0);
});

test("never overwrites provider road name", async () => {
  let calls = 0;

  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [
        makeRow({
          road_name: "Provider Main Road",
        }),
      ],
      async () => {
        calls += 1;

        return {
          roadName: "City Main Road",
        };
      }
    );

  assert.equal(calls, 0);

  assert.equal(
    result.rows[0].road_name,
    "Provider Main Road"
  );

  assert.equal(result.attempted, 0);
  assert.equal(result.enriched, 0);
});

test("leaves incident unchanged when context is unavailable", async () => {
  const row = makeRow();

  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [row],
      async () => null
    );

  assert.equal(
    result.rows[0].road_name,
    null
  );

  assert.equal(
    result.rows[0].severity,
    row.severity
  );

  assert.equal(
    result.rows[0].type,
    row.type
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.enriched, 0);
  assert.equal(result.unavailable, 1);
});

test("resolver failure does not fail incident import", async () => {
  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [makeRow()],
      async () => {
        throw new Error("City unavailable");
      }
    );

  assert.equal(
    result.rows[0].road_name,
    null
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.enriched, 0);
  assert.equal(result.unavailable, 1);
});

test("skips invalid coordinates", async () => {
  let calls = 0;

  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [
        makeRow({
          latitude: 999,
        }),
      ],
      async () => {
        calls += 1;

        return {
          roadName: "Should not run",
        };
      }
    );

  assert.equal(calls, 0);
  assert.equal(result.attempted, 0);
  assert.equal(result.enriched, 0);
});

test("respects lookup cap", async () => {
  let calls = 0;

  const rows = [
    makeRow({ longitude: 18.4201 }),
    makeRow({ longitude: 18.4202 }),
    makeRow({ longitude: 18.4203 }),
  ];

  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      rows,
      async () => {
        calls += 1;

        return {
          roadName: `Road ${calls}`,
        };
      },
      {
        maxLookups: 2,
      }
    );

  assert.equal(calls, 2);
  assert.equal(result.attempted, 2);
  assert.equal(result.enriched, 2);

  assert.equal(
    result.rows[2].road_name,
    null
  );
});

test("does not mutate original rows", async () => {
  const row = makeRow();

  const result =
    await enrichRouteSafetyAlertsWithRoadContext(
      [row],
      async () => ({
        roadName: "Grand Parade",
      })
    );

  assert.equal(row.road_name, null);

  assert.equal(
    result.rows[0].road_name,
    "Grand Parade"
  );
});