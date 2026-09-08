import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function requireOrganization() {
  const cookieStore = await cookies();

  const headerStore = await headers();

  const bearerToken = headerStore
    .get("authorization")
    ?.replace("Bearer ", "")
    .trim();

  const accessToken =
    bearerToken || cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(`
  id,
  full_name,
  role,
  organization_id,
  organization:organizations (
    id,
    name,
    plan,
    subscription_status,
    trial_ends_at
  )
`)
      .eq("id", user.id)
      .single();

  if (profileError || !profile?.organization_id) {
    throw new Error("Organization not found.");
  }

  const organization = Array.isArray(profile.organization)
    ? profile.organization[0] || null
    : profile.organization || null;

  const subscriptionStatus = organization?.subscription_status;
  const trialEndsAt = organization?.trial_ends_at;

  const trialIsActive =
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() > Date.now();

  if (subscriptionStatus !== "active" && !trialIsActive) {
    throw new Error("Subscription inactive");
  }

  return {
    supabase,
    user,
    profile,
    organizationId: profile.organization_id,
    organization: Array.isArray(profile.organization)
      ? profile.organization[0] || null
      : profile.organization || null,
    role: profile.role || "viewer",
  };
}



const VERIFIED_CLAIMS_AUTHORIZATION_CACHE_TTL_MS =
  2_000;

const VERIFIED_CLAIMS_AUTHORIZATION_CACHE_MAX_ENTRIES =
  1_000;

type VerifiedClaimsAuthorizationState = {
  profile: any;
  expiresAt: number;
};

const verifiedClaimsAuthorizationCache =
  new Map<string, VerifiedClaimsAuthorizationState>();

const verifiedClaimsAuthorizationLoads =
  new Map<string, Promise<any>>();

function pruneVerifiedClaimsAuthorizationCache(
  now: number
) {
  for (
    const [
      key,
      entry,
    ] of verifiedClaimsAuthorizationCache
  ) {
    if (entry.expiresAt <= now) {
      verifiedClaimsAuthorizationCache.delete(key);
    }
  }

  while (
    verifiedClaimsAuthorizationCache.size >
    VERIFIED_CLAIMS_AUTHORIZATION_CACHE_MAX_ENTRIES
  ) {
    const oldestKey =
      verifiedClaimsAuthorizationCache
        .keys()
        .next()
        .value;

    if (!oldestKey) {
      break;
    }

    verifiedClaimsAuthorizationCache.delete(
      oldestKey
    );
  }
}

function getCachedVerifiedClaimsAuthorizationState(
  userId: string
) {
  const now =
    Date.now();

  const cached =
    verifiedClaimsAuthorizationCache.get(
      userId
    );

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now) {
    verifiedClaimsAuthorizationCache.delete(
      userId
    );

    return null;
  }

  /*
   * Refresh insertion order so bounded eviction behaves
   * approximately like a tiny LRU.
   */
  verifiedClaimsAuthorizationCache.delete(
    userId
  );

  verifiedClaimsAuthorizationCache.set(
    userId,
    cached
  );

  return cached.profile;
}

function cacheVerifiedClaimsAuthorizationState(
  userId: string,
  profile: any
) {
  const now =
    Date.now();

  pruneVerifiedClaimsAuthorizationCache(
    now
  );

  verifiedClaimsAuthorizationCache.delete(
    userId
  );

  verifiedClaimsAuthorizationCache.set(
    userId,
    {
      profile,
      expiresAt:
        now +
        VERIFIED_CLAIMS_AUTHORIZATION_CACHE_TTL_MS,
    }
  );

  pruneVerifiedClaimsAuthorizationCache(
    now
  );
}

async function loadVerifiedClaimsAuthorizationState(
  supabase: any,
  userId: string
) {
  const cached =
    getCachedVerifiedClaimsAuthorizationState(
      userId
    );

  if (cached) {
    return cached;
  }

  const existingLoad =
    verifiedClaimsAuthorizationLoads.get(
      userId
    );

  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise =
    (async () => {
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
  id,
  full_name,
  role,
  organization_id,
  organization:organizations (
    id,
    name,
    plan,
    subscription_status,
    trial_ends_at
  )
`)
        .eq("id", userId)
        .single();

      if (
        profileError ||
        !profile?.organization_id
      ) {
        throw new Error(
          "Organization not found."
        );
      }

      cacheVerifiedClaimsAuthorizationState(
        userId,
        profile
      );

      return profile;
    })();

  verifiedClaimsAuthorizationLoads.set(
    userId,
    loadPromise
  );

  try {
    return await loadPromise;
  } finally {
    if (
      verifiedClaimsAuthorizationLoads.get(
        userId
      ) === loadPromise
    ) {
      verifiedClaimsAuthorizationLoads.delete(
        userId
      );
    }
  }
}

export async function requireOrganizationVerifiedClaims() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const bearerToken = headerStore
    .get("authorization")
    ?.replace("Bearer ", "")
    .trim();

  const accessToken =
    bearerToken || cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims(accessToken);

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Unauthorized");
  }

  const profile =
    await loadVerifiedClaimsAuthorizationState(
      supabase,
      userId
    );

  const organization = Array.isArray(profile.organization)
    ? profile.organization[0] || null
    : profile.organization || null;

  const subscriptionStatus = organization?.subscription_status;
  const trialEndsAt = organization?.trial_ends_at;

  const trialIsActive =
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() > Date.now();

  if (subscriptionStatus !== "active" && !trialIsActive) {
    throw new Error("Subscription inactive");
  }

  return {
    supabase,
    userId,
    organizationId: profile.organization_id,
    role: profile.role || "viewer",
  };
}
export function requireRole(
  role: string | null | undefined,
  allowedRoles: string[]
) {
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }
}






