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
    subscription_plan,
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

export function requireRole(
  role: string | null | undefined,
  allowedRoles: string[]
) {
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }
}





