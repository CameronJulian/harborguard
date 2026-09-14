import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cron =
  fs.readFileSync(
    "app/api/reports/cron/route.ts",
    "utf8"
  );

const run =
  fs.readFileSync(
    "app/api/reports/run/route.ts",
    "utf8"
  );

test(
  "reports cron remains an authenticated Vercel GET",
  () => {
    assert.match(
      cron,
      /export async function GET\(req: Request\)/
    );

    assert.match(
      cron,
      /const expectedBearer = `Bearer \$\{process\.env\.CRON_SECRET\}`/
    );

    assert.match(
      cron,
      /authHeader !== expectedBearer/
    );
  }
);

test(
  "manual report run forwards its authenticated organization",
  () => {
    assert.match(
      run,
      /const \{ organizationId, role \} = await requireOrganization\(\)/
    );

    assert.match(
      run,
      /\/api\/reports\/cron\?period=\$\{period\}&organizationId=\$\{organizationId\}/
    );

    assert.match(
      run,
      /Authorization: `Bearer \$\{cronSecret\}`/
    );
  }
);

test(
  "reports cron reads optional organization scope",
  () => {
    assert.match(
      cron,
      /url\.searchParams\.get\("organizationId"\)\?\.trim\(\) \|\| null/
    );
  }
);

test(
  "organization scope resolves through profiles",
  () => {
    assert.match(
      cron,
      /\.from\("profiles"\)[\s\S]*?\.select\("id"\)[\s\S]*?\.eq\("organization_id", organizationId\)/
    );
  }
);

test(
  "scoped cron filters subscriptions by resolved profile ids",
  () => {
    assert.match(
      cron,
      /if \(scopedUserIds !== null\)[\s\S]*?subscriptionsQuery\.in\([\s\S]*?"user_id",[\s\S]*?scopedUserIds[\s\S]*?\)/
    );
  }
);

test(
  "cron never assumes report_subscriptions has organization_id",
  () => {
    const subscriptionQueryStart =
      cron.indexOf(
        '.from("report_subscriptions")'
      );

    assert.notEqual(
      subscriptionQueryStart,
      -1
    );

    const subscriptionWindow =
      cron.slice(
        subscriptionQueryStart,
        subscriptionQueryStart + 900
      );

    assert.doesNotMatch(
      subscriptionWindow,
      /\.eq\(\s*"organization_id"/
    );
  }
);

test(
  "zero matching profiles exits before subscription sends",
  () => {
    const zeroIndex =
      cron.indexOf(
        "scopedUserIds.length === 0"
      );

    const sendIndex =
      cron.indexOf(
        'fetch(`${origin}/api/reports/send`'
      );

    assert.ok(
      zeroIndex >= 0
    );

    assert.ok(
      sendIndex > zeroIndex
    );

    assert.match(
      cron,
      /scopedUserIds\.length === 0[\s\S]*?totalRecipients:\s*0[\s\S]*?results:\s*\[\]/
    );
  }
);

test(
  "unscoped scheduled cron retains global subscription query",
  () => {
    assert.match(
      cron,
      /let subscriptionsQuery = supabase[\s\S]*?\.from\("report_subscriptions"\)[\s\S]*?\.eq\("is_enabled", true\)[\s\S]*?\.eq\("report_frequency", period\)/
    );

    assert.match(
      cron,
      /if \(scopedUserIds !== null\)/
    );
  }
);
