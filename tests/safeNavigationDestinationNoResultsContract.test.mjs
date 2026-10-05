import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation exposes a customer-visible no-results destination search state",
  () => {
    assert.match(
      page,
      /if\s*\(nextResults\.length\s*===\s*0\)\s*\{[\s\S]{0,300}?setRoutingMessage\(\s*"No matching destinations found\."\s*\);/,
    );

    assert.match(
      page,
      /role="status"[\s\S]{0,300}?aria-live="polite"[\s\S]{0,300}?\{routingMessage\}/,
    );
  },
);