import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260916203000_record_payfast_subscription_cancellation_atomically.sql",
  "utf8"
);

const notify = fs.readFileSync(
  "app/api/payfast/notify/route.ts",
  "utf8"
);

const cancelRoute = fs.readFileSync(
  "app/api/billing/cancel/route.ts",
  "utf8"
);

test(
  "cancellation RPC preserves cancel-at-period-end state",
  () => {
    assert.match(
      migration,
      /subscription_status\s*=\s*'cancelled'/i
    );

    assert.match(
      migration,
      /cancelled_at\s*=\s*coalesce\(cancelled_at,\s*now\(\)\)/i
    );

    assert.doesNotMatch(
      migration,
      /next_billing_date\s*=/
    );

    assert.match(
      migration,
      /'subscription_cancelled'/
    );
  }
);

test(
  "cancellation RPC is idempotent",
  () => {
    assert.match(
      migration,
      /billing_events_payfast_subscription_cancelled_unique/
    );

    assert.match(
      migration,
      /on conflict do nothing/i
    );

    assert.match(
      migration,
      /select\s+false,\s*true/is
    );

    assert.match(
      migration,
      /select\s+true,\s*false/is
    );
  }
);

test(
  "authenticated billing cancel endpoint preserves tenant authorization boundary",
  () => {
    assert.match(
      cancelRoute,
      /auth\.getUser/
    );

    assert.match(
      cancelRoute,
      /billing:manage/
    );

    assert.match(
      cancelRoute,
      /profile\.organization_id/
    );

    assert.match(
      cancelRoute,
      /payfast_subscription_id/
    );
  }
);

test(
  "outbound PayFast cancellation is sandbox-only until production verification",
  () => {
    assert.match(
      cancelRoute,
      /payfastMode !== "sandbox"[\s\S]*?outboundCancellationEnabled:\s*false/
    );

    assert.doesNotMatch(
      cancelRoute,
      /fetch\(\s*["'`]https:\/\/api\.payfast\.co\.za/
    );
  }
);

test(
  "CANCELLED ITN delegates to atomic cancellation state RPC",
  () => {
    assert.match(
      notify,
      /payload\.payment_status\s*===\s*"CANCELLED"/
    );

    assert.match(
      notify,
      /record_payfast_subscription_cancellation_atomically/
    );

    assert.match(
      notify,
      /p_payload:\s*payload/
    );

    assert.match(
      notify,
      /p_raw_payload:\s*rawBody/
    );
  }
);
