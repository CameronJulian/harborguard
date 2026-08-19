import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const readerPath =
  new URL(
    "../lib/fleet/readRouteRiskTrainingExamples.ts",
    import.meta.url
  );

const migrationPath =
  new URL(
    "../supabase/migrations/20260819083000_add_route_risk_training_keyset_index.sql",
    import.meta.url
  );

const readerSource =
  fs.readFileSync(
    readerPath,
    "utf8"
  );

const migrationSource =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "training reader orders the keyset by outcome completion time and stable id",
  () => {
    const outcomeOrder =
      /\.order\(\s*"outcome_completed_at",\s*\{\s*ascending:\s*true,/m;

    const idOrder =
      /\.order\(\s*"id",\s*\{\s*ascending:\s*true,/m;

    const outcomeMatch =
      outcomeOrder.exec(
        readerSource
      );

    const idMatch =
      idOrder.exec(
        readerSource
      );

    assert.ok(
      outcomeMatch,
      "Expected outcome_completed_at ascending ordering."
    );

    assert.ok(
      idMatch,
      "Expected id ascending ordering."
    );

    assert.ok(
      idMatch.index >
        outcomeMatch.index,
      "Expected id as the deterministic secondary ordering."
    );
  }
);

test(
  "training reader no longer uses offset range pagination",
  () => {
    assert.doesNotMatch(
      readerSource,
      /let\s+offset\s*=/
    );

    assert.doesNotMatch(
      readerSource,
      /\.range\(/
    );

    assert.doesNotMatch(
      readerSource,
      /offset\s*\+=/
    );

    assert.match(
      readerSource,
      /\.limit\(\s*pageSize\s*\)/
    );
  }
);

test(
  "training reader advances with a compound timestamp and id cursor",
  () => {
    assert.match(
      readerSource,
      /cursorOutcomeCompletedAt/
    );

    assert.match(
      readerSource,
      /cursorId/
    );

    assert.match(
      readerSource,
      /outcome_completed_at\.gt/
    );

    assert.match(
      readerSource,
      /outcome_completed_at\.eq/
    );

    assert.match(
      readerSource,
      /id\.gt/
    );
  }
);

test(
  "same-timestamp rows are continued by id rather than skipped",
  () => {
    assert.match(
      readerSource,
      /outcome_completed_at\.eq\.\$\{cursorOutcomeCompletedAt\}[\s\S]*?id\.gt\.\$\{cursorId\}/
    );
  }
);

test(
  "keyset cursor advances from the final row of each complete page",
  () => {
    assert.match(
      readerSource,
      /finalEvaluation[\s\S]*?evaluations\[[\s\S]*?evaluations\.length\s*-\s*1[\s\S]*?\]/
    );

    assert.match(
      readerSource,
      /cursorOutcomeCompletedAt\s*=\s*finalEvaluation\.outcome_completed_at/
    );

    assert.match(
      readerSource,
      /cursorId\s*=\s*finalEvaluation\.id/
    );
  }
);

test(
  "database index exactly supports organization plus keyset ordering",
  () => {
    assert.match(
      migrationSource,
      /create index if not exists\s+route_prediction_evaluations_org_outcome_completed_id_idx/
    );

    assert.match(
      migrationSource,
      /on public\.route_prediction_evaluations\s*\(\s*organization_id,\s*outcome_completed_at,\s*id\s*\)/s
    );
  }
);

test(
  "scale migration changes no tables or model authority",
  () => {
    assert.doesNotMatch(
      migrationSource,
      /alter table/i
    );

    assert.doesNotMatch(
      migrationSource,
      /drop table/i
    );

    assert.doesNotMatch(
      migrationSource,
      /delete from/i
    );

    assert.doesNotMatch(
      migrationSource,
      /update\s+public\./i
    );

    assert.doesNotMatch(
      migrationSource,
      /activateRouteRisk/i
    );
  }
);
