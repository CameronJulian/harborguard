import { supabase } from "@/lib/supabase";

export function subscribeCommandCenterRealtime(onChange: () => void) {
  const channel = supabase
    .channel(`command-center-events-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_locations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_alerts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_trips" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "route_assignments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_missions" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_timeline_events" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_evidence" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "command_center_notifications" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
