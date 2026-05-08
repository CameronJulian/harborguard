import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function requireOrganization() {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get("sb-access-token")?.value;

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
      .select("organization_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profile?.organization_id) {
    throw new Error("Organization not found.");
  }

  return {
    supabase,
    user,
    organizationId: profile.organization_id,
  };
}