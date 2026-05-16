export type HarborGuardPlan =
  | "starter"
  | "professional"
  | "enterprise";

export const PLAN_FEATURES = {
  starter: {
    maxVehicles: 5,
    aiCopilot: false,
    routeReplay: false,
    pushAlerts: false,
    executiveReports: false,
  },

  professional: {
    maxVehicles: 50,
    aiCopilot: true,
    routeReplay: true,
    pushAlerts: true,
    executiveReports: true,
  },

  enterprise: {
    maxVehicles: Infinity,
    aiCopilot: true,
    routeReplay: true,
    pushAlerts: true,
    executiveReports: true,
  },
};

export function getPlanFeatures(plan?: string | null) {
  if (plan === "enterprise") return PLAN_FEATURES.enterprise;
  if (plan === "professional") return PLAN_FEATURES.professional;
  return PLAN_FEATURES.starter;
}

export function isTrialActive(trialEndsAt?: string | null) {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

export function hasActiveBillingStatus(status?: string | null) {
  return (
    status === "active" ||
    status === "trialing"
  );
}