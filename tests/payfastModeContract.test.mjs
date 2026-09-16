import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPath = "lib/payfast/mode.ts";
const checkoutPath = "app/api/billing/professional/route.ts";
const notifyPath = "app/api/payfast/notify/route.ts";

test("PayFast mode helper accepts only explicit true or false", () => {
  const source = fs.readFileSync(helperPath, "utf8");

  assert.match(
    source,
    /if \(rawValue === "true"\)/
  );

  assert.match(
    source,
    /if \(rawValue === "false"\)/
  );

  assert.match(
    source,
    /PAYFAST_SANDBOX must be explicitly set to "true" or "false"\./
  );

  assert.match(
    source,
    /https:\/\/sandbox\.payfast\.co\.za\/eng\/process/
  );

  assert.match(
    source,
    /https:\/\/www\.payfast\.co\.za\/eng\/process/
  );

  assert.match(
    source,
    /https:\/\/sandbox\.payfast\.co\.za\/eng\/query\/validate/
  );

  assert.match(
    source,
    /https:\/\/www\.payfast\.co\.za\/eng\/query\/validate/
  );
});

test("checkout uses shared strict PayFast process URL helper", () => {
  const source = fs.readFileSync(checkoutPath, "utf8");

  assert.match(
    source,
    /import \{ getPayFastProcessUrl \} from "@\/lib\/payfast\/mode";/
  );

  assert.match(
    source,
    /const payFastUrl = getPayFastProcessUrl\(\);/
  );

  assert.doesNotMatch(
    source,
    /process\.env\.PAYFAST_SANDBOX\s*===\s*"true"/
  );
  assert.doesNotMatch(
    source,
    /^const PAYFAST_URL = getPayFastProcessUrl\(\);/m
  );
});

test("ITN validation uses shared strict PayFast validation URL helper", () => {
  const source = fs.readFileSync(notifyPath, "utf8");

  assert.match(
    source,
    /import \{ getPayFastValidationUrl \} from "@\/lib\/payfast\/mode";/
  );

  assert.match(
    source,
    /getPayFastValidationUrl\(\)/
  );

  assert.doesNotMatch(
    source,
    /process\.env\.PAYFAST_SANDBOX\s*===\s*"true"/
  );
  assert.doesNotMatch(
    source,
    /^const PAYFAST_URL = getPayFastProcessUrl\(\);/m
  );
});