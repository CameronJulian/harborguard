import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/traffic-flow/cron/route.ts";

const source =
  fs.readFileSync(routePath, "utf8");

function extractErrorMessageHelper() {
  const start =
    source.indexOf(
      "function errorMessage(error: unknown): string {"
    );

  assert.notEqual(
    start,
    -1,
    "Traffic Flow errorMessage helper must exist."
  );

  const marker =
    "\n}\n\nexport async function";

  const end =
    source.indexOf(marker, start);

  assert.notEqual(
    end,
    -1,
    "Traffic Flow errorMessage helper boundary must remain identifiable."
  );

  return source.slice(
    start,
    end + 2
  );
}

test(
  "Traffic Flow error normalizer does not serialize arbitrary objects",
  () => {
    const helper =
      extractErrorMessageHelper();

    assert.doesNotMatch(
      helper,
      /JSON\.stringify\s*\(\s*error\s*\)/,
      "Arbitrary structured errors must not be JSON serialized."
    );

    assert.match(
      helper,
      /error\s+instanceof\s+Error/,
      "Native Error messages must remain supported."
    );

    assert.match(
      helper,
      /typeof\s+error\s+===\s+"string"/,
      "Explicit string errors must remain supported."
    );

    assert.match(
      helper,
      /Traffic-flow collection failed\./,
      "Unknown values must use the generic Traffic Flow fallback."
    );
  }
);

test(
  "Traffic Flow normalizer does not read structured error metadata",
  () => {
    const helper =
      extractErrorMessageHelper();

    assert.doesNotMatch(
      helper,
      /error\.(details|hint|code|headers|request|response|config|data)/,
      "Structured error metadata must not be copied into error messages."
    );
  }
);