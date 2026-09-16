import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/payfast/notify/route.ts",
    "utf8"
  );

const migration =
  fs.readFileSync(
    "supabase/migrations/20260916185000_record_payfast_failed_payment_atomically.sql",
    "utf8"
  );

test(
  "PayFast FAILED ITN delegates to atomic evidence persistence",
  () => {
    assert.match(
      route,
      /payload\.payment_status\s*===\s*"FAILED"/
    );

    assert.match(
      route,
      /record_payfast_failed_payment_atomically/
    );

    assert.match(
      route,
      /p_payfast_payment_id:\s*payfastPaymentId/
    );

    assert.match(
      route,
      /p_payload:\s*payload/
    );

    assert.match(
      route,
      /p_raw_payload:\s*rawBody/
    );
  }
);

test(
  "failed-payment RPC persists parsed and raw evidence",
  () => {
    assert.match(
      migration,
      /create or replace function\s+public\.record_payfast_failed_payment_atomically/i
    );

    assert.match(
      migration,
      /'payment_failed'/
    );

    assert.match(
      migration,
      /'payfast'/
    );

    assert.match(
      migration,
      /coalesce\(p_payload,\s*'\{\}'::jsonb\)/
    );

    assert.match(
      migration,
      /p_raw_payload/
    );
  }
);

test(
  "failed-payment evidence is idempotent",
  () => {
    assert.match(
      migration,
      /billing_events_payfast_failed_payment_unique/
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
  "failed-payment persistence does not mutate entitlement or create invoice",
  () => {
    const functionStart =
      migration.indexOf(
        "create or replace function"
      );

    const functionEnd =
      migration.indexOf(
        "revoke all",
        functionStart
      );

    assert.ok(functionStart >= 0);
    assert.ok(functionEnd > functionStart);

    const executable =
      migration.slice(
        functionStart,
        functionEnd
      );

    assert.doesNotMatch(
      executable,
      /update\s+public\.organizations/i
    );

    assert.doesNotMatch(
      executable,
      /insert\s+into\s+public\.invoices/i
    );

    assert.doesNotMatch(
      executable,
      /subscription_status\s*=/
    );

    assert.doesNotMatch(
      executable,
      /plan\s*=/
    );

    assert.doesNotMatch(
      executable,
      /next_billing_date\s*=/
    );
  }
);

test(
  "FAILED branch preserves duplicate acknowledgement semantics",
  () => {
    assert.match(
      route,
      /failedPayment\?\.duplicate\s*===\s*true[\s\S]*?success:\s*true,[\s\S]*?duplicate:\s*true/
    );
  }
);
