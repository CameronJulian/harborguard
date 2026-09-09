import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("next.config.ts", "utf8");

test("global baseline security headers are configured", () => {
  assert.match(
    source,
    /source:\s*["']\/\(\.\*\)["']/,
    "security headers must apply across the application",
  );

  assert.match(
    source,
    /key:\s*["']X-Content-Type-Options["'][\s\S]*?value:\s*["']nosniff["']/,
  );

  assert.match(
    source,
    /key:\s*["']X-Frame-Options["'][\s\S]*?value:\s*["']DENY["']/,
  );

  assert.match(
    source,
    /key:\s*["']Referrer-Policy["'][\s\S]*?value:\s*["']strict-origin-when-cross-origin["']/,
  );

  assert.match(
    source,
    /key:\s*["']Permissions-Policy["']/,
  );

  assert.match(source, /camera=\(\)/);
  assert.match(source, /microphone=\(\)/);
  assert.match(source, /geolocation=\(self\)/);
  assert.match(source, /payment=\(\)/);
  assert.match(source, /usb=\(\)/);

  assert.match(
    source,
    /key:\s*["']Strict-Transport-Security["'][\s\S]*?max-age=31536000;\s*includeSubDomains/,
  );
});

test("enforced CSP remains absent while Report-Only CSP is allowed", () => {
  assert.doesNotMatch(
    source,
    /key:\s*["']Content-Security-Policy["']/,
    "enforced CSP must remain absent during the Report-Only observation phase",
  );

  assert.match(
    source,
    /key:\s*["']Content-Security-Policy-Report-Only["']/,
    "Report-Only CSP should be present during the observation phase",
  );
});

test("existing Sentry configuration remains wrapped around nextConfig", () => {
  assert.match(
    source,
    /export\s+default\s+withSentryConfig\(nextConfig,/,
  );

  assert.match(
    source,
    /automaticVercelMonitors:\s*true/,
  );
});