import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "lib/server/reportServerError.ts",
  "utf8"
);

test("preserves native Error instances", () => {
  assert.match(
    source,
    /error instanceof Error/
  );
});

test("preserves string errors", () => {
  assert.match(
    source,
    /typeof error === "string"[\s\S]*?new Error\(error\)/
  );
});

test("preserves a non-empty structured message", () => {
  assert.match(
    source,
    /typeof error === "object"/
  );

  assert.match(
    source,
    /error !== null/
  );

  assert.match(
    source,
    /"message" in error/
  );

  assert.match(
    source,
    /typeof error\.message === "string"/
  );

  assert.match(
    source,
    /error\.message\.trim\(\)/
  );

  assert.match(
    source,
    /new Error\(structuredMessage\)/
  );
});

test("keeps Unknown server error fallback", () => {
  assert.match(
    source,
    /new Error\("Unknown server error"\)/
  );
});

test("does not serialize arbitrary objects", () => {
  assert.doesNotMatch(
    source,
    /JSON\.stringify/
  );
});

test("does not capture structured details, hint or code", () => {
  assert.doesNotMatch(
    source,
    /error\.details/
  );

  assert.doesNotMatch(
    source,
    /error\.hint/
  );

  assert.doesNotMatch(
    source,
    /error\.code/
  );
});