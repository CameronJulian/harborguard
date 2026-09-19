export function canAccessPremiumFeatures(
  status?: string | null,
  trialEndsAt?: string | null,
  nextBillingDate?: string | null,
) {
  if (status === "active") return true;

  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt).getTime() > Date.now();
  }

  if (status === "cancelled" && nextBillingDate) {
    const periodEnd =
      new Date(nextBillingDate).getTime();

    return (
      Number.isFinite(periodEnd) &&
      periodEnd > Date.now()
    );
  }

  return false;
}
