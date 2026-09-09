import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const limiter =
  fs.readFileSync(
    new URL("../lib/ratelimit.ts", import.meta.url),
    "utf8"
  );

const route =
  fs.readFileSync(
    new URL(
      "../app/api/route-safety/predict/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "Route Safety Predict owns a dedicated limiter",
  () => {
    assert.match(
      limiter,
      /export\s+const\s+routeSafetyPredictRatelimit\s*=\s*new\s+Ratelimit/
    );
  }
);

test(
  "Route Safety Predict uses 10 requests per 10 seconds",
  () => {
    const start =
      limiter.indexOf(
        "export const routeSafetyPredictRatelimit"
      );

    assert.ok(start >= 0);

    const section =
      limiter.slice(start, start + 300);

    assert.match(
      section,
      /Ratelimit\.slidingWindow\(\s*10\s*,\s*"10 s"\s*\)/
    );
  }
);

test(
  "predict route imports its dedicated limiter",
  () => {
    assert.match(
      route,
      /import\s+\{[\s\S]*?\brouteSafetyPredictRatelimit\b[\s\S]*?\}\s+from\s+"@\/lib\/ratelimit"/
    );
  }
);

test(
  "authentication remains before rate limiting",
  () => {
    const auth =
      route.indexOf(
        "await requireOrganization()"
      );

    const limit =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    assert.ok(auth >= 0);
    assert.ok(limit > auth);
  }
);

test(
  "rate limiting occurs before request body parsing",
  () => {
    const limit =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    const body =
      route.indexOf(
        "await req.json()"
      );

    assert.ok(limit >= 0);
    assert.ok(body > limit);
  }
);

test(
  "rate limiting occurs before weather work",
  () => {
    const limit =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    const weather =
      route.indexOf(
        "await loadWeather("
      );

    assert.ok(limit >= 0);
    assert.ok(weather > limit);
  }
);

test(
  "rate limiting occurs before DB fan-out",
  () => {
    const limit =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    const database =
      route.indexOf(
        '.from("route_safety_alerts")'
      );

    assert.ok(limit >= 0);
    assert.ok(database > limit);
  }
);

test(
  "rate limiting occurs before Google Routes",
  () => {
    const limit =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    const google =
      route.indexOf(
        "https://routes.googleapis.com/"
      );

    assert.ok(limit >= 0);
    assert.ok(google > limit);
  }
);

test(
  "limiter key contains organization user and IP",
  () => {
    assert.match(
      route,
      /route-safety-predict:\$\{organizationId\}:\$\{user\.id\}:\$\{ip\}/
    );
  }
);

test(
  "predict returns 429 when limited",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!rate\.success\s*\)/
    );

    assert.match(
      route,
      /Too many route safety prediction requests/
    );

    assert.match(
      route,
      /status:\s*429/
    );
  }
);

test(
  "Fleet Live policy remains unchanged",
  () => {
    const start =
      limiter.indexOf(
        "export const fleetLiveRatelimit"
      );

    assert.ok(start >= 0);

    const section =
      limiter.slice(start, start + 300);

    assert.match(
      section,
      /Ratelimit\.slidingWindow\(\s*120\s*,\s*"10 s"\s*\)/
    );
  }
);

test(
  "local Predict limiter preserves 10 per 10 second policy",
  () => {
    assert.match(
      limiter,
      /class\s+LocalRouteSafetyPredictRatelimit/
    );

    assert.match(
      limiter,
      /maxRequests\s*=\s*10/
    );

    assert.match(
      limiter,
      /windowMs\s*=\s*10_000/
    );
  }
);

test(
  "local Predict mode requires explicit load-test flag",
  () => {
    const start =
      limiter.indexOf(
        "shouldUseLocalRouteSafetyPredictRatelimit"
      );

    assert.ok(start >= 0);

    const section =
      limiter.slice(start, start + 1400);

    assert.match(
      section,
      /HARBORGUARD_LOCAL_LOAD_TEST/
    );
  }
);

test(
  "local Predict mode cannot run in production",
  () => {
    const start =
      limiter.indexOf(
        "shouldUseLocalRouteSafetyPredictRatelimit"
      );

    assert.ok(start >= 0);

    const section =
      limiter.slice(start, start + 1400);

    assert.match(
      section,
      /NODE_ENV\s*===\s*"production"/
    );
  }
);

test(
  "local Predict mode requires localhost Supabase",
  () => {
    const start =
      limiter.indexOf(
        "shouldUseLocalRouteSafetyPredictRatelimit"
      );

    assert.ok(start >= 0);

    const section =
      limiter.slice(start, start + 1600);

    assert.match(
      section,
      /NEXT_PUBLIC_SUPABASE_URL/
    );

    assert.match(
      section,
      /127\.0\.0\.1/
    );

    assert.match(
      section,
      /localhost/
    );
  }
);

test(
  "Predict selects local or production limiter before body parsing",
  () => {
    const auth =
      route.indexOf(
        "await requireOrganization()"
      );

    const selector =
      route.indexOf(
        "shouldUseLocalRouteSafetyPredictRatelimit()"
      );

    const local =
      route.indexOf(
        "await localRouteSafetyPredictRatelimit.limit"
      );

    const production =
      route.indexOf(
        "await routeSafetyPredictRatelimit.limit"
      );

    const body =
      route.indexOf(
        "await req.json()"
      );

    assert.ok(auth >= 0);
    assert.ok(selector > auth);
    assert.ok(local > selector);
    assert.ok(production > selector);
    assert.ok(body > local);
    assert.ok(body > production);
  }
);
