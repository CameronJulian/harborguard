import {
  getOrganizationSubscription,
  canAccessPremiumFeatures,
} from "@/lib/subscription";

export async function requirePremiumAccess(
  organizationId: string
) {
  const subscription =
    await getOrganizationSubscription(
      organizationId
    );

  const allowed =
    canAccessPremiumFeatures(
      subscription?.subscription_status,
      subscription?.trial_ends_at
    );

  return {
    allowed,
    subscription,
  };
}