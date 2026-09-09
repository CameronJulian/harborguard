import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const limiter =
  fs.readFileSync(
    new URL(
      "../lib/ratelimit.ts",
      import.meta.url
    ),
    "utf8"
  );

const route =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/live/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "local Fleet Live limiter preserves production Upstash limiter",
  () => {
    assert.match(
      limiter,
      /export\s+const\s+fleetLiveRatelimit\s*=\s*new\s+Ratelimit/
    );

    assert.match(
      limiter,
      /Ratelimit\.slidingWindow\(\s*120\s*,\s*"10 s"\s*\)/
    );
  }
);

test(
  "local Fleet Live limiter uses the same 120 per 10 second boundary",
  () => {
    assert.match(
      limiter,
      /maxRequests\s*=\s*120/
    );

    assert.match(
      limiter,
      /windowMs\s*=\s*10_000/
    );
  }
);

test(
  "local mode requires an explicit HarborGuard load-test flag",
  () => {
    assert.match(
      limiter,
      /HARBORGUARD_LOCAL_LOAD_TEST/
    );

    assert.match(
      limiter,
      /!==\s*"true"/
    );
  }
);

test(
  "local mode is impossible in NODE_ENV production",
  () => {
    assert.match(
      limiter,
      /NODE_ENV\s*===\s*"production"/
    );

    const productionGuard =
      limiter.indexOf(
        'process.env.NODE_ENV ==='
      );

    const hostnameGuard =
      limiter.indexOf(
        'hostname ==='
      );

    assert.ok(
      productionGuard >= 0
    );

    assert.ok(
      hostnameGuard >
        productionGuard
    );
  }
);

test(
  "local mode requires a localhost Supabase backend",
  () => {
    assert.match(
      limiter,
      /NEXT_PUBLIC_SUPABASE_URL/
    );

    assert.match(
      limiter,
      /127\.0\.0\.1/
    );

    assert.match(
      limiter,
      /localhost/
    );
  }
);

test(
  "Fleet Live alone can select the local fallback",
  () => {
    assert.match(
      route,
      /shouldUseLocalFleetLiveRatelimit\(\)/
    );

    assert.match(
      route,
      /await\s+localFleetLiveRatelimit\.limit/
    );

    assert.match(
      route,
      /await\s+fleetLiveRatelimit\.limit/
    );
  }
);

test(
  "authentication still happens before either Fleet Live limiter",
  () => {
    const auth =
      route.indexOf(
        "await requireOrganization()"
      );

    const local =
      route.indexOf(
        "await localFleetLiveRatelimit.limit"
      );

    const remote =
      route.indexOf(
        "await fleetLiveRatelimit.limit"
      );

    assert.ok(auth >= 0);
    assert.ok(local > auth);
    assert.ok(remote > auth);
  }
);

test(
  "rate limiting still happens before Fleet database fan-out",
  () => {
    const local =
      route.indexOf(
        "await localFleetLiveRatelimit.limit"
      );

    const remote =
      route.indexOf(
        "await fleetLiveRatelimit.limit"
      );

    const vehicles =
      route.indexOf(
        '.from("vehicles")'
      );

    assert.ok(local >= 0);
    assert.ok(remote >= 0);
    assert.ok(vehicles > local);
    assert.ok(vehicles > remote);
  }
);

test(
  "Fleet Live still returns 429 on unsuccessful limit result",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!rate\.success\s*\)/
    );

    assert.match(
      route,
      /\{\s*status:\s*429\s*\}/
    );
  }
);
