import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(
  new URL(
    "../lib/server/reportServerError.ts",
    import.meta.url
  ),
  "utf8"
);

const panicRoute = fs.readFileSync(
  new URL(
    "../app/api/fleet/panic/route.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "shared server reporter captures exceptions through Sentry",
  () => {
    assert.match(
      helper,
      /import\s+\*\s+as\s+Sentry\s+from\s+["']@sentry\/nextjs["']/
    );

    assert.match(
      helper,
      /Sentry\.captureException\s*\(/
    );
  }
);

test(
  "shared reporter uses domain operation and boundary tags",
  () => {
    assert.match(
      helper,
      /domain:\s*context\.domain/
    );

    assert.match(
      helper,
      /operation:\s*context\.operation/
    );

    assert.match(
      helper,
      /boundary:\s*context\.boundary/
    );
  }
);

test(
  "shared reporter does not read request or environment secrets",
  () => {
    assert.doesNotMatch(
      helper,
      /request\.headers/
    );

    assert.doesNotMatch(
      helper,
      /process\.env/
    );

    assert.doesNotMatch(
      helper,
      /get\(["']authorization/
    );

    assert.doesNotMatch(
      helper,
      /cookies\s*\(/
    );

    assert.doesNotMatch(
      helper,
      /headers\s*\(/
    );
  }
);

test(
  "panic route imports shared server reporter",
  () => {
    assert.match(
      panicRoute,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "panic outer request failure is reported",
  () => {
    assert.match(
      panicRoute,
      /catch\s*\(\s*err:\s*unknown\s*\)[\s\S]*?reportServerError\s*\(\s*err/
    );

    assert.match(
      panicRoute,
      /boundary:\s*["']outer-request["']/
    );
  }
);

test(
  "panic push-notification failure is reported",
  () => {
    assert.match(
      panicRoute,
      /catch\s*\(\s*pushError\s*\)[\s\S]*?reportServerError\s*\(\s*pushError/
    );

    assert.match(
      panicRoute,
      /boundary:\s*["']push-notification["']/
    );
  }
);

test(
  "unexpected panic push-send failure is reported",
  () => {
    assert.match(
      panicRoute,
      /else\s*\{[\s\S]*?reportServerError\s*\(\s*pushSendError/
    );

    assert.match(
      panicRoute,
      /boundary:\s*["']push-send["']/
    );
  }
);

test(
  "404 and 410 push subscriptions remain lifecycle outcomes",
  () => {
    assert.match(
      panicRoute,
      /statusCode\s*===\s*404/
    );

    assert.match(
      panicRoute,
      /statusCode\s*===\s*410/
    );

    assert.match(
      panicRoute,
      /is_active:\s*false/
    );
  }
);

test(
  "panic route contains exactly three server reporter calls",
  () => {
    const calls =
      panicRoute.match(
        /reportServerError\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      3
    );
  }
);