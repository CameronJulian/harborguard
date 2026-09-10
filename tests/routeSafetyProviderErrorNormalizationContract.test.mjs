import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/route-safety/cron/providers/route.ts";

const source =
  fs.readFileSync(routePath, "utf8");

test(
  "Route Safety provider cron does not JSON serialize arbitrary error objects",
  () => {
    assert.doesNotMatch(
      source,
      /JSON\.stringify\s*\(\s*error\s*\)/,
      "Route Safety provider cron must not serialize arbitrary error objects."
    );
  }
);

test(
  "Route Safety provider cron preserves native Error messages",
  () => {
    assert.match(
      source,
      /error\s+instanceof\s+Error/
    );

    assert.match(
      source,
      /\?\s*error\.message/
    );
  }
);

test(
  "Route Safety provider cron preserves explicit string errors",
  () => {
    assert.match(
      source,
      /typeof\s+error\s+===\s+"string"/
    );

    assert.match(
      source,
      /error\.trim\(\)/
    );
  }
);

test(
  "Route Safety provider cron keeps a generic unknown-value fallback",
  () => {
    assert.match(
      source,
      /"External provider cron failed\."/
    );
  }
);

test(
  "Route Safety provider cron does not read structured error metadata",
  () => {
    assert.doesNotMatch(
      source,
      /error\.(details|hint|code|headers|request|response|config|data)/,
      "Structured error metadata must not be copied into provider cron error messages."
    );
  }
);