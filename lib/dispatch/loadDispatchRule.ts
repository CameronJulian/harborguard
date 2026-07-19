import {
  preferredCapabilitiesForAlert,
  type VehicleCapability,
} from "@/lib/dispatch/capabilityMatcher";

export async function loadDispatchRule(
  supabase: any,
  organizationId: string,
  alertType: string | null | undefined,
): Promise<VehicleCapability[]> {
  const normalizedAlertType = String(alertType || "")
    .trim()
    .toLowerCase();

  const { data } = await supabase
    .from("dispatch_rules")
    .select("preferred_capabilities")
    .eq("organization_id", organizationId)
    .eq("alert_type", normalizedAlertType)
    .eq("is_active", true)
    .maybeSingle();

  if (
    data?.preferred_capabilities &&
    Array.isArray(data.preferred_capabilities) &&
    data.preferred_capabilities.length > 0
  ) {
    return data.preferred_capabilities as VehicleCapability[];
  }

  return preferredCapabilitiesForAlert(normalizedAlertType);
}