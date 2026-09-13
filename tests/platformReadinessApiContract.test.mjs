import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath =
  path.resolve(
    "app/api/readiness/route.ts"
  );

const route =
  fs.readFileSync(
    routePath,
    "utf8"
  );

test(
  "platform readiness route is a public GET endpoint",
  () => {
    assert.match(
      route,
      /export\s+async\s+function\s+GET\s*\(/
    );

    assert.doesNotMatch(
      route,
      /requireOrganization\s*\(/
    );

    assert.doesNotMatch(
      route,
      /requireRole\s*\(/
    );

    assert.doesNotMatch(
      route,
      /auth\.getUser|auth\.getSession/
    );
  }
);

test(
  "platform readiness uses the server Supabase client",
  () => {
    assert.match(
      route,
      /import\s*\{\s*supabaseAdmin\s*\}\s*from\s*["']@\/lib\/supabase-admin["']/
    );

    assert.match(
      route,
      /supabaseAdmin\s*\.\s*from\s*\(\s*["']organizations["']\s*\)/
    );
  }
);

test(
  "platform readiness database probe is read-only",
  () => {
    assert.match(
      route,
      /\.select\s*\(/
    );

    assert.doesNotMatch(
      route,
      /\.(insert|update|upsert|delete)\s*\(/
    );

    assert.doesNotMatch(
      route,
      /\.rpc\s*\(/
    );
  }
);

test(
  "platform readiness returns 200 when ready and 503 when not ready",
  () => {
    assert.match(
      route,
      /status\s*:\s*["']ready["']/
    );

    assert.match(
      route,
      /status\s*:\s*["']not_ready["']/
    );

    assert.match(
      route,
      /status\s*:\s*200/
    );

    assert.match(
      route,
      /status\s*:\s*503/
    );
  }
);

test(
  "platform readiness exposes only minimal generic status",
  () => {
    assert.match(
      route,
      /checkedAt/
    );

    assert.doesNotMatch(
      route,
      /organizationId/
    );

    assert.doesNotMatch(
      route,
      /SUPABASE_SERVICE_ROLE_KEY/
    );

    assert.doesNotMatch(
      route,
      /NEXT_PUBLIC_SUPABASE_URL/
    );

    assert.doesNotMatch(
      route,
      /error:\s*error/
    );

    assert.doesNotMatch(
      route,
      /error\.message/
    );
  }
);

test(
  "platform readiness does not probe optional providers",
  () => {
    for (
      const provider of [
        "tomtom",
        "here",
        "traccar",
        "samsara",
        "twilio",
        "resend",
        "upstash",
        "redis",
        "openai",
        "ollama",
      ]
    ) {
      assert.doesNotMatch(
        route,
        new RegExp(
          provider,
          "i"
        )
      );
    }
  }
);

test(
  "platform readiness disables caching",
  () => {
    assert.match(
      route,
      /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/
    );

    assert.match(
      route,
      /Cache-Control/
    );

    assert.match(
      route,
      /no-store/
    );
  }
);

test(
  "platform readiness reports unexpected server exceptions with low-sensitivity context",
  () => {
    assert.match(
      route,
      /reportServerError\s*\(\s*error\s*,\s*\{[\s\S]*?domain:\s*["']platform["'][\s\S]*?operation:\s*["']readiness["'][\s\S]*?boundary:\s*["']top-level["'][\s\S]*?\}\s*\)/
    );

    assert.doesNotMatch(
      route,
      /reportServerError\s*\(\s*["']\[platform readiness\]["']/
    );
  }
);
