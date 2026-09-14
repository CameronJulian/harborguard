import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routePath = "app/api/payfast/notify/route.ts";

const route = fs.readFileSync(routePath, "utf8");

test("PayFast ITN has an explicit 32 KiB body ceiling", () => {
  assert.match(
    route,
    /MAX_PAYFAST_ITN_BYTES\s*=\s*32\s*\*\s*1024/
  );

  assert.match(
    route,
    /content-length/
  );

  assert.match(
    route,
    /totalBytes\s*>\s*MAX_PAYFAST_ITN_BYTES/
  );

  assert.match(
    route,
    /status:\s*413/
  );
});

test("PayFast ITN is parsed from the bounded raw body", () => {
  assert.match(
    route,
    /readPayFastItnBody\(req\)/
  );

  assert.match(
    route,
    /new URLSearchParams\(rawBody\)/
  );

  assert.doesNotMatch(
    route,
    /await\s+req\.formData\(\)/
  );
});

test("PayFast ITN does not depend on an exact inbound content-type header", () => {
  assert.doesNotMatch(
    route,
    /Unsupported PayFast content type/
  );

  assert.doesNotMatch(
    route,
    /status:\s*415/
  );
});

test("body bounding occurs before signature validation and mutation", () => {
  const bodyIndex = route.indexOf("readPayFastItnBody(req)");
  const signatureIndex = route.indexOf("verifyPayFastSignature(");
  const remoteIndex = route.indexOf("validatePayFastITN(payload)");
  const mutationIndex = route.indexOf(".update({");

  assert.ok(bodyIndex >= 0);
  assert.ok(signatureIndex > bodyIndex);
  assert.ok(remoteIndex > signatureIndex);

  if (mutationIndex >= 0) {
    assert.ok(mutationIndex > remoteIndex);
  }
});
