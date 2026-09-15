import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const billingPath = "lib/billing.ts";
const checkoutPath = "app/api/billing/professional/route.ts";
const notifyPath = "app/api/payfast/notify/route.ts";

test("Professional checkout and PayFast ITN share one authoritative amount", () => {
  const billing = fs.readFileSync(billingPath, "utf8");
  const checkout = fs.readFileSync(checkoutPath, "utf8");
  const notify = fs.readFileSync(notifyPath, "utf8");

  assert.match(
    billing,
    /export const PROFESSIONAL_MONTHLY_AMOUNT = "499\.00" as const;/
  );

  assert.match(
    billing,
    /export const PROFESSIONAL_MONTHLY_PRICE_ZAR = 499 as const;/
  );

  assert.match(
    checkout,
    /import \{ PROFESSIONAL_MONTHLY_AMOUNT \} from "@\/lib\/billing";/
  );

  assert.match(
    notify,
    /import \{ PROFESSIONAL_MONTHLY_AMOUNT \} from "@\/lib\/billing";/
  );

  assert.match(
    checkout,
    /amount: PROFESSIONAL_MONTHLY_AMOUNT,/
  );

  assert.match(
    checkout,
    /recurring_amount: PROFESSIONAL_MONTHLY_AMOUNT,/
  );

  assert.match(
    checkout,
    /metadata:\s*\{[\s\S]*?amount: PROFESSIONAL_MONTHLY_AMOUNT,/
  );

  assert.match(
    notify,
    /moneyEquals\(\s*payload\.amount_gross,\s*PROFESSIONAL_MONTHLY_AMOUNT\s*\)/
  );

  assert.doesNotMatch(
    checkout,
    /"499\.00"/
  );

  assert.doesNotMatch(
    notify,
    /PAYFAST_PROFESSIONAL_AMOUNT/
  );
});