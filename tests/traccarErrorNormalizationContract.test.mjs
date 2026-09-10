import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/telematics/cron/traccar/route.ts";

const source =
  fs.readFileSync(routePath, "utf8");

test(
  "Traccar cron does not JSON serialize arbitrary error objects",
  () => {
    assert.doesNotMatch(
      source,
      /JSON\.stringify\s*\(\s*error\s*\)/,
      "Traccar cron must not serialize arbitrary error objects."
    );
  }
);

test(
  "Traccar cron preserves native Error messages",
  () => {
    const matches =
      source.match(
        /error\s+instanceof\s+Error/g
      ) ?? [];

    assert.ok(
      matches.length >= 2,
      "Both Traccar failure boundaries must preserve native Error messages."
    );
  }
);

test(
  "Traccar cron preserves explicit string errors",
  () => {
    const matches =
      source.match(
        /typeof\s+error\s+===\s+"string"/g
      ) ?? [];

    assert.equal(
      matches.length,
      2,
      "Both Traccar failure boundaries must explicitly support string errors."
    );
  }
);

test(
  "Traccar cron uses a generic fallback for unknown error values",
  () => {
    const matches =
      source.match(
        /"Traccar position sync failed\."/g
      ) ?? [];

    assert.ok(
      matches.length >= 2,
      "Unknown Traccar error values must use the generic fallback."
    );
  }
);

test(
  "Traccar cron normalization does not read structured error metadata",
  () => {
    assert.doesNotMatch(
      source,
      /error\.(details|hint|code|headers|request|response|config|data)/,
      "Structured error metadata must not be copied into Traccar error messages."
    );
  }
);