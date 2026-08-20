import assert from "node:assert/strict";
import test from "node:test";

import {
  persistRouteSafetyProviderObservation,
} from "../lib/hspp/persistRouteSafetyProviderObservation";

type Row =
  Record<string, any>;

function createSupabaseMock(
  initialRows: Row[] = []
) {
  const rows =
    initialRows.map(
      (row) => structuredClone(row)
    );

  let nextId = 1;

  function identityMatch(
    left: Row,
    right: Row
  ) {
    return (
      left.organization_id ===
        right.organization_id &&
      left.provider ===
        right.provider &&
      left.source_stream ===
        right.source_stream &&
      left.provider_message_id ===
        right.provider_message_id
    );
  }

  return {
    rows,

    from(table: string) {
      assert.equal(
        table,
        "route_safety_provider_observations"
      );

      return {
        insert(inserted: Row) {
          return {
            select() {
              return {
                async single() {
                  const duplicate =
                    rows.find(
                      (row) =>
                        identityMatch(
                          row,
                          inserted
                        )
                    );

                  if (duplicate) {
                    return {
                      data: null,
                      error: {
                        code: "23505",
                        message:
                          "duplicate key value violates unique constraint",
                      },
                    };
                  }

                  const persisted = {
                    id:
                      `observation-${nextId++}`,

                    ...structuredClone(
                      inserted
                    ),
                  };

                  rows.push(
                    persisted
                  );

                  return {
                    data:
                      structuredClone(
                        persisted
                      ),

                    error: null,
                  };
                },
              };
            },
          };
        },

        select() {
          const filters:
            Record<string, unknown> = {};

          const query = {
            eq(
              field: string,
              value: unknown
            ) {
              filters[field] =
                value;

              return query;
            },

            async maybeSingle() {
              const match =
                rows.find(
                  (row) =>
                    Object.entries(
                      filters
                    ).every(
                      ([
                        field,
                        value,
                      ]) =>
                        row[field] ===
                        value
                    )
                );

              return {
                data:
                  match
                    ? structuredClone(
                        match
                      )
                    : null,

                error: null,
              };
            },
          };

          return query;
        },
      };
    },
  };
}

function validInput(
  supabase: any,
  overrides:
    Record<string, unknown> = {}
) {
  return {
    supabase,

    organizationId:
      "org-1",

    provider:
      "here",

    sourceStream:
      "here_traffic",

    providerMessageId:
      "here-original-123",

    observedAt:
      "2026-08-20T12:00:00.000Z",

    receivedAt:
      "2026-08-20T12:00:05.000Z",

    payloadSchemaVersion:
      "normalized-route-safety-alert-v1",

    normalizedPayload: {
      type:
        "accident",

      severity:
        "high",

      latitude:
        -33.9249,

      longitude:
        18.4241,
    },

    ...overrides,
  };
}

test(
  "first provider observation is created",
  async () => {
    const supabase =
      createSupabaseMock();

    const result =
      await persistRouteSafetyProviderObservation(
        validInput(supabase)
      );

    assert.equal(
      result.created,
      true
    );

    assert.equal(
      result.id,
      "observation-1"
    );

    assert.equal(
      supabase.rows.length,
      1
    );
  }
);

test(
  "same provider observation identity is idempotent",
  async () => {
    const supabase =
      createSupabaseMock();

    const first =
      await persistRouteSafetyProviderObservation(
        validInput(supabase)
      );

    const second =
      await persistRouteSafetyProviderObservation(
        validInput(supabase)
      );

    assert.equal(
      second.created,
      false
    );

    assert.equal(
      second.id,
      first.id
    );

    assert.equal(
      supabase.rows.length,
      1
    );
  }
);

test(
  "payload object key ordering does not break idempotency",
  async () => {
    const supabase =
      createSupabaseMock();

    await persistRouteSafetyProviderObservation(
      validInput(supabase)
    );

    const result =
      await persistRouteSafetyProviderObservation(
        validInput(
          supabase,
          {
            normalizedPayload: {
              longitude:
                18.4241,

              latitude:
                -33.9249,

              severity:
                "high",

              type:
                "accident",
            },
          }
        )
      );

    assert.equal(
      result.created,
      false
    );
  }
);

test(
  "same provider identity with changed observed time fails closed",
  async () => {
    const supabase =
      createSupabaseMock();

    await persistRouteSafetyProviderObservation(
      validInput(supabase)
    );

    await assert.rejects(
      () =>
        persistRouteSafetyProviderObservation(
          validInput(
            supabase,
            {
              observedAt:
                "2026-08-20T12:01:00.000Z",
            }
          )
        ),

      /observedAt does not match/
    );
  }
);

test(
  "same provider identity with changed schema fails closed",
  async () => {
    const supabase =
      createSupabaseMock();

    await persistRouteSafetyProviderObservation(
      validInput(supabase)
    );

    await assert.rejects(
      () =>
        persistRouteSafetyProviderObservation(
          validInput(
            supabase,
            {
              payloadSchemaVersion:
                "normalized-route-safety-alert-v2",
            }
          )
        ),

      /payload schema does not match/
    );
  }
);

test(
  "same provider identity with changed payload fails closed",
  async () => {
    const supabase =
      createSupabaseMock();

    await persistRouteSafetyProviderObservation(
      validInput(supabase)
    );

    await assert.rejects(
      () =>
        persistRouteSafetyProviderObservation(
          validInput(
            supabase,
            {
              normalizedPayload: {
                type:
                  "accident",

                severity:
                  "critical",

                latitude:
                  -33.9249,

                longitude:
                  18.4241,
              },
            }
          )
        ),

      /normalized payload does not match/
    );
  }
);

test(
  "different provider message identities create distinct observations",
  async () => {
    const supabase =
      createSupabaseMock();

    const first =
      await persistRouteSafetyProviderObservation(
        validInput(supabase)
      );

    const second =
      await persistRouteSafetyProviderObservation(
        validInput(
          supabase,
          {
            providerMessageId:
              "here-original-124",
          }
        )
      );

    assert.notEqual(
      first.id,
      second.id
    );

    assert.equal(
      supabase.rows.length,
      2
    );
  }
);

test(
  "blank provider identity fails before database access",
  async () => {
    let databaseTouched =
      false;

    const supabase = {
      from() {
        databaseTouched =
          true;

        throw new Error(
          "database should not be touched"
        );
      },
    };

    await assert.rejects(
      () =>
        persistRouteSafetyProviderObservation(
          validInput(
            supabase,
            {
              providerMessageId:
                "   ",
            }
          )
        ),

      /providerMessageId is required/
    );

    assert.equal(
      databaseTouched,
      false
    );
  }
);

test(
  "invalid provider observation time fails before database access",
  async () => {
    let databaseTouched =
      false;

    const supabase = {
      from() {
        databaseTouched =
          true;

        throw new Error(
          "database should not be touched"
        );
      },
    };

    await assert.rejects(
      () =>
        persistRouteSafetyProviderObservation(
          validInput(
            supabase,
            {
              observedAt:
                "not-a-timestamp",
            }
          )
        ),

      /observedAt must be a valid timestamp/
    );

    assert.equal(
      databaseTouched,
      false
    );
  }
);
