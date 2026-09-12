import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260912113000_create_scheduled_worker_state.sql",
    import.meta.url
  ),
  "utf8"
);

const helper = fs.readFileSync(
  new URL(
    "../lib/server/recordScheduledWorkerState.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "scheduled worker state schema uses one durable organization-scoped worker identity",
  () => {
    assert.match(
      migration,
      /create\s+table\s+public\.scheduled_worker_state/i
    );

    assert.match(
      migration,
      /organization_id\s+uuid\s+not\s+null[\s\S]*?references\s+public\.organizations\s*\(\s*id\s*\)/i
    );

    assert.match(
      migration,
      /worker_key\s+text\s+not\s+null/i
    );

    assert.match(
      migration,
      /unique\s*\(\s*organization_id\s*,\s*worker_key\s*\)/i
    );
  }
);

test(
  "scheduled worker state stores latest start success failure and metadata only",
  () => {
    for (const column of [
      "last_started_at",
      "last_successful_at",
      "last_failure_at",
      "last_failure_message",
      "metadata",
      "created_at",
      "updated_at",
    ]) {
      assert.match(
        migration,
        new RegExp(`\\b${column}\\b`, "i")
      );
    }

    assert.doesNotMatch(
      migration,
      /\b(?:execution_id|attempt_id|processing_state|completion_state|lease_token|lease_owner)\b/i
    );
  }
);

test(
  "scheduled worker state is readable by own organization and writable by service role",
  () => {
    assert.match(
      migration,
      /enable\s+row\s+level\s+security/i
    );

    assert.match(
      migration,
      /for\s+select[\s\S]*?to\s+authenticated[\s\S]*?profiles\.organization_id[\s\S]*?auth\.uid\(\)/i
    );

    assert.match(
      migration,
      /grant\s+select[\s\S]*?scheduled_worker_state[\s\S]*?to\s+authenticated/i
    );

    assert.match(
      migration,
      /grant\s+all[\s\S]*?scheduled_worker_state[\s\S]*?to\s+service_role/i
    );
  }
);

test(
  "scheduled worker writer supports started succeeded and failed events",
  () => {
    assert.match(
      helper,
      /"started"\s*\|\s*"succeeded"\s*\|\s*"failed"/
    );

    assert.match(
      helper,
      /event\s*===\s*"started"[\s\S]*?last_started_at/
    );

    assert.match(
      helper,
      /event\s*===\s*"succeeded"[\s\S]*?last_successful_at/
    );

    assert.match(
      helper,
      /last_failure_at[\s\S]*?last_failure_message/
    );
  }
);

test(
  "successful worker state explicitly clears prior failure state",
  () => {
    assert.match(
      helper,
      /event\s*===\s*"succeeded"[\s\S]*?last_successful_at\s*=\s*now[\s\S]*?last_failure_at\s*=\s*null[\s\S]*?last_failure_message\s*=\s*null/
    );

    assert.doesNotMatch(
      helper,
      /event\s*===\s*"succeeded"[\s\S]*?last_failure_at\s*=\s*undefined/
    );

    assert.match(
      helper,
      /last_failure_at\?:\s*string\s*\|\s*null/
    );
  }
);
test(
  "scheduled worker writer upserts by organization and worker key",
  () => {
    assert.match(
      helper,
      /\.from\s*\(\s*["']scheduled_worker_state["']\s*\)/
    );

    assert.match(
      helper,
      /\.upsert\s*\(/
    );

    assert.match(
      helper,
      /onConflict:\s*["']organization_id,worker_key["']/
    );
  }
);

test(
  "scheduled worker writer does not implement leases retries or processing authority",
  () => {
    assert.doesNotMatch(
      helper,
      /\b(?:leaseToken|leaseOwner|attemptId|executionId|processingState|completionState|claim|retryIdentity)\b/
    );
  }
);