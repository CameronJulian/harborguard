import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const subscription = fs.readFileSync(
  "lib/subscription.ts",
  "utf8"
);

const requirePremium = fs.readFileSync(
  "lib/require-premium.ts",
  "utf8"
);

const serverAuth = fs.readFileSync(
  "lib/server-auth.ts",
  "utf8"
);

test(
  "subscription query loads period-end cancellation state",
  () => {
    assert.match(
      subscription,
      /next_billing_date/
    );

    assert.match(
      subscription,
      /cancelled_at/
    );
  }
);

test(
  "cancelled subscription retains premium only before period end",
  () => {
    assert.match(
      subscription,
      /status === "cancelled" && nextBillingDate/
    );

    assert.match(
      subscription,
      /Number\.isFinite\(periodEnd\)/
    );

    assert.match(
      subscription,
      /periodEnd > Date\.now\(\)/
    );
  }
);

test(
  "missing or expired cancellation period falls through to deny",
  () => {
    assert.match(
      subscription,
      /return false;/
    );
  }
);

test(
  "requirePremiumAccess forwards next billing date",
  () => {
    assert.match(
      requirePremium,
      /subscription\?\.next_billing_date/
    );
  }
);

test(
  "server auth centralizes entitlement evaluation",
  () => {
    assert.match(
      serverAuth,
      /import \{ canAccessPremiumFeatures \} from "@\/lib\/subscription";/
    );

    assert.doesNotMatch(
      serverAuth,
      /subscriptionStatus !== "active"/
    );

    assert.doesNotMatch(
      serverAuth,
      /subscriptionStatus === "trialing"/
    );

    const helperCalls =
      serverAuth.match(
        /canAccessPremiumFeatures\(/g
      ) || [];

    assert.equal(
      helperCalls.length,
      2
    );
  }
);

test(
  "both server auth organization queries load next billing date",
  () => {
    const matches =
      serverAuth.match(
        /next_billing_date/g
      ) || [];

    assert.ok(
      matches.length >= 2
    );
  }
);