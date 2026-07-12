import { supabase } from "@/lib/supabase";

export function subscribeMissionTracking(
  missionId: string,
  onInsert: (payload: any) => void
) {
  const channel = supabase
    .channel(`mission-tracking-${missionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mission_tracking",
        filter: `mission_id=eq.${missionId}`,
      },
      onInsert
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

