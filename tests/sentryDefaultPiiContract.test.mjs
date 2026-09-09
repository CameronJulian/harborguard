import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "instrumentation-client.ts",
];

test("Sentry default PII capture is disabled everywhere", () => {
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");

    assert.match(
      source,
      /sendDefaultPii\s*:\s*false/,
      `${file} must disable sendDefaultPii`,
    );

    assert.doesNotMatch(
      source,
      /sendDefaultPii\s*:\s*true/,
      `${file} must not enable sendDefaultPii`,
    );
  }
});

test("Sentry initialization remains present", () => {
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");

    assert.match(
      source,
      /Sentry\.init\s*\(/,
      `${file} must preserve Sentry.init`,
    );
  }
});

test("client replay integration remains configured", () => {
  const source = fs.readFileSync(
    "instrumentation-client.ts",
    "utf8",
  );

  assert.match(
    source,
    /Sentry\.replayIntegration\s*\(/,
  );

  assert.match(
    source,
    /replaysSessionSampleRate\s*:\s*0\.1/,
  );

  assert.match(
    source,
    /replaysOnErrorSampleRate\s*:\s*1\.0/,
  );
});

test("server and edge DSN configuration remains present", () => {
  for (const file of [
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
  ]) {
    const source = fs.readFileSync(file, "utf8");

    assert.match(
      source,
      /dsn\s*:\s*"https:\/\//,
    );
  }
});
