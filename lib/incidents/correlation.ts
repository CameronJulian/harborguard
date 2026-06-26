type CorrelateIncidentInput = {
  supabase: any;
  organizationId: string;
  alertId: string;
  vehicleId: string;
  alertType: string;
  severity: string;
  message: string;
};

function normalizeSeverity(severity: string) {
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

function highestSeverity(current: string | null, incoming: string) {
  const rank: Record<string, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4,
  };

  return (rank[incoming] || 1) > (rank[current || "Low"] || 1)
    ? incoming
    : current || incoming;
}

export async function correlateVehicleAlertToIncident({
  supabase,
  organizationId,
  alertId,
  vehicleId,
  alertType,
  severity,
  message,
}: CorrelateIncidentInput) {
  const normalizedSeverity = normalizeSeverity(severity);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentAlerts } = await supabase
    .from("vehicle_alerts")
    .select("id, alert_type, severity, message, created_at")
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .eq("is_resolved", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const recentAlertIds = (recentAlerts || []).map((alert: any) => alert.id);

  let existingIncident: any = null;

  if (recentAlertIds.length > 0) {
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .in("vehicle_alert_id", recentAlertIds)
      .in("status", ["Open", "Review", "Flagged"])
      .order("created_at", { ascending: false })
      .limit(1);

    existingIncident = incidents?.[0] || null;
  }

  const uniqueAlertTypes = Array.from(
    new Set((recentAlerts || []).map((alert: any) => alert.alert_type).filter(Boolean))
  );

  const correlationSummary =
    uniqueAlertTypes.length > 1
      ? `Correlated incident involving ${uniqueAlertTypes.join(", ")}. Latest event: ${message}`
      : message;

  if (existingIncident) {
    const updatedSeverity = highestSeverity(existingIncident.severity, normalizedSeverity);

    await supabase
      .from("incidents")
      .update({
        severity: updatedSeverity,
        status: existingIncident.status || "Open",
        summary: correlationSummary,
      })
      .eq("id", existingIncident.id)
      .eq("organization_id", organizationId);

    await supabase.from("emergency_response_events").insert({
      vehicle_alert_id: existingIncident.vehicle_alert_id || alertId,
      event_type: "alert_correlated",
      note: `${alertType} correlated into existing incident. ${message}`,
      created_by: null,
    });

    return {
      incident: {
        ...existingIncident,
        severity: updatedSeverity,
        summary: correlationSummary,
      },
      created: false,
      correlated: true,
      correlatedAlertCount: recentAlertIds.length,
    };
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      incident_code: `INC-${Date.now()}`,
      severity: normalizedSeverity,
      status: "Open",
      summary: correlationSummary,
      assigned_to: null,
      organization_id: organizationId,
      vehicle_alert_id: alertId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("emergency_response_events").insert({
    vehicle_alert_id: alertId,
    event_type: "incident_created",
    note: `Incident created from ${alertType}. ${message}`,
    created_by: null,
  });

  return {
    incident,
    created: true,
    correlated: false,
    correlatedAlertCount: recentAlertIds.length,
  };
}
