import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  new URL(
    "../app/api/telematics/cron/traccar/route.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "Traccar cron imports shared server reporter",
  () => {
    assert.match(
      route,
      /import\s+\{\s*reportServerError\s*\}\s+from\s+["']@\/lib\/server\/reportServerError["']/
    );
  }
);

test(
  "missing CRON_SECRET is actionably reported",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!cronSecret\s*\)[\s\S]*?reportServerError/
    );

    assert.match(
      route,
      /boundary:\s*["']cron-secret-missing["']/
    );
  }
);

test(
  "missing Supabase service-role configuration is actionably reported",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!supabaseUrl\s*\|\|\s*!serviceRoleKey\s*\)[\s\S]*?reportServerError/
    );

    assert.match(
      route,
      /boundary:\s*["']supabase-service-role-config["']/
    );
  }
);

test(
  "unauthorized cron requests remain expected 401 outcomes",
  () => {
    assert.match(
      route,
      /authorization\s*!==\s*`Bearer \$\{cronSecret\}`[\s\S]*?status:\s*401/
    );
  }
);

test(
  "per-organization failures are reported and remain fault isolated",
  () => {
    assert.match(
      route,
      /boundary:\s*["']organization-sync["']/
    );

    assert.match(
      route,
      /extra:\s*\{[\s\S]*?organizationId/
    );

    assert.match(
      route,
      /organizationResults\.push\s*\(\s*\{[\s\S]*?success:\s*false/
    );
  }
);

test(
  "outer Traccar cron failures are reported",
  () => {
    assert.match(
      route,
      /boundary:\s*["']outer-request["']/
    );

    assert.match(
      route,
      /status:\s*500/
    );
  }
);

test(
  "aggregate organization result semantics remain intact",
  () => {
    assert.match(
      route,
      /success:\s*failed\s*===\s*0/
    );

    assert.match(
      route,
      /organizations:\s*organizationResults/
    );
  }
);

test(
  "Traccar cron contains exactly four reporter calls",
  () => {
    const calls =
      route.match(
        /reportServerError\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      4
    );
  }
);

test(
  "Traccar cron does not report secret values as metadata",
  () => {
    assert.doesNotMatch(
      route,
      /extra:\s*\{[\s\S]*?cronSecret/
    );

    assert.doesNotMatch(
      route,
      /extra:\s*\{[\s\S]*?serviceRoleKey/
    );

    assert.doesNotMatch(
      route,
      /extra:\s*\{[\s\S]*?authorization/
    );
  }
);