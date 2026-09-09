import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/security/csp-report/route.ts",
  "utf8",
);

const rateLimit = fs.readFileSync(
  "lib/ratelimit.ts",
  "utf8",
);

const config = fs.readFileSync(
  "next.config.ts",
  "utf8",
);

test("CSP report endpoint remains public and supports browser report formats", () => {
  assert.match(
    route,
    /export\s+async\s+function\s+POST/,
  );

  assert.doesNotMatch(
    route,
    /requireOrganization|requireAuth|authorization.*Bearer|SUPABASE_SERVICE_ROLE_KEY/,
  );

  assert.match(
    route,
    /application\/csp-report/,
  );

  assert.match(
    route,
    /application\/reports\+json/,
  );

  assert.match(
    route,
    /application\/json/,
  );
});

test("CSP report endpoint has explicit abuse and payload boundaries", () => {
  assert.match(
    route,
    /MAX_REPORT_BYTES\s*=\s*16_384/,
  );

  assert.match(
    route,
    /cspReportRatelimit\.limit/,
  );

  assert.match(
    route,
    /x-forwarded-for/,
  );

  assert.match(
    route,
    /x-real-ip/,
  );

  assert.match(
    route,
    /status:\s*413/,
  );

  assert.match(
    route,
    /status:\s*429/,
  );

  assert.match(
    route,
    /status:\s*400/,
  );

  assert.match(
    route,
    /status:\s*204/,
  );
});

test("CSP reports are normalized before Sentry capture", () => {
  assert.match(
    route,
    /normalizeLegacyReport/,
  );

  assert.match(
    route,
    /normalizeReportingApiBody/,
  );

  assert.match(
    route,
    /normalizeReports/,
  );

  assert.match(
    route,
    /Sentry\.captureMessage/,
  );

  assert.match(
    route,
    /domain:\s*"security"/,
  );

  assert.match(
    route,
    /operation:\s*"csp-report"/,
  );
});

test("CSP report endpoint does not persist raw browser reports", () => {
  assert.doesNotMatch(
    route,
    /\.from\(/,
  );

  assert.doesNotMatch(
    route,
    /supabase/i,
  );

  assert.doesNotMatch(
    route,
    /cookie/i,
  );

  assert.doesNotMatch(
    route,
    /headers\.get\(\s*["']authorization["']\s*\)/,
  );
});

test("dedicated CSP report limiter exists", () => {
  assert.match(
    rateLimit,
    /export\s+const\s+cspReportRatelimit\s*=\s*new\s+Ratelimit/,
  );

  assert.match(
    rateLimit,
    /Ratelimit\.slidingWindow\(30,\s*["']60 s["']\)/,
  );

  assert.match(
    rateLimit,
    /prefix:\s*["']ratelimit:csp-report["']/,
  );
});

test("Report-Only CSP sends reports to the dedicated endpoint", () => {
  assert.match(
    config,
    /Content-Security-Policy-Report-Only/,
  );

  assert.match(
    config,
    /report-uri\s+\/api\/security\/csp-report/,
  );

  assert.doesNotMatch(
    config,
    /key:\s*["']Content-Security-Policy["']/,
  );
});

test("existing baseline security headers remain configured", () => {
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(
      config.includes(header),
      `missing ${header}`,
    );
  }
});