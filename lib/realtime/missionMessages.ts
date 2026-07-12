import { supabase } from "@/lib/supabase";

export function subscribeMissionMessages(
  missionId: string,
  onInsert: (payload: any) => void
) {
  const channel = supabase
    .channel(`mission-messages-${missionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mission_messages",
        filter: `mission_id=eq.${missionId}`,
      },
      onInsert
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

