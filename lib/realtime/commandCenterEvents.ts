import { supabase } from "@/lib/supabase";

const commandCenterTables = [
  "vehicle_locations",
  "vehicle_alerts",
  "incidents",
  "vehicle_trips",
  "route_assignments",
  "dispatch_missions",
  "mission_timeline_events",
  "mission_evidence",
  "mission_messages",
  "command_center_notifications",
];

export function subscribeCommandCenterRealtime(onChange: () => void) {
  return subscribeCommandCenterTables(commandCenterTables, onChange);
}

export function subscribeCommandCenterTables(
  tables: string[],
  onChange: () => void
) {
  const channel = supabase.channel(
    `command-center-events-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  tables.forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      onChange
    );
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
