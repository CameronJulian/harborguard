import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseProfessionalBillingRequest } from "../lib/payfast/parseProfessionalBillingRequest.ts";

function request(body, contentType = "application/json") {
  const headers = contentType === null
    ? {}
    : { "content-type": contentType };

  return new Request("http://localhost/api/billing/professional", {
    method: "POST",
    headers,
    body,
  });
}

test("accepts valid JSON email and trims surrounding whitespace", async () => {
  const result = await parseProfessionalBillingRequest(
    request(JSON.stringify({ billingEmail: "  owner@example.com  " }))
  );
  assert.deepEqual(result, {
    ok: true,
    billingEmail: "owner@example.com",
  });
});

test("accepts JSON media type casing and charset", async () => {
  const result = await parseProfessionalBillingRequest(
    request(
      JSON.stringify({ billingEmail: "owner@example.com" }),
      "Application/JSON; charset=utf-8"
    )
  );
  assert.equal(result.ok, true);
});

test("rejects missing or unsupported content type", async () => {
  for (const type of [null, "text/plain", "application/x-www-form-urlencoded"]) {
    const result = await parseProfessionalBillingRequest(
      request('{"billingEmail":"owner@example.com"}', type)
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 415);
  }
});

test("rejects malformed and empty JSON with 400", async () => {
  for (const body of ["{", ""]) {
    const result = await parseProfessionalBillingRequest(request(body));
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.error, "Invalid JSON body.");
  }
});

test("rejects non-object bodies and invalid email values", async () => {
  const bodies = [
    null, [], "owner@example.com", 1, true, {},
    { billingEmail: null },
    { billingEmail: 123 },
    { billingEmail: true },
    { billingEmail: [] },
    { billingEmail: {} },
    { billingEmail: "" },
    { billingEmail: "   " },
    { billingEmail: "not-an-email" },
    { billingEmail: "a".repeat(255) + "@example.com" },
  ];

  for (const body of bodies) {
    const result = await parseProfessionalBillingRequest(
      request(JSON.stringify(body))
    );
    assert.equal(result.ok, false, JSON.stringify(body));
    assert.equal(result.status, 400);
  }
});

test("does not classify unexpected body-read failures as malformed JSON", async () => {
  const failure = new Error("body stream failed");
  await assert.rejects(
    parseProfessionalBillingRequest({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => { throw failure; },
    }),
    (error) => error === failure
  );
});

test("route wiring places validation after permissions and before side effects", () => {
  const source = fs.readFileSync(
    "app/api/billing/professional/route.ts", "utf8"
  );

  const auth = source.indexOf("supabase.auth.getUser(token)");
  const permission = source.indexOf('hasPermission(profile.role, "billing:manage")');
  const validation = source.indexOf("await parseProfessionalBillingRequest(req)");
  const rejection = source.indexOf("if (!parsed.ok)");
  const email = source.indexOf("const billingEmail = parsed.billingEmail;");
  const signature = source.indexOf("generatePayFastSignature(paymentData, passphrase)");
  const mutation = source.indexOf(".update({");

  assert.ok(auth >= 0 && permission > auth);
  assert.ok(validation > permission && rejection > validation);
  assert.ok(email > rejection && signature > email && mutation > email);
  assert.doesNotMatch(source, /await req\.json\(/);
});

test("checkout stops before success flow when billing email persistence fails", () => {
  const source = fs.readFileSync(
    "app/api/billing/professional/route.ts",
    "utf8"
  );

  const mutation = source.indexOf(
    "const { error: billingUpdateError } = await supabase"
  );
  const failureCheck = source.indexOf("if (billingUpdateError)");
  const safeError = source.indexOf(
    'error: "Failed to update billing details."'
  );
  const audit = source.indexOf(
    'action: "billing.checkout.started"'
  );
  const successReturn = source.indexOf(
    "return NextResponse.json({",
    audit
  );

  assert.ok(mutation >= 0);
  assert.ok(failureCheck > mutation);
  assert.ok(safeError > failureCheck);
  assert.ok(audit > safeError);
  assert.ok(successReturn > audit);
});

test("checkout catch logs internally but returns a fixed safe error", () => {
  const source = fs.readFileSync(
    "app/api/billing/professional/route.ts",
    "utf8"
  );

  const catchBoundary = source.indexOf("catch (err: unknown)");
  const serverLog = source.indexOf(
    'console.error("Professional billing checkout failed:", err)'
  );
  const safeResponse = source.indexOf(
    'error: "Failed to create subscription session."'
  );

  assert.ok(catchBoundary >= 0);
  assert.ok(serverLog > catchBoundary);
  assert.ok(safeResponse > serverLog);
  assert.doesNotMatch(source, /error:\s*err\.message/);
  assert.doesNotMatch(source, /catch\s*\(\s*err\s*:\s*any\s*\)/);
});
