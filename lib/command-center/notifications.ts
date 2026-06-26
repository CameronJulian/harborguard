type CreateCommandCenterNotificationInput = {
  supabase: any;
  organizationId: string;
  vehicleId?: string | null;
  title: string;
  message: string;
  severity?: "low" | "medium" | "high" | "critical";
  type?: string;
  source?: string;
  metadata?: Record<string, any>;
};

export async function createCommandCenterNotification({
  supabase,
  organizationId,
  vehicleId = null,
  title,
  message,
  severity = "medium",
  type = "system",
  source = "command_center",
  metadata = {},
}: CreateCommandCenterNotificationInput) {
  const { error } = await supabase
    .from("command_center_notifications")
    .insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      title,
      message,
      severity,
      type,
      source,
      metadata,
    });

  if (error) {
    console.error("Command center notification insert failed:", error);
  }

  return { error };
}
