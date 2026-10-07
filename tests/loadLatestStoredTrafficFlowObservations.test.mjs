import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath =
  path.resolve(
    process.cwd(),
    "lib/traffic/loadRecentTrafficFlowObservations.ts"
  );

const {
  loadLatestStoredTrafficFlowObservations,
  loadRecentTrafficFlowObservations,
} = await import(
  pathToFileURL(modulePath).href
);

function createQuery(rows) {
  const calls = [];

  const query = {
    select() {
      calls.push(["select"]);
      return this;
    },

    eq(column, value) {
      calls.push([
        "eq",
        column,
        value,
      ]);
      return this;
    },

    gte(column, value) {
      calls.push([
        "gte",
        column,
        value,
      ]);
      return this;
    },

    order(column, options) {
      calls.push([
        "order",
        column,
        options,
      ]);
      return this;
    },

    limit(value) {
      calls.push([
        "limit",
        value,
      ]);

      return Promise.resolve({
        data: rows,
        error: null,
      });
    },
  };

  const supabase = {
    from(table) {
      calls.push([
        "from",
        table,
      ]);

      return query;
    },
  };

  return {
    supabase,
    calls,
  };
}

test(
  "latest stored loader keeps newest row per provider segment",
  async () => {
    const {
      supabase,
      calls,
    } = createQuery([
      {
        provider_segment_id: "A",
        provider_geometry: {
          links: [],
        },
        road_name: "Road A",
        current_speed_kmh: 20,
        free_flow_speed_kmh: 60,
        congestion_percent: 70,
        delay_minutes: 8,
        confidence: 0.9,
        jam_factor: 8,
        observed_at:
          "2026-10-07T08:10:00.000Z",
      },
      {
        provider_segment_id: "A",
        provider_geometry: {
          links: [],
        },
        road_name: "Road A old",
        current_speed_kmh: 50,
        free_flow_speed_kmh: 60,
        congestion_percent: 10,
        delay_minutes: 1,
        confidence: 0.8,
        jam_factor: 2,
        observed_at:
          "2026-10-07T08:00:00.000Z",
      },
      {
        provider_segment_id: "B",
        provider_geometry: {
          links: [],
        },
        road_name: "Road B",
        current_speed_kmh: 40,
        free_flow_speed_kmh: 60,
        congestion_percent: 35,
        delay_minutes: 3,
        confidence: 0.7,
        jam_factor: 4,
        observed_at:
          "2026-10-07T08:05:00.000Z",
      },
    ]);

    const result =
      await loadLatestStoredTrafficFlowObservations(
        supabase,
        "org-1",
        {
          maximumAgeMinutes: 60,
        }
      );

    assert.equal(
      result.rawCount,
      3
    );

    assert.equal(
      result.latestSegmentCount,
      2
    );

    assert.equal(
      result.observations.length,
      2
    );

    assert.equal(
      result.observations[0]
        .providerSegmentId,
      "A"
    );

    assert.equal(
      result.observations[0]
        .congestion,
      70
    );

    assert.ok(
      calls.some(
        (call) =>
          call[0] === "eq" &&
          call[1] ===
            "organization_id" &&
          call[2] === "org-1"
      )
    );

    assert.ok(
      calls.some(
        (call) =>
          call[0] === "eq" &&
          call[1] === "provider" &&
          call[2] === "here"
      )
    );

    assert.ok(
      calls.some(
        (call) =>
          call[0] === "gte" &&
          call[1] ===
            "observed_at"
      )
    );
  }
);

test(
  "latest stored loader validates organization and freshness window",
  async () => {
    const {
      supabase,
    } = createQuery([]);

    await assert.rejects(
      () =>
        loadLatestStoredTrafficFlowObservations(
          supabase,
          "",
          {}
        ),
      /organizationId is required/
    );

    await assert.rejects(
      () =>
        loadLatestStoredTrafficFlowObservations(
          supabase,
          "org-1",
          {
            maximumAgeMinutes: 0,
          }
        ),
      /maximumAgeMinutes/
    );
  }
);

test(
  "existing point radius loader remains layered on latest stored observations",
  async () => {
    const {
      supabase,
    } = createQuery([
      {
        provider_segment_id: "A",
        provider_geometry: {
          links: [
            {
              points: [
                {
                  lat: -33.9,
                  lng: 18.5,
                },
              ],
            },
          ],
        },
        road_name: "Road A",
        current_speed_kmh: 20,
        free_flow_speed_kmh: 60,
        congestion_percent: 70,
        delay_minutes: 8,
        confidence: 0.9,
        jam_factor: 8,
        observed_at:
          "2026-10-07T08:10:00.000Z",
      },
    ]);

    const result =
      await loadRecentTrafficFlowObservations(
        supabase,
        "org-1",
        {
          latitude: -33.9,
          longitude: 18.5,
          radiusMeters: 100,
          maximumAgeMinutes: 60,
        }
      );

    assert.equal(
      result.rawCount,
      1
    );

    assert.equal(
      result.latestSegmentCount,
      1
    );

    assert.equal(
      result.flow.length,
      1
    );

    assert.equal(
      result.flow[0]
        .providerSegmentId,
      "A"
    );

    assert.equal(
      result.flow[0]
        .congestion,
      70
    );
  }
);
