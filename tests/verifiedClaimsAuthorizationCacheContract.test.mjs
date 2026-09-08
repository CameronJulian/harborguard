import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/server-auth.ts",
    "utf8"
  );

const verifiedStart =
  source.indexOf(
    "export async function requireOrganizationVerifiedClaims()"
  );

const verifiedEnd =
  source.indexOf(
    "export function requireRole(",
    verifiedStart
  );

const verifiedHelper =
  source.slice(
    verifiedStart,
    verifiedEnd
  );

const legacyStart =
  source.indexOf(
    "export async function requireOrganization()"
  );

const legacyHelper =
  source.slice(
    legacyStart,
    verifiedStart
  );

test(
  "verified claims authorization cache is short and bounded",
  () => {
    assert.match(
      source,
      /VERIFIED_CLAIMS_AUTHORIZATION_CACHE_TTL_MS\s*=\s*2_000/
    );

    assert.match(
      source,
      /VERIFIED_CLAIMS_AUTHORIZATION_CACHE_MAX_ENTRIES\s*=\s*1_000/
    );

    assert.match(
      source,
      /new Map<string,\s*VerifiedClaimsAuthorizationState>/
    );
  }
);

test(
  "verified JWT validation still runs on every request",
  () => {
    assert.match(
      verifiedHelper,
      /supabase\.auth\.getClaims\(accessToken\)/
    );

    assert.match(
      verifiedHelper,
      /claimsData\?\.claims\?\.sub/
    );
  }
);

test(
  "verified helper loads authorization state through cache loader",
  () => {
    assert.match(
      verifiedHelper,
      /loadVerifiedClaimsAuthorizationState\(\s*supabase,\s*userId\s*\)/
    );

    assert.doesNotMatch(
      verifiedHelper,
      /\.from\("profiles"\)/
    );
  }
);

test(
  "authorization cache loader retains the exact profile organization query",
  () => {
    assert.match(
      source,
      /async function loadVerifiedClaimsAuthorizationState/
    );

    assert.match(
      source,
      /\.from\("profiles"\)/
    );

    assert.match(
      source,
      /organization:organizations/
    );

    assert.match(
      source,
      /subscription_status/
    );

    assert.match(
      source,
      /trial_ends_at/
    );
  }
);

test(
  "authorization misses are coalesced per verified user",
  () => {
    assert.match(
      source,
      /verifiedClaimsAuthorizationLoads/
    );

    assert.match(
      source,
      /const existingLoad\s*=\s*verifiedClaimsAuthorizationLoads\.get/
    );

    assert.match(
      source,
      /verifiedClaimsAuthorizationLoads\.set/
    );

    assert.match(
      source,
      /verifiedClaimsAuthorizationLoads\.delete/
    );
  }
);

test(
  "subscription validity remains evaluated by verified helper",
  () => {
    assert.match(
      verifiedHelper,
      /subscriptionStatus === "trialing"/
    );

    assert.match(
      verifiedHelper,
      /new Date\(trialEndsAt\)\.getTime\(\) > Date\.now\(\)/
    );

    assert.match(
      verifiedHelper,
      /subscriptionStatus !== "active"/
    );
  }
);

test(
  "legacy requireOrganization remains database-backed",
  () => {
    assert.match(
      legacyHelper,
      /supabase\.auth\.getUser\(accessToken\)/
    );

    assert.match(
      legacyHelper,
      /\.from\("profiles"\)/
    );
  }
);