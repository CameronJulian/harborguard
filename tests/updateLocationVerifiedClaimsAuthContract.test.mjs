import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const serverAuth =
  fs.readFileSync(
    "lib/server-auth.ts",
    "utf8"
  );

const route =
  fs.readFileSync(
    "app/api/fleet/update-location/route.ts",
    "utf8"
  );

test(
  "shared requireOrganization retains server getUser validation",
  () => {
    const sharedStart =
      serverAuth.indexOf(
        "export async function requireOrganization()"
      );

    const fastStart =
      serverAuth.indexOf(
        "export async function requireOrganizationVerifiedClaims()"
      );

    assert.ok(
      sharedStart >= 0
    );

    assert.ok(
      fastStart > sharedStart
    );

    const sharedSource =
      serverAuth.slice(
        sharedStart,
        fastStart
      );

    assert.match(
      sharedSource,
      /supabase\.auth\.getUser\(accessToken\)/
    );

    assert.doesNotMatch(
      sharedSource,
      /supabase\.auth\.getClaims\(accessToken\)/
    );
  }
);

test(
  "dedicated hot-path helper uses verified JWT claims",
  () => {
    const fastStart =
      serverAuth.indexOf(
        "export async function requireOrganizationVerifiedClaims()"
      );

    const roleStart =
      serverAuth.indexOf(
        "export function requireRole("
      );

    assert.ok(
      fastStart >= 0
    );

    assert.ok(
      roleStart > fastStart
    );

    const fastSource =
      serverAuth.slice(
        fastStart,
        roleStart
      );

    assert.match(
      fastSource,
      /supabase\.auth\.getClaims\(accessToken\)/
    );

    assert.match(
      fastSource,
      /claimsData\?\.claims\?\.sub/
    );

    assert.doesNotMatch(
      fastSource,
      /supabase\.auth\.getUser\(accessToken\)/
    );

    assert.match(
      fastSource,
      /loadVerifiedClaimsAuthorizationState\(\s*supabase,\s*userId\s*\)/
    );

    const loaderStart =
      serverAuth.indexOf(
        "async function loadVerifiedClaimsAuthorizationState("
      );

    assert.ok(
      loaderStart >= 0
    );

    const loaderSource =
      serverAuth.slice(
        loaderStart,
        fastStart
      );

    assert.match(
      loaderSource,
      /\.from\("profiles"\)/
    );

    assert.match(
      loaderSource,
      /\.eq\("id", userId\)/
    );

    assert.match(
      loaderSource,
      /organization:organizations/
    );

    assert.match(
      fastSource,
      /subscriptionStatus !== "active"/
    );
  }
);

test(
  "update-location uses only the dedicated verified-claims helper",
  () => {
    assert.match(
      route,
      /import\s*\{\s*requireOrganizationVerifiedClaims\s*\}\s*from\s*"@\/lib\/server-auth"/
    );

    assert.match(
      route,
      /await\s+requireOrganizationVerifiedClaims\s*\(\s*\)/
    );

    assert.doesNotMatch(
      route,
      /await\s+requireOrganization\s*\(\s*\)/
    );

    assert.doesNotMatch(
      route,
      /userId\s*:\s*user\.id/
    );

    assert.match(
      route,
      /userId\s*,/
    );
  }
);