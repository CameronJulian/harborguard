import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/panic/route.ts",
      import.meta.url
    ),
    "utf8"
  );

const rateLimit =
  fs.readFileSync(
    new URL(
      "../lib/ratelimit.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "Fleet Panic owns a dedicated remote limiter",
  () => {
    assert.match(
      rateLimit,
      /export const fleetPanicRatelimit = new Ratelimit/
    );

    assert.match(
      rateLimit,
      /fleetPanicRatelimit[\s\S]*?slidingWindow\(10,\s*"60 s"\)/
    );
  }
);

test(
  "Fleet Panic owns an isolated local limiter",
  () => {
    assert.match(
      rateLimit,
      /class LocalFleetPanicRatelimit/
    );

    assert.match(
      rateLimit,
      /private readonly maxRequests = 10/
    );

    assert.match(
      rateLimit,
      /private readonly windowMs = 60_000/
    );

    assert.match(
      rateLimit,
      /export const localFleetPanicRatelimit/
    );

    assert.match(
      rateLimit,
      /export function shouldUseLocalFleetPanicRatelimit/
    );
  }
);

test(
  "Fleet Panic imports its dedicated limiter boundaries",
  () => {
    assert.match(
      route,
      /import\s+\{[\s\S]*fleetPanicRatelimit[\s\S]*localFleetPanicRatelimit[\s\S]*shouldUseLocalFleetPanicRatelimit[\s\S]*\}\s+from\s+"@\/lib\/ratelimit"/
    );
  }
);

test(
  "authentication occurs before Panic idempotency",
  () => {
    const auth =
      route.indexOf(
        "await requireOrganization()"
      );

    const duplicate =
      route.indexOf(
        "existingOpenPanic"
      );

    assert.ok(auth >= 0);
    assert.ok(duplicate > auth);
  }
);

test(
  "existing unresolved Panic bypasses rate-limit consumption",
  () => {
    const duplicate =
      route.indexOf(
        'skipped: "duplicate_open_panic"'
      );

    const limiter =
      route.indexOf(
        "panicRateLimitResult"
      );

    assert.ok(duplicate >= 0);
    assert.ok(limiter > duplicate);
  }
);

test(
  "new Panic creation is limited before database fan-out",
  () => {
    const limiter =
      route.indexOf(
        "panicRateLimitResult"
      );

    const location =
      route.indexOf(
        '.from("vehicle_locations")'
      );

    const insert =
      route.indexOf(
        ".insert({",
        route.indexOf(
          '.from("vehicle_alerts")',
          limiter
        )
      );

    assert.ok(limiter >= 0);
    assert.ok(location > limiter);
    assert.ok(insert > limiter);
  }
);

test(
  "Panic limiter key includes organization user and IP",
  () => {
    assert.match(
      route,
      /`fleet-panic:\$\{organizationId\}:\$\{user\.id\}:\$\{ip\}`/
    );
  }
);

test(
  "Fleet Panic reads standard proxy IP headers",
  () => {
    assert.match(
      route,
      /req\.headers\.get\("x-forwarded-for"\)/
    );

    assert.match(
      route,
      /req\.headers\.get\("x-real-ip"\)/
    );
  }
);

test(
  "Fleet Panic returns 429 only for rejected new creation attempts",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!panicRateLimitResult\.success\s*\)[\s\S]*status:\s*429/
    );

    assert.match(
      route,
      /Too many new panic alert requests/
    );
  }
);

test(
  "existing Panic idempotency remains intact",
  () => {
    assert.match(
      route,
      /existingOpenPanic/
    );

    assert.match(
      route,
      /alertError\.code\s*===\s*"23505"/
    );

    assert.match(
      route,
      /canonicalOpenPanic/
    );
  }
);
