export async function expireRouteSafetyAlerts(
  supabase: any,
  organizationId: string,
  expiredAt = new Date().toISOString()
): Promise<number> {
  const {
    data: expiredAlerts,
    error: expiredAlertsError,
  } = await supabase
    .from("route_safety_alerts")
    .update({
      status: "expired",
    })
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .lt("expires_at", expiredAt)
    .select("id");

  if (expiredAlertsError) {
    throw expiredAlertsError;
  }

  return expiredAlerts?.length || 0;
}
