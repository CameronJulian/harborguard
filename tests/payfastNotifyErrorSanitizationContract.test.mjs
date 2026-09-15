import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath = "app/api/payfast/notify/route.ts";

test("PayFast ITN sanitizes internal 500 errors while preserving controlled 413 detail", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.doesNotMatch(source, /organizationLookupError\.message/);
  assert.doesNotMatch(source, /invoiceLookupError\.message/);
  assert.doesNotMatch(source, /organizationError\.message/);
  assert.doesNotMatch(source, /invoiceError\.message/);

  assert.doesNotMatch(
    source,
    /err instanceof Error\s*\?\s*err\.message\s*:\s*"Webhook processing failed\."/
  );

  const safe500Matches =
    source.match(/\{ error: "Webhook processing failed\." \}/g) ?? [];

  assert.equal(safe500Matches.length, 5);

  assert.match(
    source,
    /err instanceof PayFastPayloadTooLargeError[\s\S]*?\{ error: err\.message \}[\s\S]*?\{ status: 413 \}/
  );

  assert.match(
    source,
    /console\.error\(\s*"PayFast ITN organization lookup failed:"/
  );

  assert.match(
    source,
    /console\.error\(\s*"PayFast ITN invoice lookup failed:"/
  );

  assert.match(
    source,
    /console\.error\(\s*"PayFast ITN subscription update failed:"/
  );

  assert.match(
    source,
    /console\.error\(\s*"PayFast ITN invoice insert failed:"/
  );

  assert.match(
    source,
    /console\.error\("PayFast ITN processing failed:", err\)/
  );
});