import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const helperPath = "lib/payfast/signature.ts";
const checkoutPath = "app/api/billing/professional/route.ts";
const notifyPath = "app/api/payfast/notify/route.ts";

const helper = fs.readFileSync(helperPath, "utf8");
const checkout = fs.readFileSync(checkoutPath, "utf8");
const notify = fs.readFileSync(notifyPath, "utf8");

test("PayFast signature logic is shared", () => {
  assert.match(
    helper,
    /export function generatePayFastSignature/
  );

  assert.match(
    helper,
    /key !== "signature"/
  );

  assert.match(
    helper,
    /replace\(\/%20\/g, "\+"\)/
  );

  assert.match(
    helper,
    /createHash\("md5"\)/
  );

  assert.match(
    helper,
    /timingSafeEqual/
  );
});

test("checkout uses shared PayFast signature generator", () => {
  assert.match(
    checkout,
    /generatePayFastSignature\(paymentData, passphrase\)/
  );

  assert.doesNotMatch(
    checkout,
    /function generateSignature\s*\(/
  );
});

test("ITN verifies signature before PayFast validation and mutation", () => {
  assert.match(
    notify,
    /verifyPayFastSignature/
  );

  assert.match(
    notify,
    /Invalid PayFast signature\./
  );

  const signatureIndex =
    notify.indexOf("verifyPayFastSignature(");

  const remoteValidationIndex =
    notify.indexOf("validatePayFastITN(payload)");

  const mutationIndex =
    notify.indexOf(".update({");

  assert.ok(signatureIndex >= 0);
  assert.ok(remoteValidationIndex >= 0);
  assert.ok(signatureIndex < remoteValidationIndex);

  if (mutationIndex >= 0) {
    assert.ok(signatureIndex < mutationIndex);
  }
});
