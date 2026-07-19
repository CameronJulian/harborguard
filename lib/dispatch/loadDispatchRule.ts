import {
  preferredCapabilitiesForAlert,
  type VehicleCapability,
} from "@/lib/dispatch/capabilityMatcher";

export type DispatchRuleSource = "organization" | "fallback";

export type LoadedDispatchRule = {
  preferredCapabilities: VehicleCapability[];
  source: DispatchRuleSource;
};

export async function loadDispatchRule(
  supabase: any,
  organizationId: string,
  alertType: string | null | undefined,
): Promise<LoadedDispatchRule> {
  const normalizedAlertType = String(alertType || "")
    .trim()
    .toLowerCase();

  const { data, error } = await supabase
    .from("dispatch_rules")
    .select("preferred_capabilities")
    .eq("organization_id", organizationId)
    .eq("alert_type", normalizedAlertType)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn(
      `[Dispatch Copilot] Failed to load dispatch rule for ${normalizedAlertType}:`,
      error.message,
    );
  }

  if (
    data?.preferred_capabilities &&
    Array.isArray(data.preferred_capabilities) &&
    data.preferred_capabilities.length > 0
  ) {
    return {
      preferredCapabilities:
        data.preferred_capabilities as VehicleCapability[],
      source: "organization",
    };
  }

  return {
    preferredCapabilities:
      preferredCapabilitiesForAlert(normalizedAlertType),
    source: "fallback",
  };
}