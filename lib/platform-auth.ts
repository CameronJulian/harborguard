import "server-only";

import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const PLATFORM_ROLES = new Set([
  "platform_admin",
  "super_admin",
]);

export async function requirePlatformAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const authorization = headerStore.get("authorization");

  const bearerToken =
    authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

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
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    throw new Error("Forbidden");
  }

  if (!PLATFORM_ROLES.has(String(profile.role || ""))) {
    throw new Error("Forbidden");
  }

  return {
    user,
    userId: user.id,
    role: profile.role as "platform_admin" | "super_admin",
    organizationId: profile.organization_id,
  };
}