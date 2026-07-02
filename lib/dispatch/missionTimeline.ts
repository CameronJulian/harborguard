export async function createMissionTimelineEvent(
  supabase: any,
  options: {
    organizationId: string;
    missionId: string;
    eventType: string;
    title: string;
    detail?: string | null;
    actorId?: string | null;
    source?: string;
    metadata?: Record<string, any>;
  }
) {
  const { error } = await supabase
    .from("mission_timeline_events")
    .insert({
      organization_id: options.organizationId,
      mission_id: options.missionId,
      event_type: options.eventType,
      title: options.title,
      detail: options.detail || null,
      actor_id: options.actorId || null,
      source: options.source || "system",
      metadata: options.metadata || {},
    });

  if (error) {
    console.error("MISSION TIMELINE EVENT ERROR:", error.message);
  }
}

export function missionStatusTimelineTitle(status: string) {
  const value = String(status || "").toLowerCase();

  if (value === "accepted") return "Driver accepted mission";
  if (value === "en route") return "Driver started journey";
  if (value === "arrived") return "Driver arrived at destination";
  if (value === "in progress") return "Mission work started";
  if (value === "completed") return "Mission completed";
  if (value === "cancelled") return "Mission cancelled";

  return `Mission status changed to ${status}`;
}
