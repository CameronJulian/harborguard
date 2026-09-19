import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getOrganizationSubscription(organizationId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select(`
      subscription_status,
      plan,
      trial_ends_at,
      payfast_subscription_id,
      next_billing_date,
      cancelled_at
    `)
    .eq("id", organizationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export { canAccessPremiumFeatures } from "@/lib/subscription-access";
