import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getOrganizationSubscription(
  organizationId: string
) {
  const { data } = await supabase
    .from("organizations")
    .select(`
      subscription_status,
      subscription_plan,
      trial_ends_at,
      payfast_subscription_id
    `)
    .eq("id", organizationId)
    .single();

  return data;
}

export function canAccessPremiumFeatures(
  status?: string | null,
  trialEndsAt?: string | null
) {
  if (status === "active") return true;

  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt) > new Date();
  }

  return false;
}