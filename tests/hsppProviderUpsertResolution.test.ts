import assert from "node:assert/strict";
import test from "node:test";

import {
  insertNewProviderAlerts,
} from "../lib/route-safety/upsertRouteSafetyAlerts";
import type {
  RouteSafetyAlertRow,
} from "../lib/route-safety/types";

type AnyRow = Record<string, any>;

function makeRow(
  title: string,
  latitude: number,
  longitude: number
): RouteSafetyAlertRow {
  return {
    organization_id: "org-1",
    type: "road_hazard",
    title,
    description: title,
    latitude,
    longitude,
    radius_meters: 100,
    severity: "medium",
    source: "here_traffic",
    status: "active",
    expires_at: "2026-08-21T12:00:00.000Z",
    verified_at: "2026-08-20T12:00:00.000Z",
    road_name: "Main Road",
    road_from: null,
    road_to: null,
    provider_geometry: null,
  };
}

function makeSupabase(params: {
  existing?: AnyRow[];
  inserted?: AnyRow[];
}) {
  const existing =
    params.existing ?? [];

  let insertedInput: AnyRow[] = [];

  const supabase = {
    from(table: string) {
      assert.equal(
        table,
        "route_safety_alerts"
      );

      return {
        select() {
          return {
            eq() {
              return this;
            },

            or() {
              return Promise.resolve({
                data: existing,
                error: null,
              });
            },
          };
        },

        update() {
          return {
            eq() {
              return this;
            },

            then(
              resolve: (
                value: {
                  error: null;
                }
              ) => unknown
            ) {
              return Promise.resolve({
                error: null,
              }).then(resolve);
            },
          };
        },

        insert(rows: AnyRow[]) {
          insertedInput = rows;

          return {
            select() {
              const returned =
                params.inserted ??
                rows.map(
                  (
                    row,
                    index
                  ) => ({
                    id:
                      `inserted-${index + 1}`,
                    ...row,
                  })
                );

              return Promise.resolve({
                data: returned,
                error: null,
              });
            },
          };
        },
      };
    },
  };

  return {
    supabase,
    getInsertedInput: () =>
      insertedInput,
  };
}

test(
  "empty input returns empty resolutions",
  async () => {
    const { supabase } =
      makeSupabase({});

    const result =
      await insertNewProviderAlerts(
        supabase,
        "org-1",
        "here_traffic",
        65,
        []
      );

    assert.deepEqual(
      result.resolutions,
      []
    );

    assert.equal(
      result.imported,
      0
    );
  }
);

test(
  "same-provider refresh returns the exact existing alert id",
  async () => {
    const row =
      makeRow(
        "Closure",
        -26.10001,
        28.10001
      );

    const { supabase } =
      makeSupabase({
        existing: [
          {
            id: "existing-here",
            source: "here_traffic",
            type: row.type,
            title: row.title,
            latitude: row.latitude,
            longitude: row.longitude,
            expires_at: row.expires_at,
            road_name: row.road_name,
            road_from: null,
            road_to: null,
            provider_geometry: null,
            provider_sources: [
              "here_traffic",
            ],
            provider_confirmation_count:
              1,
            provider_confidence:
              65,
            provider_last_seen: {
              here_traffic:
                "2026-08-20T10:00:00.000Z",
            },
            last_provider_confirmation_at:
              "2026-08-20T10:00:00.000Z",
          },
        ],
      });

    const result =
      await insertNewProviderAlerts(
        supabase,
        "org-1",
        "here_traffic",
        65,
        [row]
      );

    assert.equal(
      result.resolutions.length,
      1
    );

    assert.equal(
      result.resolutions[0]
        .outcome,
      "refreshed_existing"
    );

    assert.equal(
      result.resolutions[0]
        .alertId,
      "existing-here"
    );

    assert.equal(
      result.resolutions[0]
        .inputIndex,
      0
    );
  }
);

test(
  "cross-provider merge returns the exact existing alert id",
  async () => {
    const row =
      makeRow(
        "Road closure",
        -26.20001,
        28.20001
      );

    const { supabase } =
      makeSupabase({
        existing: [
          {
            id: "existing-tomtom",
            source: "tomtom",
            type: row.type,
            title: row.title,
            latitude: row.latitude,
            longitude: row.longitude,
            expires_at: row.expires_at,
            road_name: row.road_name,
            road_from: null,
            road_to: null,
            provider_geometry: null,
            provider_sources: [
              "tomtom",
            ],
            provider_confirmation_count:
              1,
            provider_confidence:
              60,
            provider_last_seen: {
              tomtom:
                "2026-08-20T10:00:00.000Z",
            },
            last_provider_confirmation_at:
              "2026-08-20T10:00:00.000Z",
          },
        ],
      });

    const result =
      await insertNewProviderAlerts(
        supabase,
        "org-1",
        "here_traffic",
        65,
        [row]
      );

    assert.equal(
      result.resolutions.length,
      1
    );

    assert.equal(
      result.resolutions[0]
        .outcome,
      "merged_cross_provider"
    );

    assert.equal(
      result.resolutions[0]
        .alertId,
      "existing-tomtom"
    );

    assert.deepEqual(
      new Set(
        result.resolutions[0]
          .providerSources
      ),
      new Set([
        "tomtom",
        "here_traffic",
      ])
    );
  }
);

test(
  "new inserts are resolved by canonical key when database return order is reversed",
  async () => {
    const first =
      makeRow(
        "First",
        -26.30001,
        28.30001
      );

    const second =
      makeRow(
        "Second",
        -26.40001,
        28.40001
      );

    const inserted = [
      {
        id: "db-second",
        ...second,
        provider_sources: [
          "here_traffic",
        ],
        provider_last_seen: {
          here_traffic:
            "2026-08-20T12:00:00.000Z",
        },
        provider_confirmation_count:
          1,
        provider_confidence:
          65,
      },
      {
        id: "db-first",
        ...first,
        provider_sources: [
          "here_traffic",
        ],
        provider_last_seen: {
          here_traffic:
            "2026-08-20T12:00:00.000Z",
        },
        provider_confirmation_count:
          1,
        provider_confidence:
          65,
      },
    ];

    const { supabase } =
      makeSupabase({
        inserted,
      });

    const result =
      await insertNewProviderAlerts(
        supabase,
        "org-1",
        "here_traffic",
        65,
        [
          first,
          second,
        ]
      );

    assert.equal(
      result.resolutions[0]
        .alertId,
      "db-first"
    );

    assert.equal(
      result.resolutions[1]
        .alertId,
      "db-second"
    );

    assert.equal(
      result.resolutions[0]
        .outcome,
      "inserted"
    );

    assert.equal(
      result.resolutions[1]
        .outcome,
      "inserted"
    );
  }
);

test(
  "queued duplicate resolves to the same inserted alert id",
  async () => {
    const first =
      makeRow(
        "Duplicate",
        -26.50001,
        28.50001
      );

    const duplicate =
      {
        ...first,
      };

    const { supabase } =
      makeSupabase({
        inserted: [
          {
            id: "db-shared",
            ...first,
            provider_sources: [
              "here_traffic",
            ],
            provider_last_seen: {
              here_traffic:
                "2026-08-20T12:00:00.000Z",
            },
            provider_confirmation_count:
              1,
            provider_confidence:
              65,
          },
        ],
      });

    const result =
      await insertNewProviderAlerts(
        supabase,
        "org-1",
        "here_traffic",
        65,
        [
          first,
          duplicate,
        ]
      );

    assert.equal(
      result.imported,
      1
    );

    assert.equal(
      result.skippedDuplicates,
      1
    );

    assert.equal(
      result.resolutions.length,
      2
    );

    assert.equal(
      result.resolutions[0]
        .alertId,
      "db-shared"
    );

    assert.equal(
      result.resolutions[1]
        .alertId,
      "db-shared"
    );

    assert.equal(
      result.resolutions[0]
        .outcome,
      "inserted"
    );

    assert.equal(
      result.resolutions[1]
        .outcome,
      "skipped_duplicate"
    );
  }
);
