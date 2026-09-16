import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pricingPath = "app/pricing/page.tsx";
const billingPath = "lib/billing.ts";

test("public Professional pricing matches the authoritative R499 monthly price", () => {
  const pricing = fs.readFileSync(pricingPath, "utf8");
  const billing = fs.readFileSync(billingPath, "utf8");

  assert.match(
    billing,
    /export const PROFESSIONAL_MONTHLY_PRICE_ZAR = 499 as const;/
  );

  assert.match(
    billing,
    /export const PROFESSIONAL_MONTHLY_AMOUNT = "499\.00" as const;/
  );

  assert.match(
    pricing,
    /name: "Professional",[\s\S]*?price: "R499\/mo"/
  );

  assert.doesNotMatch(
    pricing,
    /R4,999\/mo/
  );
});