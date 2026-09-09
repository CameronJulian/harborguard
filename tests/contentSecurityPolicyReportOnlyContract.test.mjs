import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("next.config.ts", "utf8");

test("CSP is Report-Only, not enforced", () => {
  assert.match(
    source,
    /key:\s*["']Content-Security-Policy-Report-Only["']/,
  );

  assert.doesNotMatch(
    source,
    /key:\s*["']Content-Security-Policy["']/,
    "CSP must remain Report-Only during observation phase",
  );
});

test("Report-Only CSP includes HarborGuard browser requirements", () => {
  const required = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'none'",
  ];

  for (const value of required) {
    assert.ok(
      source.includes(value),
      `missing CSP requirement: ${value}`,
    );
  }
});

test("Supabase HTTPS and realtime websocket origins are represented", () => {
  assert.ok(
    source.includes(
      "https://ubdgpebpxuimrxvrjjet.supabase.co",
    ),
    "Supabase HTTPS origin is missing from connect-src",
  );

  assert.ok(
    source.includes(
      "wss://ubdgpebpxuimrxvrjjet.supabase.co",
    ),
    "Supabase realtime websocket origin is missing from connect-src",
  );
});

test("Sentry browser ingest origin is represented", () => {
  assert.ok(
    source.includes(
      "https://o4511467222204416.ingest.us.sentry.io",
    ),
    "Sentry ingest origin is missing from connect-src",
  );
});

test("OpenStreetMap tile origin is represented", () => {
  assert.ok(
    source.includes(
      "https://*.tile.openstreetmap.org",
    ),
    "OpenStreetMap tile origin is missing from img-src",
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
      source.includes(header),
      `missing ${header}`,
    );
  }
});

test("existing Sentry wrapper remains preserved", () => {
  assert.match(
    source,
    /export\s+default\s+withSentryConfig\(nextConfig,/,
  );

  assert.match(
    source,
    /automaticVercelMonitors:\s*true/,
  );
});