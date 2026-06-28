import { supabase } from "@/lib/supabase";

export function subscribeCommandCenterRealtime(onChange: () => void) {
  const channel = supabase
    .channel("command-center-events")
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_locations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_alerts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_trips" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "route_assignments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "command_center_notifications" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

