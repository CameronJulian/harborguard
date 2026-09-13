import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(
  new URL(
    "../lib/web-push.ts",
    import.meta.url,
  ),
  "utf8",
);

const routes = [
  "../app/api/push/send/route.ts",
  "../app/api/fleet/panic/route.ts",
  "../app/api/route-safety/escalate/route.ts",
].map((path) =>
  fs.readFileSync(
    new URL(path, import.meta.url),
    "utf8",
  ),
);

test(
  "web push VAPID configuration is lazy and centralized",
  () => {
    assert.match(
      helper,
      /function\s+ensureWebPushConfigured\s*\(/,
    );

    assert.match(
      helper,
      /webpush\.setVapidDetails\s*\(/,
    );

    assert.match(
      helper,
      /process\.env\.VAPID_SUBJECT/,
    );

    assert.match(
      helper,
      /process\.env\.NEXT_PUBLIC_VAPID_PUBLIC_KEY/,
    );

    assert.match(
      helper,
      /process\.env\.VAPID_PRIVATE_KEY/,
    );
  },
);

test(
  "shared helper rejects missing or placeholder VAPID configuration",
  () => {
    assert.match(
      helper,
      /VAPID public\/private key is missing/,
    );

    assert.match(
      helper,
      /contains a placeholder value/,
    );

    assert.match(
      helper,
      /mailto:/,
    );

    assert.match(
      helper,
      /https:\/\//,
    );
  },
);

test(
  "affected push routes do not configure VAPID at module scope",
  () => {
    for (const route of routes) {
      assert.doesNotMatch(
        route,
        /setVapidDetails\s*\(/,
      );

      assert.doesNotMatch(
        route,
        /import\s+webpush\s+from\s+["']web-push["']/,
      );

      assert.match(
        route,
        /sendWebPushNotification/,
      );

      assert.match(
        route,
        /from\s+["']@\/lib\/web-push["']/,
      );
    }
  },
);

test(
  "shared helper is the only web-push import boundary",
  () => {
    assert.match(
      helper,
      /import\s+webpush\s+from\s+["']web-push["']/,
    );

    assert.match(
      helper,
      /return\s+webpush\.sendNotification\s*\(/,
    );
  },
);
