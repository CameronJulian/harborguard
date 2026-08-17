import { createHash } from "crypto";

export const ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION =
  "harborguard-route-risk-shadow-alternative-route-eligibility-v1" as const;

export type RouteRiskShadowAlternativeRouteEligibilityReason =
  | "policy_disabled"
  | "invalid_configuration"
  | "missing_organization"
  | "organization_not_allowed"
  | "missing_sampling_identity"
  | "missing_provider_credential"
  | "sampled_out";

export type RouteRiskShadowAlternativeRouteEligibility = {
  eligibilityVersion:
    typeof ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY";
  authority: "NON_AUTHORITATIVE";
  eligibilityState: "ELIGIBLE" | "INELIGIBLE";
  reason: RouteRiskShadowAlternativeRouteEligibilityReason | null;
};

export type BuildRouteRiskShadowAlternativeRouteEligibilityInput = {
  policy: {
    enabled: unknown;
    allowedOrganizationIds: unknown;
    samplingPercentage: unknown;
  };
  context: {
    organizationId: unknown;
    samplingIdentity: unknown;
    providerCredentialAvailable: unknown;
  };
};

function ineligible(
  reason: RouteRiskShadowAlternativeRouteEligibilityReason
): RouteRiskShadowAlternativeRouteEligibility {
  return {
    eligibilityVersion:
      ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY",
    authority: "NON_AUTHORITATIVE",
    eligibilityState: "INELIGIBLE",
    reason,
  };
}

function eligible(): RouteRiskShadowAlternativeRouteEligibility {
  return {
    eligibilityVersion:
      ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY",
    authority: "NON_AUTHORITATIVE",
    eligibilityState: "ELIGIBLE",
    reason: null,
  };
}

function validPolicy(policy: {
  enabled: unknown;
  allowedOrganizationIds: unknown;
  samplingPercentage: unknown;
}): policy is {
  enabled: boolean;
  allowedOrganizationIds: readonly string[];
  samplingPercentage: number;
} {
  return (
    typeof policy.enabled === "boolean" &&
    Array.isArray(policy.allowedOrganizationIds) &&
    policy.allowedOrganizationIds.every(
      (organizationId): organizationId is string =>
        typeof organizationId === "string" && organizationId.length > 0
    ) &&
    typeof policy.samplingPercentage === "number" &&
    Number.isFinite(policy.samplingPercentage) &&
    policy.samplingPercentage >= 0 &&
    policy.samplingPercentage <= 100
  );
}

function samplingBucket(identity: string): number {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        eligibilityVersion:
          ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION,
        samplingIdentity: identity,
      })
    )
    .digest("hex");

  return (Number.parseInt(digest.slice(0, 8), 16) / 0xffffffff) * 100;
}

/**
 * Evaluates admission for future shadow alternative-route work only.
 * It performs no registration, provider execution, persistence, or scoring.
 */
export function buildRouteRiskShadowAlternativeRouteEligibility({
  policy,
  context,
}: BuildRouteRiskShadowAlternativeRouteEligibilityInput): RouteRiskShadowAlternativeRouteEligibility {
  if (!validPolicy(policy)) {
    return ineligible("invalid_configuration");
  }

  if (!policy.enabled) {
    return ineligible("policy_disabled");
  }

  if (
    typeof context.organizationId !== "string" ||
    context.organizationId.length === 0
  ) {
    return ineligible("missing_organization");
  }

  if (!policy.allowedOrganizationIds.includes(context.organizationId)) {
    return ineligible("organization_not_allowed");
  }

  if (
    typeof context.samplingIdentity !== "string" ||
    context.samplingIdentity.length === 0
  ) {
    return ineligible("missing_sampling_identity");
  }

  if (context.providerCredentialAvailable !== true) {
    return ineligible("missing_provider_credential");
  }

  if (samplingBucket(context.samplingIdentity) >= policy.samplingPercentage) {
    return ineligible("sampled_out");
  }

  return eligible();
}
