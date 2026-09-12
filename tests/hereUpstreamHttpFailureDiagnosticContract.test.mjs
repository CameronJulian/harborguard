import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

test(
  "HERE upstream HTTP failures preserve status diagnostics",
  () => {
    assert.match(
      source,
      /\[HERE provider upstream failure\]/
    );

    assert.match(
      source,
      /httpStatus:\s*response\.status/
    );

    assert.match(
      source,
      /statusText:\s*response\.statusText/
    );

    assert.match(
      source,
      /stage:\s*"fetch"/
    );

    assert.match(
      source,
      /HERE Traffic request failed with HTTP \$\{response\.status\}/
    );
  }
);

test(
  "HERE still rejects non-success upstream HTTP responses",
  () => {
    assert.match(
      source,
      /if\s*\(!response\.ok\)/
    );

    assert.match(
      source,
      /throw new Error/
    );
  }
);
